import { useEffect, useState } from 'react';
import { Group, Select, Slider, Stack, Text, Title } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { listCandidates } from '../../api/endpoints/analyses.js';
import QueryState from '../../components/QueryState.jsx';
import AnalysisTable from '../../components/analysis/AnalysisTable.jsx';
import CandidateTable from '../../components/analysis/CandidateTable.jsx';
import GradeCharts from '../../components/analysis/GradeCharts.jsx';
import RunPanel from '../../components/analysis/RunPanel.jsx';
import { useAnalyses } from '../../hooks/useAnalyses.js';
import { useAnalyzeRun } from '../../hooks/useAnalyzeRun.js';
import { useFetch } from '../../hooks/useFetch.js';
import { t } from '../../l10n.js';

const BUSY_REFETCH_MS = 30_000;

const SINCE_OPTIONS = [
  { value: '', label: t('ai_analysis_since_all') },
  { value: '1', label: t('ai_analysis_since_day') },
  { value: '7', label: t('ai_analysis_since_7') },
  { value: '30', label: t('ai_analysis_since_30') },
];

export default function AiAnalysis() {
  const [windowDays, setWindowDays] = useState(1);
  const [minGrade, setMinGrade] = useState(0);
  const [sinceDays, setSinceDays] = useState('');
  const [picked, setPicked] = useState(() => new Set());
  const run = useAnalyzeRun();
  const { analyses, loaded, loading, error, refetch } = useAnalyses({
    minGrade,
    sinceDays: sinceDays ? Number(sinceDays) : undefined,
  });
  // Debounced: dragging the slider would otherwise send one request per step.
  const [debouncedWindowDays] = useDebouncedValue(windowDays, 300);
  const candidates = useFetch(
    (signal) => listCandidates(debouncedWindowDays, { signal }),
    [debouncedWindowDays],
  );
  const refetchCandidates = candidates.refetch;
  // Only ids still on offer count: a narrower window or a finished run drops some.
  const pickedIds = (candidates.data ?? []).map((c) => c.job_id).filter((id) => picked.has(id));

  const finished = ['done', 'failed'].includes(run.status);
  useEffect(() => {
    if (!finished) return;
    refetch();
    refetchCandidates();
    if (run.status === 'done') {
      notifications.show({ color: 'green', message: t('ai_analysis_finished') });
    }
  }, [finished, run.status, refetch, refetchCandidates]);

  // 409 "already running" (e.g. a run left behind by a reload): the server
  // finishes it on its own, so pick up its results a little later.
  const busy = run.stopReason?.kind === 'busy';
  useEffect(() => {
    if (!busy) return undefined;
    const timerId = setTimeout(() => {
      refetch();
      refetchCandidates();
    }, BUSY_REFETCH_MS);
    return () => clearTimeout(timerId);
  }, [busy, refetch, refetchCandidates]);

  return (
    <Stack maw={1000}>
      <Title order={2}>{t('ai_analysis_title')}</Title>
      <RunPanel run={run} windowDays={windowDays} onWindowDaysChange={setWindowDays}
        due={candidates.data?.length} picked={pickedIds} />
      <QueryState loading={candidates.loading} error={candidates.error} hasData={candidates.data != null}
        onRetry={refetchCandidates} label={t('candidates_query_label')}>
        <CandidateTable candidates={candidates.data ?? []} picked={picked} onPickedChange={setPicked}
          disabled={run.status === 'running'} />
      </QueryState>

      <Group align="flex-end">
        <div style={{ flex: 1, maxWidth: 320 }}>
          <Text size="sm" id="min-grade-label">{t('ai_analysis_min_grade', { grade: minGrade })}</Text>
          <Slider min={0} max={100} value={minGrade} onChange={setMinGrade}
            thumbProps={{ 'aria-labelledby': 'min-grade-label' }} />
        </div>
        <Select label={t('ai_analysis_since_label')} data={SINCE_OPTIONS} value={sinceDays} allowDeselect={false}
          onChange={setSinceDays} w={160} />
      </Group>

      <QueryState loading={loading} error={error} hasData={loaded} onRetry={refetch} label={t('ai_analysis_query_label')}>
        <GradeCharts analyses={analyses} />
        <AnalysisTable analyses={analyses} />
      </QueryState>
    </Stack>
  );
}

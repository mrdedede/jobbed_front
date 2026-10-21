import { useEffect, useState } from 'react';
import { Group, Select, Slider, Stack, Text, Title } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { getDueCount } from '../../api/endpoints/analyses.js';
import QueryState from '../../components/QueryState.jsx';
import AnalysisTable from '../../components/analysis/AnalysisTable.jsx';
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
  const run = useAnalyzeRun();
  const { analyses, loaded, loading, error, refetch } = useAnalyses({
    minGrade,
    sinceDays: sinceDays ? Number(sinceDays) : undefined,
  });
  // Debounced: dragging the slider would otherwise send one request per step.
  const [debouncedWindowDays] = useDebouncedValue(windowDays, 300);
  const { data: due, error: dueError, refetch: refetchDue } = useFetch(
    (signal) => getDueCount(debouncedWindowDays, { signal }),
    [debouncedWindowDays],
  );

  const finished = ['done', 'stopped', 'failed'].includes(run.status);
  useEffect(() => {
    if (!finished) return;
    refetch();
    refetchDue();
    if (run.status === 'done') {
      notifications.show({ color: 'green', message: t('ai_analysis_finished') });
    }
  }, [finished, run.status, refetch, refetchDue]);

  // 409 "already running" (e.g. a run left behind by a reload): the server
  // finishes it on its own, so pick up its results a little later.
  const busy = run.stopReason?.kind === 'busy';
  useEffect(() => {
    if (!busy) return undefined;
    const timerId = setTimeout(() => {
      refetch();
      refetchDue();
    }, BUSY_REFETCH_MS);
    return () => clearTimeout(timerId);
  }, [busy, refetch, refetchDue]);

  return (
    <Stack maw={1000}>
      <Title order={2}>{t('ai_analysis_title')}</Title>
      <RunPanel run={run} windowDays={windowDays} onWindowDaysChange={setWindowDays} due={due?.due} />
      {dueError && (
        <Text c="red" size="sm" role="alert">
          {t('ai_analysis_due_error', { error: dueError.detail ?? dueError.message })}
        </Text>
      )}

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

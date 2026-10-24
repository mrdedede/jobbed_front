import { useEffect, useState } from 'react';
import { Group, Select, Slider, Stack, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import Pager from '../../components/Pager.jsx';
import QueryState from '../../components/QueryState.jsx';
import AnalysisTable from '../../components/analysis/AnalysisTable.jsx';
import CandidateTable from '../../components/analysis/CandidateTable.jsx';
import GradeCharts from '../../components/analysis/GradeCharts.jsx';
import RunPanel from '../../components/analysis/RunPanel.jsx';
import { useAnalyses } from '../../hooks/useAnalyses.js';
import { useAnalyzeRun } from '../../hooks/useAnalyzeRun.js';
import { useCandidates } from '../../hooks/useCandidates.js';
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
  const [analysisPage, setAnalysisPage] = useState(1);
  const run = useAnalyzeRun();
  const { analyses, total, stats, loaded, loading, error, refetch } = useAnalyses({
    minGrade,
    sinceDays: sinceDays ? Number(sinceDays) : undefined,
    page: analysisPage,
  });
  // One list growing as it is scrolled: every pick stays loaded.
  const candidates = useCandidates(windowDays);
  const { refresh: refreshCandidates, drop: dropCandidates } = candidates;
  // Only ids still on offer count, in list order: a run drops the graded ones.
  const pickedIds = candidates.items.map((c) => c.job_id).filter((id) => picked.has(id));

  const changeWindowDays = (days) => {
    setWindowDays(days);
    setPicked(new Set());
  };
  const changeMinGrade = (grade) => {
    setMinGrade(grade);
    setAnalysisPage(1);
  };
  const changeSinceDays = (days) => {
    setSinceDays(days);
    setAnalysisPage(1);
  };

  const finished = ['done', 'failed'].includes(run.status);
  useEffect(() => {
    if (!finished) return;
    refetch();
    // Graded rows leave the list in place, so the scroll position and the
    // remaining picks are kept.
    dropCandidates(run.results.map((r) => r.job_id));
    if (run.status === 'done') {
      notifications.show({ color: 'green', message: t('ai_analysis_finished') });
    }
  }, [finished, run.status, run.results, refetch, dropCandidates]);

  // 409 "already running" (e.g. a run left behind by a reload): the server
  // finishes it on its own, so pick up its results a little later.
  const busy = run.stopReason?.kind === 'busy';
  useEffect(() => {
    if (!busy) return undefined;
    const timerId = setTimeout(() => {
      refetch();
      refreshCandidates();
    }, BUSY_REFETCH_MS);
    return () => clearTimeout(timerId);
  }, [busy, refetch, refreshCandidates]);

  return (
    <Stack maw={1000}>
      <Title order={2}>{t('ai_analysis_title')}</Title>
      <RunPanel run={run} windowDays={windowDays} onWindowDaysChange={changeWindowDays}
        due={candidates.total} picked={pickedIds} />
      <QueryState loading={candidates.loading} error={candidates.error} hasData={candidates.loaded}
        onRetry={refreshCandidates} label={t('candidates_query_label')}>
        <CandidateTable candidates={candidates.items} total={candidates.total} loading={candidates.loading}
          onLoadMore={candidates.loadMore} picked={picked} onPickedChange={setPicked}
          disabled={run.status === 'running'} />
      </QueryState>

      <Group align="flex-end">
        <div style={{ flex: 1, maxWidth: 320 }}>
          <Text size="sm" id="min-grade-label">{t('ai_analysis_min_grade', { grade: minGrade })}</Text>
          <Slider min={0} max={100} value={minGrade} onChange={changeMinGrade}
            thumbProps={{ 'aria-labelledby': 'min-grade-label' }} />
        </div>
        <Select label={t('ai_analysis_since_label')} data={SINCE_OPTIONS} value={sinceDays} allowDeselect={false}
          onChange={changeSinceDays} w={160} />
      </Group>

      <QueryState loading={loading} error={error} hasData={loaded} onRetry={refetch} label={t('ai_analysis_query_label')}>
        {stats && <GradeCharts stats={stats} />}
        <AnalysisTable analyses={analyses} />
        <Pager total={total} page={analysisPage} onChange={setAnalysisPage} />
      </QueryState>
    </Stack>
  );
}

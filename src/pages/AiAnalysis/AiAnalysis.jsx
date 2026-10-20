import { useEffect, useState } from 'react';
import { Group, Loader, Select, Slider, Stack, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { getDueCount } from '../../api/endpoints/analyses.js';
import AnalysisTable from '../../components/analysis/AnalysisTable.jsx';
import GradeCharts from '../../components/analysis/GradeCharts.jsx';
import RunPanel from '../../components/analysis/RunPanel.jsx';
import { useAnalyses } from '../../hooks/useAnalyses.js';
import { useAnalyzeRun } from '../../hooks/useAnalyzeRun.js';
import { useFetch } from '../../hooks/useFetch.js';

const SINCE_OPTIONS = [
  { value: '', label: 'All time' },
  { value: '1', label: 'Last day' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
];

export default function AiAnalysis() {
  const [windowDays, setWindowDays] = useState(1);
  const [minGrade, setMinGrade] = useState(0);
  const [sinceDays, setSinceDays] = useState('');
  const run = useAnalyzeRun();
  const { analyses, loading, error, refetch } = useAnalyses({
    minGrade,
    sinceDays: sinceDays ? Number(sinceDays) : undefined,
  });
  const { data: due, refetch: refetchDue } = useFetch(
    (signal) => getDueCount(windowDays, { signal }),
    [windowDays],
  );

  const finished = ['done', 'stopped', 'failed'].includes(run.status);
  useEffect(() => {
    if (!finished) return;
    refetch();
    refetchDue();
    if (run.status === 'done') {
      notifications.show({ color: 'green', message: 'Analysis finished' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.status]);

  return (
    <Stack maw={1000}>
      <Title order={2}>AI analysis</Title>
      <RunPanel run={run} windowDays={windowDays} onWindowDaysChange={setWindowDays} due={due?.due} />

      <Group align="flex-end">
        <div style={{ flex: 1, maxWidth: 320 }}>
          <Text size="sm">Minimum grade: {minGrade}</Text>
          <Slider min={0} max={100} value={minGrade} onChange={setMinGrade} />
        </div>
        <Select label="Analysed" data={SINCE_OPTIONS} value={sinceDays} allowDeselect={false}
          onChange={setSinceDays} w={160} />
      </Group>

      {error && <Text c="red">Failed to load analyses: {error.detail ?? error.message}</Text>}
      {loading && analyses.length === 0 ? <Loader /> : (
        <>
          <GradeCharts analyses={analyses} />
          <AnalysisTable analyses={analyses} />
        </>
      )}
    </Stack>
  );
}

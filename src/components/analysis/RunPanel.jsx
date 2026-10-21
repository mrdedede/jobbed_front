import { useState } from 'react';
import { Button, Group, NumberInput, Paper, Progress, Select, Slider, Stack, Text, Title } from '@mantine/core';
import StopAlert from '../StopAlert.jsx';

const MODELS = ['haiku', 'sonnet'];

/**
 * Controls and progress for a grading run.
 *
 * @param {{run: ReturnType<typeof import('../../hooks/useAnalyzeRun.js').useAnalyzeRun>,
 *     windowDays: number, onWindowDaysChange: function(number): void,
 *     due: ?number}} props
 */
export default function RunPanel({ run, windowDays, onWindowDaysChange, due }) {
  const [limit, setLimit] = useState(20);
  const [model, setModel] = useState('haiku');
  const { status, progress, stopReason } = run;
  const active = status === 'running' || status === 'stopping';

  const total = progress.analysed + progress.failed + (progress.remaining ?? 0);
  const percent = total > 0 ? ((progress.analysed + progress.failed) / total) * 100 : 0;

  return (
    <Paper withBorder p="md">
      <Stack>
        <Title order={4}>Run analysis</Title>
        <div>
          <Text size="sm">Postings scraped in the last {windowDays} day{windowDays > 1 ? 's' : ''}
            {due != null && ` (${due} waiting to be graded)`}</Text>
          <Slider min={1} max={30} value={windowDays} onChange={onWindowDaysChange} disabled={active} />
        </div>
        <Group>
          <NumberInput label="Batch size" min={1} max={50} value={limit} w={120} disabled={active}
            onChange={(value) => setLimit(Number(value) || 1)} />
          <Select label="Model" data={MODELS} value={model} w={140} allowDeselect={false}
            disabled={active} onChange={setModel} />
        </Group>

        <Group>
          {active
            ? <Button color="red" variant="light" loading={status === 'stopping'}
                loaderProps={{ type: 'dots' }} onClick={run.stop}>
                {status === 'stopping' ? 'Stopping after this batch' : 'Stop'}
              </Button>
            : <Button onClick={() => run.start({ limit, windowDays, model })}>Start</Button>}
        </Group>

        {status !== 'idle' && (
          <Stack gap={4}>
            <Progress value={status === 'done' ? 100 : percent} animated={active} />
            <Text size="sm" c="dimmed">
              {progress.analysed} graded, {progress.failed} failed
              {progress.remaining != null && `, ${progress.remaining} remaining`}
              {status === 'done' && ' - done'}
              {status === 'stopped' && ' - stopped'}
            </Text>
          </Stack>
        )}
        {stopReason && <StopAlert reason={stopReason} />}
      </Stack>
    </Paper>
  );
}

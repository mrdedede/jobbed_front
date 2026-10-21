import { useState } from 'react';
import { Button, Group, NumberInput, Paper, Progress, Select, Slider, Stack, Text, Title } from '@mantine/core';
import StopAlert from '../StopAlert.jsx';
import { t } from '../../l10n.js';

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
        <Title order={4}>{t('run_title')}</Title>
        <div>
          <Text size="sm" id="window-days-label">
            {t(windowDays > 1 ? 'run_window_other' : 'run_window_one', { days: windowDays })}
            {due != null && t('run_window_due', { due })}</Text>
          <Slider min={1} max={30} value={windowDays} onChange={onWindowDaysChange} disabled={active}
            thumbProps={{ 'aria-labelledby': 'window-days-label' }} />
        </div>
        <Group>
          <NumberInput label={t('run_batch_size')} min={1} max={50} value={limit} w={120} disabled={active}
            onChange={(value) => setLimit(Number(value) || 1)} />
          <Select label={t('run_model')} data={MODELS} value={model} w={140} allowDeselect={false}
            disabled={active} onChange={setModel} />
        </Group>

        <Group>
          {active
            ? <Button color="red" variant="light" loading={status === 'stopping'}
                loaderProps={{ type: 'dots' }} onClick={run.stop}>
                {status === 'stopping' ? t('run_stopping') : t('run_stop')}
              </Button>
            : <Button onClick={() => run.start({ limit, windowDays, model })}>{t('run_start')}</Button>}
        </Group>

        {status !== 'idle' && (
          <Stack gap={4}>
            <Progress value={status === 'done' ? 100 : percent} animated={active} />
            <Text size="sm" c="dimmed">
              {t('run_progress', { graded: progress.analysed, failed: progress.failed })}
              {progress.remaining != null && t('run_progress_remaining', { remaining: progress.remaining })}
              {status === 'done' && t('run_progress_done')}
              {status === 'stopped' && t('run_progress_stopped')}
            </Text>
          </Stack>
        )}
        {stopReason && <StopAlert reason={stopReason} />}
      </Stack>
    </Paper>
  );
}

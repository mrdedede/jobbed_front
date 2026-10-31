import { useState } from 'react';
import { Button, Group, Paper, Progress, Select, Slider, Stack, Text, Title } from '@mantine/core';
import InfoTip from '../InfoTip.jsx';
import StopAlert from '../StopAlert.jsx';
import { t } from '../../l10n.js';

const MODELS = ['haiku', 'sonnet'];

/** The API takes at most this many job ids per request. */
export const MAX_PICKED = 50;

/**
 * Controls and outcome for grading the picked postings.
 *
 * @param {{run: ReturnType<typeof import('../../hooks/useAnalyzeRun.js').useAnalyzeRun>,
 *     windowDays: number, onWindowDaysChange: function(number): void,
 *     due: ?number, picked: string[]}} props
 */
export default function RunPanel({ run, windowDays, onWindowDaysChange, due, picked }) {
  const [model, setModel] = useState('haiku');
  const { status, progress, stopReason } = run;
  const active = status === 'running';
  const tooMany = picked.length > MAX_PICKED;

  return (
    <Paper withBorder p="md">
      <Stack>
        <Title order={4}>{t('run_title')}</Title>
        <div>
          <Group gap={4} wrap="nowrap">
            <Text size="sm" id="window-days-label">
              {t(windowDays > 1 ? 'run_window_other' : 'run_window_one', { days: windowDays })}
              {due != null && t('run_window_due', { due })}</Text>
            <InfoTip label={t('run_title')}>{t('help_window')}</InfoTip>
          </Group>
          <Slider min={1} max={30} value={windowDays} onChange={onWindowDaysChange} disabled={active}
            thumbProps={{ 'aria-labelledby': 'window-days-label' }} />
        </div>
        <Group align="flex-end">
          {/* Beside the select, not in its label: a button inside a <label> is invalid. */}
          <Group gap={4} align="flex-end" wrap="nowrap">
            <Select label={t('run_model')} data={MODELS} value={model} w={140} allowDeselect={false}
              disabled={active} onChange={setModel} />
            <InfoTip label={t('run_model')}>{t('help_model')}</InfoTip>
          </Group>
          <Button loading={active} disabled={picked.length === 0 || tooMany}
            onClick={() => run.start({ jobIds: picked, model })}>
            {t('run_start_picked', { count: picked.length })}
          </Button>
        </Group>
        {tooMany && <Text size="sm" c="red">{t('run_too_many', { max: MAX_PICKED })}</Text>}

        {active && (
          <Stack gap={4}>
            {/* Striped until the first poll says how many there are. */}
            <Progress value={progress.total > 0 ? (100 * progress.done) / progress.total : 100}
              striped animated={progress.total === 0} aria-label={t('run_title')} />
            {progress.total > 0 && (
              <Text size="sm" c="dimmed" aria-live="polite">
                {t('run_grading', { done: progress.done, total: progress.total })}
              </Text>
            )}
          </Stack>
        )}
        {status === 'done' && (
          <Text size="sm" c="dimmed">
            {t('run_progress', { graded: progress.analysed, failed: progress.failed })}
            {progress.skipped > 0 && t('run_progress_skipped', { skipped: progress.skipped })}
          </Text>
        )}
        {stopReason && <StopAlert reason={stopReason} />}
      </Stack>
    </Paper>
  );
}

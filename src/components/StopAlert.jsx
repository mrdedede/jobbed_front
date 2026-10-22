import { Alert, Anchor } from '@mantine/core';
import { Link } from 'react-router-dom';
import { t } from '../l10n.js';

/**
 * "1h 5m" / "5m" for a wait in seconds, rounded up to the minute.
 *
 * @param {number} seconds
 * @return {string}
 */
function formatDuration(seconds) {
  const totalMinutes = Math.ceil(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? t('stop_duration_hours', { hours, minutes }) : t('stop_duration_minutes', { minutes });
}

/**
 * Why a run or a generation stopped, from `toStopReason`.
 *
 * @param {{reason: {kind: string, message: string, retryAfter: ?number}}} props
 */
export default function StopAlert({ reason }) {
  if (reason.kind === 'no-cv') {
    return (
      <Alert color="yellow" role="alert">
        {reason.message} <Anchor component={Link} to="/cvs">{t('stop_go_to_cvs')}</Anchor>
      </Alert>
    );
  }
  const suffix = reason.kind === 'quota' && reason.retryAfter != null
    ? t('stop_resets_in', { duration: formatDuration(reason.retryAfter) })
    : '';
  const color = ['busy', 'no-analysis', 'interrupted'].includes(reason.kind) ? 'yellow' : 'red';
  return <Alert color={color} role="alert">{reason.message}{suffix}</Alert>;
}

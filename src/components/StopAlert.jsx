import { Alert, Anchor } from '@mantine/core';
import { Link } from 'react-router-dom';

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
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
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
        {reason.message} <Anchor component={Link} to="/cvs">Go to your CVs</Anchor>
      </Alert>
    );
  }
  const suffix = reason.kind === 'quota' && reason.retryAfter != null
    ? ` Resets in ${formatDuration(reason.retryAfter)}.`
    : '';
  const color = ['busy', 'no-analysis', 'interrupted'].includes(reason.kind) ? 'yellow' : 'red';
  return <Alert color={color} role="alert">{reason.message}{suffix}</Alert>;
}

import { useEffect, useState } from 'react';
import { useCallbackRef } from '@mantine/hooks';

/** Consecutive transient failures (network, timeout, 5xx) tolerated before giving up. */
const MAX_TRANSIENT_FAILURES = 3;

const isTransient = (error) => error?.status === 0 || error?.status >= 500;

/**
 * Calls `poll` repeatedly until `isDone` says to stop, `enabled` turns false,
 * a poll fails for good, or the component unmounts. The next call is
 * scheduled only after the previous one finished, so requests never overlap.
 * Transient failures are retried with backoff, up to 3 in a row.
 *
 * Polling (re)starts, and the previous result is cleared, each time `enabled`
 * flips to true or `key` or `interval` change. Results from an earlier `key`
 * are never returned, not even for the render before the effect restarts.
 *
 * Example:
 *   const { data } = usePolling(
 *       (signal) => getDueCount(1, { signal }),
 *       { interval: 5000, isDone: (result) => result.due === 0 });
 *
 * @param {function(AbortSignal): Promise<*>} poll Fetches the current state.
 * @param {Object=} options
 * @param {number=} options.interval Delay between polls, in milliseconds.
 *     Defaults to 2000.
 * @param {boolean=} options.enabled Set to false to pause. Defaults to true.
 * @param {*=} options.key Identifies what is polled (e.g. a job id).
 * @param {function(*): boolean=} options.isDone Receives each result; return
 *     true to stop polling. Defaults to never stopping.
 * @return {{data: *, error: ?ApiError, polling: boolean}} The latest result,
 *     the error that stopped polling, and whether polling is active.
 */
export function usePolling(
  poll,
  { interval = 2000, enabled = true, key, isDone = () => false } = {},
) {
  const latestPoll = useCallbackRef(poll);
  const latestIsDone = useCallbackRef(isDone);
  const [state, setState] = useState({ key, data: null, error: null, polling: false });

  useEffect(() => {
    if (!enabled) return undefined;

    const controller = new AbortController();
    let timerId;
    let failures = 0;
    // oxlint-disable-next-line react/set-state-in-effect -- resets for the new key
    setState({ key, data: null, error: null, polling: true });

    const tick = async () => {
      try {
        const data = await latestPoll(controller.signal);
        if (controller.signal.aborted) return;
        failures = 0;
        if (latestIsDone(data)) {
          setState({ key, data, error: null, polling: false });
          return;
        }
        setState({ key, data, error: null, polling: true });
        timerId = setTimeout(tick, interval);
      } catch (error) {
        if (controller.signal.aborted) return;
        failures += 1;
        if (isTransient(error) && failures <= MAX_TRANSIENT_FAILURES) {
          timerId = setTimeout(tick, interval * 2 ** failures);
          return;
        }
        setState((previous) => ({ ...previous, error, polling: false }));
      }
    };
    tick();

    return () => {
      controller.abort();
      clearTimeout(timerId);
    };
  }, [enabled, interval, key, latestPoll, latestIsDone]);

  if (state.key !== key) return { data: null, error: null, polling: enabled };
  return { data: state.data, error: state.error, polling: state.polling };
}

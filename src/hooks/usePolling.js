import { useEffect, useState } from 'react';
import { useCallbackRef } from '@mantine/hooks';

/**
 * Calls `poll` repeatedly until `isDone` says to stop, `enabled` turns false,
 * a poll fails, or the component unmounts. The next call is scheduled only
 * after the previous one finished, so requests never overlap.
 *
 * Polling (re)starts, and the previous result is cleared, each time `enabled`
 * flips to true or `interval` changes.
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
 * @param {function(*): boolean=} options.isDone Receives each result; return
 *     true to stop polling. Defaults to never stopping.
 * @return {{data: *, error: ?ApiError, polling: boolean}} The latest result,
 *     the error that stopped polling, and whether polling is active.
 */
export function usePolling(
  poll,
  { interval = 2000, enabled = true, isDone = () => false } = {},
) {
  const latestPoll = useCallbackRef(poll);
  const latestIsDone = useCallbackRef(isDone);
  const [state, setState] = useState({ data: null, error: null, polling: false });

  useEffect(() => {
    if (!enabled) return undefined;

    const controller = new AbortController();
    let timerId;
    setState({ data: null, error: null, polling: true });

    const tick = async () => {
      try {
        const data = await latestPoll(controller.signal);
        if (controller.signal.aborted) return;
        if (latestIsDone(data)) {
          setState({ data, error: null, polling: false });
          return;
        }
        setState({ data, error: null, polling: true });
        timerId = setTimeout(tick, interval);
      } catch (error) {
        if (controller.signal.aborted) return;
        setState((previous) => ({ ...previous, error, polling: false }));
      }
    };
    tick();

    return () => {
      controller.abort();
      clearTimeout(timerId);
    };
  }, [enabled, interval, latestPoll, latestIsDone]);

  return state;
}

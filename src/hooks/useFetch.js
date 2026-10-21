import { useCallback, useEffect, useState } from 'react';
import { useCallbackRef } from '@mantine/hooks';

/**
 * Loads data when the component mounts and whenever `deps` change.
 * In-flight requests are aborted on unmount, on dependency change and on refetch.
 *
 * Example:
 *   const { data, loading, error, refetch } =
 *       useFetch((signal) => listKeywords({ signal }));
 *
 * @param {function(AbortSignal): Promise<*>} fetcher Calls an endpoint function,
 *     passing the signal through.
 * @param {Array=} deps Values that trigger a new fetch when they change.
 * @return {{data: *, loading: boolean, error: ?ApiError, refetch: function(): void}}
 *     `data` keeps its previous value while a refetch is running.
 */
export function useFetch(fetcher, deps = []) {
  const latestFetcher = useCallbackRef(fetcher);
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [refetchCount, setRefetchCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    // oxlint-disable-next-line react/set-state-in-effect -- marks the new request as loading
    setState((previous) => ({ ...previous, error: null, loading: true }));
    latestFetcher(controller.signal)
      .then((data) => {
        // A response that lands after deps changed belongs to the old request.
        if (!controller.signal.aborted) setState({ data, error: null, loading: false });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setState((previous) => ({ ...previous, error, loading: false }));
      });
    return () => controller.abort();
    // `deps` is the caller's list, spread on purpose (like useEffect's own).
  }, [...deps, refetchCount]); // oxlint-disable-line react/exhaustive-deps

  const refetch = useCallback(() => setRefetchCount((count) => count + 1), []);
  return { ...state, refetch };
}

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
    setState((previous) => ({ ...previous, error: null, loading: true }));
    latestFetcher(controller.signal)
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error) => {
        if (controller.signal.aborted) return;
        setState((previous) => ({ ...previous, error, loading: false }));
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, refetchCount]);

  const refetch = useCallback(() => setRefetchCount((count) => count + 1), []);
  return { ...state, refetch };
}

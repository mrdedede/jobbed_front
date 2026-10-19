import { useCallback, useState } from 'react';
import { useCallbackRef } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';

/**
 * Wraps a write call (create, update, delete, login...) with loading and
 * error state, and shows a Mantine notification when it fails.
 *
 * Example:
 *   const { run: addKeyword, loading } = useMutation(createKeyword);
 *   const created = await addKeyword('python');
 *   if (created) refetch();
 *
 * @param {function(...*): Promise<*>} mutator Endpoint function.
 * @return {{run: function(...*): Promise<*>, loading: boolean, error: ?ApiError}}
 *     `run` forwards its arguments to `mutator` and resolves with the result,
 *     or with undefined if the call failed (the error is not rethrown).
 */
export function useMutation(mutator) {
  const latestMutator = useCallbackRef(mutator);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);
      try {
        return await latestMutator(...args);
      } catch (caughtError) {
        setError(caughtError);
        notifications.show({
          color: 'red',
          title: 'Request failed',
          message: caughtError.detail ?? caughtError.message,
        });
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    [latestMutator],
  );

  return { run, loading, error };
}

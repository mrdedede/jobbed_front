import { Button, Group, Loader, Text } from '@mantine/core';

/**
 * Loading / error / empty states for data from `useFetch`, the same on every
 * page. Data already on screen stays there during a refetch.
 *
 * Example:
 *   <QueryState loading={loading} error={error} hasData={data !== null}
 *       empty={cvs.length === 0 && 'No CVs yet.'} onRetry={refetch}>
 *     <CvList cvs={cvs} />
 *   </QueryState>
 *
 * @param {{loading: boolean, error: ?ApiError, hasData: boolean,
 *     empty?: (string|false), onRetry?: function(): void, label?: string,
 *     children: import('react').ReactNode}} props `empty` is shown instead of
 *     the children when set; `label` names what is loading, for screen readers.
 */
export default function QueryState({
  loading, error, hasData, empty = false, onRetry, label = 'data', children,
}) {
  if (!hasData && loading) return <Loader size="sm" aria-label={`Loading ${label}`} />;
  if (!hasData && error) {
    return (
      <Group gap="xs" role="alert">
        <Text c="red" size="sm">Failed to load {label}: {error.detail ?? error.message}</Text>
        {onRetry && <Button size="xs" variant="light" color="red" onClick={onRetry}>Retry</Button>}
      </Group>
    );
  }
  return (
    <>
      {hasData && error && (
        <Text c="red" size="sm" role="alert">Could not refresh {label}: {error.detail ?? error.message}</Text>
      )}
      {empty ? <Text c="dimmed">{empty}</Text> : children}
    </>
  );
}

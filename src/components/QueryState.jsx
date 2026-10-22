import { Button, Group, Loader, Text } from '@mantine/core';
import { t } from '../l10n.js';

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
  loading, error, hasData, empty = false, onRetry, label = t('query_default_label'), children,
}) {
  if (!hasData && loading) return <Loader size="sm" aria-label={t('query_loading', { label })} />;
  if (!hasData && error) {
    return (
      <Group gap="xs" role="alert">
        <Text c="red" size="sm">{t('query_failed_to_load', { label, error: error.detail ?? error.message })}</Text>
        {onRetry && <Button size="xs" variant="light" color="red" onClick={onRetry}>{t('common_retry')}</Button>}
      </Group>
    );
  }
  return (
    <>
      {hasData && error && (
        <Text c="red" size="sm" role="alert">{t('query_could_not_refresh', { label, error: error.detail ?? error.message })}</Text>
      )}
      {empty ? <Text c="dimmed">{empty}</Text> : children}
    </>
  );
}

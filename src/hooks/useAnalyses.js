import { useCallback } from 'react';
import { useDebouncedValue } from '@mantine/hooks';
import { getAnalysisStats, listAnalyses } from '../api/endpoints/analyses.js';
import { pageQuery } from '../api/paging.js';
import { useFetch } from './useFetch.js';

/**
 * One page of stored analyses plus their server-side stats, refetched when a
 * filter changes. `minGrade` is debounced so dragging a slider does not send a
 * request per tick. Stats ignore `page`: they cover every matching analysis.
 *
 * @param {{minGrade?: number, sinceDays?: number, page?: number}=} filters
 *     `page` is 1-based.
 * @return {{analyses: Analysis[], total: ?number, stats: ?AnalysisStats,
 *     loaded: boolean, loading: boolean, error: ?ApiError, refetch: function(): void}}
 */
export function useAnalyses({ minGrade = 0, sinceDays, page = 1 } = {}) {
  const [debouncedMinGrade] = useDebouncedValue(minGrade, 300);
  const filters = { minGrade: debouncedMinGrade, sinceDays };
  const { data, loading, error, refetch } = useFetch(
    (signal) => listAnalyses({ ...filters, ...pageQuery(page) }, { signal }),
    [debouncedMinGrade, sinceDays, page],
  );
  const stats = useFetch(
    (signal) => getAnalysisStats(filters, { signal }),
    [debouncedMinGrade, sinceDays],
  );
  const refetchStats = stats.refetch;
  const refetchBoth = useCallback(() => {
    refetch();
    refetchStats();
  }, [refetch, refetchStats]);
  return {
    analyses: data?.items ?? [],
    total: data?.total ?? null,
    stats: stats.data,
    loaded: data !== null,
    loading,
    error,
    refetch: refetchBoth,
  };
}

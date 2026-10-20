import { useDebouncedValue } from '@mantine/hooks';
import { listAnalyses } from '../api/endpoints/analyses.js';
import { useFetch } from './useFetch.js';

/**
 * Stored analyses, refetched when a filter changes. `minGrade` is debounced so
 * dragging a slider does not send a request per tick.
 *
 * @param {{minGrade?: number, sinceDays?: number, limit?: number}=} filters
 * @return {{analyses: Analysis[], loading: boolean, error: ?ApiError,
 *     refetch: function(): void}}
 */
export function useAnalyses({ minGrade = 0, sinceDays, limit = 200 } = {}) {
  const [debouncedMinGrade] = useDebouncedValue(minGrade, 300);
  const { data, loading, error, refetch } = useFetch(
    (signal) => listAnalyses({ limit, minGrade: debouncedMinGrade, sinceDays }, { signal }),
    [debouncedMinGrade, sinceDays, limit],
  );
  return { analyses: data ?? [], loading, error, refetch };
}

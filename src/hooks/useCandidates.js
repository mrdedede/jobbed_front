import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebouncedValue } from '@mantine/hooks';
import { listCandidates } from '../api/endpoints/analyses.js';
import { PAGE_SIZE } from '../api/paging.js';

/** The API's largest page: how much a refresh can reload in one call. */
const MAX_LIMIT = 100;

/**
 * Ungraded postings as one list that grows batch by batch (infinite scroll),
 * so rows picked earlier stay on screen. `windowDays` is debounced so dragging
 * a slider does not send a request per tick; changing it starts a new list.
 *
 * @param {number} windowDays 1-30.
 * @return {{items: Candidate[], total: ?number, loaded: boolean, loading: boolean,
 *     error: ?ApiError, loadMore: function(): void, refresh: function(): void,
 *     drop: function(string[]): void}} `loadMore` appends the next batch,
 *     `refresh` reloads what is loaded (up to 100 rows), `drop` removes rows
 *     known to be gone (graded) without a request.
 */
export function useCandidates(windowDays) {
  const [debouncedWindowDays] = useDebouncedValue(windowDays, 300);
  const [state, setState] = useState({ items: [], total: null, loading: true, error: null });
  const [reloads, setReloads] = useState(0);
  const controller = useRef(null);
  // Read by `fetchBatch` for the refresh size, without making it a dependency.
  const loadedCount = useRef(0);
  useEffect(() => {
    loadedCount.current = state.items.length;
  }, [state.items.length]);

  /** Fetch rows from `offset`: a reset (offset 0) replaces the list, else appends. */
  const fetchBatch = useCallback(async (offset, limit) => {
    controller.current?.abort();
    const current = controller.current = new AbortController();
    setState((previous) => ({ ...previous, loading: true, error: null }));
    try {
      const batch = await listCandidates(debouncedWindowDays, { limit, offset }, { signal: current.signal });
      if (current.signal.aborted) return;
      setState((previous) => {
        const kept = offset === 0 ? [] : previous.items;
        // New postings land at the top and shift offsets: skip rows already here.
        const seen = new Set(kept.map((c) => c.job_id));
        return {
          items: [...kept, ...batch.items.filter((c) => !seen.has(c.job_id))],
          total: batch.total,
          loading: false,
          error: null,
        };
      });
    } catch (error) {
      if (!current.signal.aborted) setState((previous) => ({ ...previous, loading: false, error }));
    }
  }, [debouncedWindowDays]);

  const lastWindow = useRef(debouncedWindowDays);
  useEffect(() => {
    // A new window is a new list: one batch. A refresh reloads what is loaded.
    // ponytail: at most 100 rows; rows (and picks) loaded past that drop
    // until scrolled to again.
    const sameList = lastWindow.current === debouncedWindowDays;
    lastWindow.current = debouncedWindowDays;
    const limit = sameList ? Math.min(Math.max(loadedCount.current, PAGE_SIZE), MAX_LIMIT) : PAGE_SIZE;
    // oxlint-disable-next-line react/set-state-in-effect -- marks the new request as loading
    fetchBatch(0, limit);
    return () => controller.current?.abort();
  }, [debouncedWindowDays, fetchBatch, reloads]);

  const { items, total, loading } = state;
  const loadMore = useCallback(() => {
    if (!loading && total != null && items.length < total) fetchBatch(items.length, PAGE_SIZE);
  }, [loading, total, items.length, fetchBatch]);

  const refresh = useCallback(() => setReloads((count) => count + 1), []);

  const drop = useCallback((jobIds) => {
    const gone = new Set(jobIds);
    setState((previous) => {
      const items = previous.items.filter((c) => !gone.has(c.job_id));
      const removed = previous.items.length - items.length;
      return { ...previous, items, total: previous.total == null ? null : previous.total - removed };
    });
  }, []);

  return { ...state, loaded: state.total !== null, loadMore, refresh, drop };
}

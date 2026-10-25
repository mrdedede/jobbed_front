import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useCandidates } from './useCandidates.js';
import { json, mockFetch, page } from '../test/utils.jsx';

const rows = (n) => Array.from({ length: n }, (_, i) => ({ job_id: `j${i}` }));

describe('useCandidates', () => {
  it('drops the old window\'s rows, so a failed load cannot page into the new one', async () => {
    const fetchMock = mockFetch({
      'GET /v1/me/analyses/candidates?window_days=1&limit=20&offset=0': page(rows(20), 57),
      'GET /v1/me/analyses/candidates?window_days=2&limit=20&offset=0': json({ detail: 'timeout' }, 504),
    });
    const { result, rerender } = renderHook(({ days }) => useCandidates(days), { initialProps: { days: 1 } });
    await waitFor(() => expect(result.current.items).toHaveLength(20));

    rerender({ days: 2 });
    await waitFor(() => expect(result.current.error?.status).toBe(504));
    act(() => result.current.loadMore());

    expect(result.current.items).toEqual([]);
    expect(result.current.total).toBeNull();
    expect(fetchMock.mock.calls.map(([url]) => url).filter((url) => url.includes('offset=20'))).toEqual([]);
  });
});

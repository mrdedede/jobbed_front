import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client.js';
import { useAsyncJob } from './useAsyncJob.js';
import { useFetch } from './useFetch.js';
import { usePolling } from './usePolling.js';

const transient = () => new ApiError({ status: 0, detail: 'Network error' });

describe('usePolling', () => {
  it('stops once isDone says so', async () => {
    const poll = vi.fn()
      .mockResolvedValueOnce({ status: 'running' })
      .mockResolvedValueOnce({ status: 'done' });

    const { result } = renderHook(() => usePolling(poll, {
      interval: 5, isDone: (r) => r.status === 'done',
    }));

    await waitFor(() => expect(result.current.polling).toBe(false));
    expect(result.current.data).toEqual({ status: 'done' });
    expect(poll).toHaveBeenCalledTimes(2);
  });

  it('retries a transient failure instead of giving up', async () => {
    const poll = vi.fn()
      .mockRejectedValueOnce(transient())
      .mockRejectedValueOnce(transient())
      .mockResolvedValueOnce({ status: 'done' });

    const { result } = renderHook(() => usePolling(poll, {
      interval: 5, isDone: () => true,
    }));

    await waitFor(() => expect(result.current.data).toEqual({ status: 'done' }));
    expect(result.current.error).toBeNull();
  });

  it('fails after too many transient failures in a row', async () => {
    const poll = vi.fn().mockRejectedValue(transient());

    const { result } = renderHook(() => usePolling(poll, { interval: 1 }));

    await waitFor(() => expect(result.current.error).not.toBeNull(), { timeout: 2000 });
    expect(poll).toHaveBeenCalledTimes(4); // 1 + 3 retries
  });

  it('fails at once on a non-transient error', async () => {
    const poll = vi.fn().mockRejectedValue(new ApiError({ status: 404, detail: 'not found' }));

    const { result } = renderHook(() => usePolling(poll, { interval: 5 }));

    await waitFor(() => expect(result.current.error?.status).toBe(404));
    expect(poll).toHaveBeenCalledTimes(1);
  });

  it('never returns data polled for an earlier key', async () => {
    const poll = vi.fn(async () => ({ status: 'done' }));
    const { result, rerender } = renderHook(
      ({ key }) => usePolling(poll, { key, isDone: () => true }),
      { initialProps: { key: 'a' } },
    );
    await waitFor(() => expect(result.current.data).not.toBeNull());

    rerender({ key: 'b' });

    expect(result.current.data).toBeNull();
  });
});

describe('useAsyncJob', () => {
  /** Also returns `renders`: the status of every render, in order. */
  const setup = (polls) => {
    let started = 0;
    const start = vi.fn(async () => ({ id: ++started }));
    const poll = vi.fn(async (job) => polls(job));
    const renders = [];
    const hook = renderHook(() => {
      const job = useAsyncJob(start, poll, { interval: 5 });
      renders.push(job.status);
      return job;
    });
    return { ...hook, renders };
  };

  it('goes starting -> running -> done', async () => {
    const { result } = setup(() => ({ status: 'done', value: 1 }));

    await act(() => result.current.start('x'));

    await waitFor(() => expect(result.current.status).toBe('done'));
    expect(result.current.result).toEqual({ status: 'done', value: 1 });
  });

  it('does not report the previous job as done when a second one starts', async () => {
    const gates = {};
    const { result, renders } = setup((job) => (job.id === 1
      ? { status: 'done' }
      : new Promise((resolve) => { gates[job.id] = resolve; })));
    await act(() => result.current.start('first'));
    await waitFor(() => expect(result.current.status).toBe('done'));
    renders.length = 0;

    await act(() => result.current.start('second'));

    expect(renders).not.toContain('done');
    expect(result.current.status).toBe('running');
    await act(async () => gates[2]({ status: 'done' }));
  });

  it('cancel after a poll error goes back to idle', async () => {
    const { result } = setup(() => { throw new ApiError({ status: 404, detail: 'gone' }); });
    await act(() => result.current.start('x'));
    await waitFor(() => expect(result.current.status).toBe('failed'));
    expect(result.current.errorWhilePolling).toBe(true);

    act(() => result.current.cancel());

    expect(result.current.status).toBe('idle');
  });
});

describe('useFetch', () => {
  it('ignores a response that arrives after deps changed', async () => {
    const resolvers = {};
    const fetcher = (id) => () => new Promise((resolve) => { resolvers[id] = resolve; });
    const { result, rerender } = renderHook(
      ({ id }) => useFetch(fetcher(id), [id]),
      { initialProps: { id: 'old' } },
    );

    rerender({ id: 'new' });
    await act(async () => resolvers.new('new data'));
    await act(async () => resolvers.old('old data'));

    expect(result.current.data).toBe('new data');
  });
});

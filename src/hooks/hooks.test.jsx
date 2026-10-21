import { act, renderHook, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../api/client.js';
import { validateEmail, validatePassword } from '../auth/validation.js';
import { useAnalyzeRun } from './useAnalyzeRun.js';
import { useMutation } from './useMutation.js';
import { json, mockFetch, renderWithProviders } from '../test/utils.jsx';

describe('validation (mirrors jobbed_back/api/schemas.py)', () => {
  it.each([
    ['me@example.com', null],
    ['  me@example.com  ', null],
    ['me@example', 'Enter a valid email'],
    ['me @example.com', 'Enter a valid email'],
    [`${'a'.repeat(250)}@b.co`, 'Enter a valid email'], // 255 > 254
  ])('email %j', (value, expected) => {
    expect(validateEmail(value)).toBe(expected);
  });

  it.each([
    ['x'.repeat(7), false],
    ['x'.repeat(8), true],
    ['x'.repeat(72), true],
    ['x'.repeat(73), false],
    ['é'.repeat(40), false], // 40 characters but 80 bytes: bcrypt reads 72
  ])('password of %j is valid: %s', (value, valid) => {
    expect(validatePassword(value) === null).toBe(valid);
  });
});

describe('useMutation', () => {
  it('resolves with the result on success', async () => {
    const { result } = renderHook(() => useMutation(async (x) => x * 2));
    await expect(act(() => result.current.run(21))).resolves.toBe(42);
    expect(result.current.error).toBeNull();
  });

  it('resolves undefined, keeps the error and shows a toast on failure', async () => {
    renderWithProviders(<div />);
    const failure = new ApiError({ status: 409, detail: 'term already exists' });
    const { result } = renderHook(() => useMutation(async () => { throw failure; }));

    await expect(act(() => result.current.run())).resolves.toBeUndefined();

    expect(result.current.error).toBe(failure);
    expect(await screen.findByText('term already exists')).toBeInTheDocument();
  });
});

describe('useAnalyzeRun', () => {
  const batch = (analysed, remaining, failed = 0) => json({
    analysed, failed, due: 0, filtered_out: 0, remaining,
    results: Array.from({ length: analysed }, (_, i) => ({ job_id: `${remaining}-${i}` })),
  });

  const run = async (handler, params = { limit: 2 }) => {
    const fetchMock = mockFetch({ 'POST /v1/me/analyze': handler });
    const hook = renderHook(() => useAnalyzeRun());
    await act(() => hook.result.current.start(params));
    return { ...hook, fetchMock };
  };

  it('runs batches until nothing remains, adding up the progress', async () => {
    const answers = [batch(2, 3), batch(2, 1, 0), batch(1, 0)];
    const { result, fetchMock } = await run(() => answers.shift());

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.current.status).toBe('done');
    expect(result.current.progress).toMatchObject({ batches: 3, analysed: 5, remaining: 0 });
    expect(result.current.results).toHaveLength(5);
  });

  it('sends the API field names', async () => {
    const { fetchMock } = await run(() => batch(1, 0), { limit: 5, windowDays: 3, model: 'sonnet' });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body))
      .toEqual({ limit: 5, window_days: 3, model: 'sonnet' });
  });

  it('stops softly after the batch in flight', async () => {
    let release;
    mockFetch({
      'POST /v1/me/analyze': () => new Promise((resolve) => { release = () => resolve(batch(2, 10)); }),
    });
    const { result } = renderHook(() => useAnalyzeRun());
    let started;
    act(() => { started = result.current.start({}); });
    await waitFor(() => expect(release).toBeDefined());

    act(() => result.current.stop());
    expect(result.current.status).toBe('stopping');
    await act(async () => { release(); await started; });

    expect(result.current.status).toBe('stopped');
    expect(result.current.progress.analysed).toBe(2);
  });

  it('stops with the reset time when the daily cap is reached', async () => {
    const { result } = await run(() => json({ detail: 'daily limit of 10 analyses reached' }, 429, { 'Retry-After': '3600' }));
    expect(result.current.status).toBe('failed');
    expect(result.current.stopReason).toMatchObject({ kind: 'quota', retryAfter: 3600 });
  });

  it('reports a run already in flight as busy', async () => {
    const { result } = await run(() => json({ detail: 'analysis already running' }, 409));
    expect(result.current.stopReason.kind).toBe('busy');
  });

  it('gives up when a batch grades nothing', async () => {
    const { result, fetchMock } = await run(() => batch(0, 5, 2));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.stopReason.kind).toBe('no-progress');
  });

  it('never loops past the safety cap', async () => {
    const { result, fetchMock } = await run(() => batch(1, 1000));
    expect(fetchMock).toHaveBeenCalledTimes(50);
    expect(result.current.status).toBe('stopped');
  });

  it('ignores a second start while running', async () => {
    let release;
    const fetchMock = mockFetch({
      'POST /v1/me/analyze': () => new Promise((resolve) => { release = () => resolve(batch(1, 0)); }),
    });
    const { result } = renderHook(() => useAnalyzeRun());
    let first;
    act(() => { first = result.current.start({}); });
    await act(() => result.current.start({}));
    await act(async () => { release(); await first; });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});


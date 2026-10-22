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
  const answer = (analysed, failed = 0, skipped = 0) => json({
    analysed, failed, skipped,
    results: Array.from({ length: analysed }, (_, i) => ({ job_id: `j${i}` })),
  });

  const run = async (handler, params = { jobIds: ['a', 'b'] }) => {
    const fetchMock = mockFetch({ 'POST /v1/me/analyze': handler });
    const hook = renderHook(() => useAnalyzeRun());
    await act(() => hook.result.current.start(params));
    return { ...hook, fetchMock };
  };

  it('grades the picked ids in one request and keeps the counts', async () => {
    const { result, fetchMock } = await run(() => answer(2, 0, 1));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('done');
    expect(result.current.progress).toEqual({ analysed: 2, failed: 0, skipped: 1 });
    expect(result.current.results).toHaveLength(2);
  });

  it('sends the API field names', async () => {
    const { fetchMock } = await run(() => answer(1), { jobIds: ['a', 'b'], model: 'sonnet' });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body))
      .toEqual({ job_ids: ['a', 'b'], model: 'sonnet' });
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

  it('ignores a second start while running', async () => {
    let release;
    const fetchMock = mockFetch({
      'POST /v1/me/analyze': () => new Promise((resolve) => { release = () => resolve(answer(1)); }),
    });
    const { result } = renderHook(() => useAnalyzeRun());
    let first;
    act(() => { first = result.current.start({ jobIds: ['a'] }); });
    await waitFor(() => expect(release).toBeDefined());
    await act(() => result.current.start({ jobIds: ['a'] }));
    await act(async () => { release(); await first; });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

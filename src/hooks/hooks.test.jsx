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
  const STARTED = json({ analysis_id: 'r1' }, 202);
  const finished = (analysed, failed = 0, skipped = 0) => json({
    status: 'done', done: analysed + failed, total: analysed + failed, error: null,
    result: {
      analysed, failed, skipped,
      results: Array.from({ length: analysed }, (_, i) => ({ job_id: `j${i}` })),
    },
  });

  const run = async (routes, params = { jobIds: ['a', 'b'] }) => {
    const fetchMock = mockFetch({ 'POST /v1/me/analyze': STARTED, ...routes });
    const hook = renderHook(() => useAnalyzeRun());
    await act(() => hook.result.current.start(params));
    return { ...hook, fetchMock };
  };

  it('starts one run, polls it to the end and keeps the counts', async () => {
    const { result } = await run({ 'GET /v1/me/analyze/r1': finished(2, 0, 1) });

    await waitFor(() => expect(result.current.status).toBe('done'));
    expect(result.current.progress).toEqual({ done: 2, total: 2, analysed: 2, failed: 0, skipped: 1 });
    expect(result.current.results).toHaveLength(2);
  });

  it('shows progress while running', async () => {
    const { result } = await run({
      'GET /v1/me/analyze/r1': json({ status: 'running', done: 1, total: 3, result: null, error: null }),
    });

    await waitFor(() => expect(result.current.progress.done).toBe(1));
    expect(result.current.status).toBe('running');
    expect(result.current.progress.total).toBe(3);
  });

  it('sends the API field names', async () => {
    const { fetchMock } = await run(
      { 'GET /v1/me/analyze/r1': finished(1) }, { jobIds: ['a', 'b'], model: 'sonnet' },
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body))
      .toEqual({ job_ids: ['a', 'b'], model: 'sonnet' });
  });

  it('stops with the reset time when the daily cap is reached', async () => {
    const { result } = await run({
      'POST /v1/me/analyze': json({ detail: 'daily limit of 10 analyses reached' }, 429, { 'Retry-After': '3600' }),
    });
    expect(result.current.status).toBe('failed');
    expect(result.current.stopReason).toMatchObject({ kind: 'quota', retryAfter: 3600 });
  });

  it('reports a run already in flight as busy', async () => {
    const { result } = await run({
      'POST /v1/me/analyze': json({ detail: 'analysis already running' }, 409),
    });
    expect(result.current.stopReason.kind).toBe('busy');
  });

  it('reports a run whose every grading call failed', async () => {
    const { result, rerender } = await run({
      'GET /v1/me/analyze/r1': json({
        status: 'failed', done: 1, total: 1, result: null,
        error: { status: 502, detail: 'every grading call failed' },
      }),
    });
    await waitFor(() => expect(result.current.status).toBe('failed'));
    expect(result.current.stopReason.kind).toBe('all-failed');
    // Same array across renders: AiAnalysis has it in effect deps (React #185).
    const { results } = result.current;
    rerender();
    expect(result.current.results).toBe(results);
  });

  it('ignores a second start while running', async () => {
    const { result, fetchMock } = await run({
      'GET /v1/me/analyze/r1': json({ status: 'running', done: 0, total: 1, result: null, error: null }),
    });
    await act(() => result.current.start({ jobIds: ['a'] }));

    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1);
  });
});

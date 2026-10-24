import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useGenerateCv } from './useGenerateCv.js';
import { json, mockFetch, page } from '../test/utils.jsx';

const CV = { cv_id: 'c1', job_id: 'j1', title: 'Dev', company: 'Acme', adequation_grade: 80, locale: 'en', cv: {} };

describe('useGenerateCv', () => {
  it('reports a poll 404 as interrupted', async () => {
    mockFetch({
      'GET /v1/me/generated-cvs': page([]),
      'POST /v1/me/cvs/generate': json({ generation_id: 'g1' }, 202),
      'GET /v1/me/cvs/generate/g1': json({ detail: 'not found' }, 404),
    });
    const { result } = renderHook(() => useGenerateCv());

    await act(() => result.current.generate('j1'));

    await waitFor(() => expect(result.current.stopReason?.kind).toBe('interrupted'));
  });

  it('maps a job that failed with "no analysis for job"', async () => {
    mockFetch({
      'GET /v1/me/generated-cvs': page([]),
      'POST /v1/me/cvs/generate': json({ generation_id: 'g1' }, 202),
      'GET /v1/me/cvs/generate/g1': json({
        status: 'failed', cv: null, error: { status: 409, detail: 'no analysis for job' },
      }),
    });
    const { result } = renderHook(() => useGenerateCv());

    await act(() => result.current.generate('j1'));

    await waitFor(() => expect(result.current.stopReason?.kind).toBe('no-analysis'));
  });

  it('survives a failed job with no error body', async () => {
    mockFetch({
      'GET /v1/me/generated-cvs': page([]),
      'POST /v1/me/cvs/generate': json({ generation_id: 'g1' }, 202),
      'GET /v1/me/cvs/generate/g1': json({ status: 'failed', cv: null, error: null }),
    });
    const { result } = renderHook(() => useGenerateCv());

    await act(() => result.current.generate('j1'));

    await waitFor(() => expect(result.current.stopReason?.kind).toBe('error'));
  });

  it('refetches the list when a job is done, even with cv: null', async () => {
    let listed = [];
    mockFetch({
      'GET /v1/me/generated-cvs': () => page(listed),
      'POST /v1/me/cvs/generate': json({ generation_id: 'g1' }, 202),
      'GET /v1/me/cvs/generate/g1': () => {
        listed = [CV];
        return json({ status: 'done', cv: null, error: null });
      },
    });
    const { result } = renderHook(() => useGenerateCv());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => result.current.generate('j1'));

    await waitFor(() => expect(result.current.cvs).toEqual([CV]));
    expect(result.current.status).toBe('done');
  });
});

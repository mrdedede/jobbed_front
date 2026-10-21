import { act, renderHook, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ErrorBoundary from './ErrorBoundary.jsx';
import StopAlert from './StopAlert.jsx';
import { useCvs } from '../hooks/useCvs.js';
import { json, mockFetch, renderWithProviders } from '../test/utils.jsx';

describe('StopAlert', () => {
  it.each([
    [7199, 'Resets in 2h 0m.'],
    [3600, 'Resets in 1h 0m.'],
    [61, 'Resets in 2m.'],
  ])('rounds %is up to the minute', (retryAfter, text) => {
    renderWithProviders(<StopAlert reason={{ kind: 'quota', message: 'Daily limit.', retryAfter }} />);
    expect(screen.getByRole('alert')).toHaveTextContent(text);
  });
});

describe('ErrorBoundary', () => {
  it('shows the error instead of a blank page', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const Broken = () => { throw new Error('kaboom'); };

    renderWithProviders(<ErrorBoundary><Broken /></ErrorBoundary>);

    expect(screen.getByRole('alert')).toHaveTextContent('kaboom');
  });
});

describe('useCvs', () => {
  it('shows server data again after a refetch that follows an optimistic edit', async () => {
    let server = [{ id: 'a', content_md: 'one', is_active: true }];
    mockFetch({
      'GET /v1/me/cvs': () => json(server),
      'POST /v1/me/cvs': ({ body }) => json({ id: 'b', content_md: body.content_md, is_active: false }, 201),
    });
    const { result } = renderHook(() => useCvs());
    await waitFor(() => expect(result.current.cvs).toHaveLength(1));

    await act(() => result.current.create('two', false));
    expect(result.current.cvs.map((cv) => cv.id)).toEqual(['a', 'b']);

    server = [{ id: 'z', content_md: 'from elsewhere', is_active: true }];
    act(() => result.current.refetch());

    await waitFor(() => expect(result.current.cvs.map((cv) => cv.id)).toEqual(['z']));
  });
});

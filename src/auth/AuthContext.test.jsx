import { act, renderHook, screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { login, logout, readToken, useAuth } from './AuthContext.jsx';
import RequireAuth from './RequireAuth.jsx';
import Login from '../pages/Login/Login.jsx';
import { fakeToken, renderWithProviders } from '../test/utils.jsx';

describe('token store', () => {
  it('stores the token and drops an expired one', () => {
    login(fakeToken());
    expect(readToken()).not.toBeNull();

    window.localStorage.setItem('jobbed.token', fakeToken(-10));
    expect(readToken()).toBeNull();
    logout();
  });

  it('follows a logout made in another tab', () => {
    login(fakeToken());
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(true);

    // The other tab clears storage; this tab only gets a storage event.
    act(() => {
      window.localStorage.removeItem('jobbed.token');
      window.dispatchEvent(new StorageEvent('storage', { key: 'jobbed.token' }));
    });

    expect(result.current.isAuthenticated).toBe(false);
  });

  it('warns before the session expires, then logs out', async () => {
    vi.useFakeTimers();
    renderWithProviders(<div />);
    act(() => login(fakeToken(6 * 60)));

    await act(async () => vi.advanceTimersByTime(61_000));
    expect(screen.getByText('Session expiring')).toBeInTheDocument();

    await act(async () => vi.advanceTimersByTime(5 * 60_000));
    expect(readToken()).toBeNull();
    vi.useRealTimers();
  });
});

describe('RequireAuth + Login', () => {
  const app = (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route path="/cvs" element={<p>cvs page</p>} />
      </Route>
    </Routes>
  );

  it('sends back to the original URL, query string included, after login', async () => {
    renderWithProviders(app, { route: '/cvs?tab=2' });
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument();

    act(() => login(fakeToken()));

    expect(await screen.findByText('cvs page')).toBeInTheDocument();
    logout();
  });
});

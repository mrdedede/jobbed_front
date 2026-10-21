/**
 * @file Test helpers: a fake fetch keyed by "METHOD /path" and a render with
 * the app's providers.
 */

import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

/**
 * A JSON Response.
 *
 * @param {*} body
 * @param {number=} status
 * @param {Object<string, string>=} headers
 */
export function json(body, status = 200, headers = {}) {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

/**
 * Stubs global fetch. `routes` maps "METHOD /path" (query string included) to
 * a Response, or a function (request info) => Response | Promise<Response>.
 * Unknown routes answer 404. Returns the vi.fn so tests can inspect calls.
 *
 * @param {Object<string, (Response|function(Object): (Response|Promise<Response>))>} routes
 */
export function mockFetch(routes) {
  const fetchMock = vi.fn(async (url, init = {}) => {
    const { pathname, search } = new URL(url, 'http://test');
    const method = init.method ?? 'GET';
    const key = `${method} ${pathname}${search}`;
    const handler = routes[key] ?? routes[`${method} ${pathname}`];
    if (!handler) return json({ detail: `no mock for ${key}` }, 404);
    const body = init.body ? JSON.parse(init.body) : undefined;
    const response = typeof handler === 'function'
      ? await handler({ url, init, body, signal: init.signal })
      : handler;
    // A Response body can be read once; tests may hit a route repeatedly.
    return response.clone();
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/**
 * Renders inside MantineProvider, Notifications and a MemoryRouter.
 *
 * @param {import('react').ReactNode} ui
 * @param {{route?: string}=} options Initial URL.
 */
export function renderWithProviders(ui, { route = '/' } = {}) {
  return render(
    <MantineProvider>
      <Notifications />
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </MantineProvider>,
  );
}

/**
 * An unsigned JWT whose `exp` is `secondsFromNow` ahead.
 *
 * @param {number} secondsFromNow
 */
export function fakeToken(secondsFromNow = 3600) {
  const payload = { sub: 'u1', exp: Math.floor(Date.now() / 1000) + secondsFromNow };
  return `h.${btoa(JSON.stringify(payload))}.s`;
}

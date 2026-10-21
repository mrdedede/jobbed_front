import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configureClient, request } from './client.js';
import { login } from './endpoints/auth.js';
import { json, mockFetch } from '../test/utils.jsx';

describe('request', () => {
  const onUnauthorized = vi.fn();

  beforeEach(() => {
    vi.useRealTimers();
    onUnauthorized.mockReset();
    configureClient({ getToken: () => 'tok', onUnauthorized });
  });

  it('sends the Bearer token and JSON body, and parses the answer', async () => {
    const fetchMock = mockFetch({ 'POST /v1/me/keywords': json({ id: '1', term: 'go' }, 201) });

    await expect(request('/v1/me/keywords', { method: 'POST', body: { term: 'go' } }))
      .resolves.toEqual({ id: '1', term: 'go' });
    const { headers, body } = fetchMock.mock.calls[0][1];
    expect(headers.Authorization).toBe('Bearer tok');
    expect(headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(body)).toEqual({ term: 'go' });
  });

  it('resolves null on 204', async () => {
    mockFetch({ 'DELETE /v1/me': json(null, 204) });
    await expect(request('/v1/me', { method: 'DELETE' })).resolves.toBeNull();
  });

  it('turns a FastAPI 422 list into a readable message', async () => {
    mockFetch({
      'POST /v1/auth/signup': json({
        detail: [
          { loc: ['body', 'password'], msg: 'String should have at least 8 characters' },
          { loc: ['body', 'email'], msg: 'value is not a valid email' },
        ],
      }, 422),
    });

    await expect(request('/v1/auth/signup', { method: 'POST', body: {} })).rejects.toMatchObject({
      status: 422,
      detail: 'password: String should have at least 8 characters; email: value is not a valid email',
    });
  });

  it('parses Retry-After on a 429', async () => {
    mockFetch({ 'POST /v1/me/analyze': json({ detail: 'daily limit' }, 429, { 'Retry-After': '120' }) });
    await expect(request('/v1/me/analyze', { method: 'POST', body: {} }))
      .rejects.toMatchObject({ status: 429, retryAfter: 120 });
  });

  it('maps a timeout to status 0', async () => {
    mockFetch({
      'GET /v1/me': ({ signal }) => new Promise((_, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason));
      }),
    });
    await expect(request('/v1/me', { timeout: 10 })).rejects.toMatchObject({ status: 0 });
  });

  it('runs the 401 handler once for simultaneous 401s', async () => {
    vi.useFakeTimers();
    mockFetch({ 'GET /v1/me': json({ detail: 'expired' }, 401) });

    await Promise.allSettled([request('/v1/me'), request('/v1/me')]);

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1000); // end the cooldown for the next tests
    vi.useRealTimers();
  });

  it('does not treat a wrong-password 401 on login as an expired session', async () => {
    mockFetch({ 'POST /v1/auth/login': json({ detail: 'invalid credentials' }, 401) });

    await expect(login({ email: 'a@b.co', password: 'x'.repeat(8) }))
      .rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});

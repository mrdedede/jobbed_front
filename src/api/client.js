/**
 * @file Fetch wrapper for the backend API.
 *
 * Adds the base URL, JSON encoding/decoding, the Bearer token, a default
 * timeout, normalized errors (ApiError) and a global 401 handler.
 */

/** Same-origin by default: the ingress routes /v1 to the backend service. */
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

/** Default request timeout, in milliseconds. */
const DEFAULT_TIMEOUT_MS = 15_000;

/** Window during which further 401 responses do not re-trigger the handler. */
const UNAUTHORIZED_COOLDOWN_MS = 1000;

/**
 * Normalized error thrown for every failed request.
 */
export class ApiError extends Error {
  /**
   * @param {{status: number, detail: string, retryAfter?: (number|null)}} fields
   *     `status` is the HTTP status, or 0 for a network failure or timeout.
   *     `retryAfter` is the Retry-After value in seconds, if the server sent one.
   */
  constructor({ status, detail, retryAfter = null }) {
    super(detail);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
    this.retryAfter = retryAfter;
  }
}

/** @type {function(): ?string} */
let tokenProvider = () => null;

/** @type {function(): void} */
let unauthorizedHandler = () => {};

/** True while the cooldown after a 401 is running. */
let isHandlingUnauthorized = false;

/**
 * Connects the client to the auth store. Call once at startup; the auth store
 * does not exist yet, and injecting it avoids a circular import.
 *
 * Example:
 *   configureClient({
 *     getToken: () => useAuthStore.getState().token,
 *     onUnauthorized: () => {
 *       useAuthStore.getState().logout();
 *       window.location.assign('/login');
 *     },
 *   });
 *
 * @param {{getToken?: function(): ?string, onUnauthorized?: function(): void}} handlers
 *     `getToken` returns the current Bearer token; `onUnauthorized` runs once
 *     when the API answers 401 (log out and redirect).
 */
export function configureClient({ getToken, onUnauthorized }) {
  if (getToken) tokenProvider = getToken;
  if (onUnauthorized) unauthorizedHandler = onUnauthorized;
}

/**
 * Parses a Retry-After header, which is either seconds or an HTTP date.
 *
 * @param {?string} headerValue Raw header value.
 * @return {?number} Seconds to wait, or null if absent or unparseable.
 */
function parseRetryAfter(headerValue) {
  if (!headerValue) return null;
  const seconds = Number(headerValue);
  if (!Number.isNaN(seconds)) return seconds;
  const millisecondsUntilDate = Date.parse(headerValue) - Date.now();
  if (Number.isNaN(millisecondsUntilDate)) return null;
  return Math.max(0, Math.ceil(millisecondsUntilDate / 1000));
}

/**
 * Extracts a human-readable message from an error response body.
 *
 * @param {?Object} errorBody Parsed JSON body, or null if it was not JSON.
 * @param {string} fallbackMessage Used when the body carries no message.
 * @return {string} The error detail.
 */
function extractErrorDetail(errorBody, fallbackMessage) {
  const message = errorBody?.detail ?? errorBody?.message;
  if (!message) return fallbackMessage;
  // FastAPI validation errors arrive as an array of objects.
  return typeof message === 'string' ? message : JSON.stringify(message);
}

/**
 * Runs the unauthorized handler once, even if several in-flight requests
 * receive a 401 together.
 */
function handleUnauthorized() {
  if (isHandlingUnauthorized) return;
  isHandlingUnauthorized = true;
  unauthorizedHandler();
  setTimeout(() => {
    isHandlingUnauthorized = false;
  }, UNAUTHORIZED_COOLDOWN_MS);
}

/**
 * Sends a request to the API.
 *
 * @param {string} path Path appended to the base URL, e.g. '/v1/jobs'.
 * @param {Object=} options
 * @param {string=} options.method HTTP method. Defaults to 'GET'.
 * @param {*=} options.body Value sent as JSON.
 * @param {Object<string, string>=} options.headers Extra headers.
 * @param {AbortSignal=} options.signal Lets the caller cancel the request.
 * @param {number=} options.timeout Timeout override, in milliseconds.
 * @return {Promise<*>} Parsed JSON body, or null for a 204 response.
 * @throws {ApiError} On a non-2xx status, network failure or timeout.
 * @throws {DOMException} AbortError, when the caller's signal aborts.
 */
export async function request(path, options = {}) {
  const {
    method = 'GET',
    body,
    headers,
    signal: callerSignal,
    timeout = DEFAULT_TIMEOUT_MS,
  } = options;

  const timeoutSignal = AbortSignal.timeout(timeout);
  const token = tokenProvider();

  let response;
  try {
    response = await fetch(BASE_URL + path, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: callerSignal
        ? AbortSignal.any([callerSignal, timeoutSignal])
        : timeoutSignal,
    });
  } catch (fetchError) {
    // A deliberate cancellation is not an API failure; let it through as is.
    if (callerSignal?.aborted) throw fetchError;
    throw new ApiError({
      status: 0,
      detail: timeoutSignal.aborted
        ? `Request timed out after ${timeout}ms`
        : 'Network error',
    });
  }

  const responseBody =
    response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    throw new ApiError({
      status: response.status,
      detail: extractErrorDetail(
        responseBody,
        response.statusText || `HTTP ${response.status}`,
      ),
      retryAfter: parseRetryAfter(response.headers.get('Retry-After')),
    });
  }
  return responseBody;
}

/** Shorthand helpers; `options` is the same object `request` accepts. */
export const api = {
  get: (path, options) => request(path, options),
  post: (path, body, options) =>
    request(path, { ...options, method: 'POST', body }),
  put: (path, body, options) =>
    request(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options) =>
    request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
};

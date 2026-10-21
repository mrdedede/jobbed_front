/**
 * @file Token storage and route protection.
 *
 * The token lives in localStorage so it survives reloads. It is exposed as an
 * external store (useSyncExternalStore), so no provider is needed and the API
 * client can read it outside React with no startup race.
 */

import { useSyncExternalStore } from 'react';
import { notifications } from '@mantine/notifications';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { configureClient } from '../api/client.js';

const STORAGE_KEY = 'joblister.token';

/** Fallback when localStorage throws (private window, blocked site data). */
let memoryToken = null;

/** How long before expiry the user is warned. */
const EXPIRY_WARNING_MS = 5 * 60 * 1000;
const EXPIRY_NOTIFICATION_ID = 'session-expiry';

/** @type {Set<function(): void>} Callbacks to run when the token changes. */
const listeners = new Set();

/** setTimeout stores its delay in 32 bits; longer values fire immediately. */
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

/** @type {?number} Pending auto-logout timer. */
let expiryTimer = null;

/** @type {?number} Pending "session expires soon" timer. */
let warningTimer = null;

/**
 * Reads the `exp` claim of a JWT. The signature is not checked: the server
 * does that, this only tells the UI when to give up on the token.
 *
 * @param {string} token A JWT.
 * @return {?number} Expiry as a millisecond timestamp, or null if unreadable.
 */
function getExpiryMs(token) {
  try {
    const payloadBase64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(window.atob(payloadBase64));
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * Reads the token.
 *
 * @return {?string} The stored token, or null if it is missing, malformed or
 *     expired, i.e. the user must log in again.
 */
export function readToken() {
  let token;
  try {
    // Storage is the source of truth when it works, so a logout in another
    // tab (which clears it) logs this tab out too.
    token = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    token = memoryToken;
  }
  if (!token) return null;
  const expiryMs = getExpiryMs(token);
  return expiryMs !== null && expiryMs > Date.now() ? token : null;
}

/**
 * Stores or clears the token and notifies subscribed components.
 *
 * @param {?string} token The new token, or null to clear it.
 */
function writeToken(token) {
  memoryToken = token;
  try {
    if (token) window.localStorage.setItem(STORAGE_KEY, token);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable: the in-memory copy keeps this tab working.
  }
  listeners.forEach((listener) => listener());
}

/**
 * Subscribes to token changes, including those made in other tabs.
 *
 * @param {function(): void} listener Called on every change.
 * @return {function(): void} Unsubscribe function.
 */
function subscribe(listener) {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

/** Another tab logged in or out: follow its token's timers. */
function onStorage(event) {
  if (event.key !== STORAGE_KEY) return;
  const token = readToken();
  if (token) scheduleAutoLogout(token);
  else clearTimers();
}

/**
 * Saves the token received from /v1/auth/login or /v1/auth/signup.
 *
 * @param {string} accessToken The `access_token` field of the response.
 */
export function login(accessToken) {
  writeToken(accessToken);
  scheduleAutoLogout(accessToken);
}

/** Forgets the token; protected routes then redirect to /login. */
export function logout() {
  clearTimers();
  writeToken(null);
}

function clearTimers() {
  clearTimeout(expiryTimer);
  clearTimeout(warningTimer);
  notifications.hide(EXPIRY_NOTIFICATION_ID);
}

function warnExpiry() {
  notifications.show({
    id: EXPIRY_NOTIFICATION_ID,
    color: 'yellow',
    title: 'Session expiring',
    message: 'Your session ends in 5 minutes. Save your work; you will need to log in again.',
    autoClose: false,
  });
}

/**
 * Logs out by itself when the token expires. A timer that fires late (laptop
 * asleep) is still safe: readToken already treats an expired token as absent.
 *
 * @param {string} token A JWT.
 */
function scheduleAutoLogout(token) {
  clearTimers();
  const expiryMs = getExpiryMs(token);
  if (expiryMs === null) return;
  const delay = (ms) => Math.min(Math.max(ms, 0), MAX_TIMEOUT_MS);
  expiryTimer = setTimeout(logout, delay(expiryMs - Date.now()));
  warningTimer = setTimeout(warnExpiry, delay(expiryMs - EXPIRY_WARNING_MS - Date.now()));
}

// A 401 from the API means the token is missing, expired or invalid.
configureClient({ getToken: readToken, onUnauthorized: logout });

// Page reload: resume the countdown for a token saved earlier.
const savedToken = readToken();
if (savedToken) scheduleAutoLogout(savedToken);
window.addEventListener('storage', onStorage);

/**
 * Hook for components that need the auth state.
 *
 * @return {{token: ?string, isAuthenticated: boolean}}
 */
export function useAuth() {
  const token = useSyncExternalStore(subscribe, readToken);
  return { token, isAuthenticated: token !== null };
}

/**
 * Layout route: renders the nested routes (<Outlet />) only when a token is
 * present, otherwise redirects to /login, remembering where the user was heading.
 *
 * @return {import('react').ReactNode}
 */
export function RequireAuth() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

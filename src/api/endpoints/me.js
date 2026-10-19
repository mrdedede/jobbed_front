/**
 * @file Current-user profile endpoints (/v1/me).
 */

import { api } from '../client.js';

/**
 * Fetches the current user.
 *
 * @param {Object=} options Request options, see `request` in client.js.
 * @return {Promise<{id: string, email: string}>}
 */
export function getMe(options) {
  return api.get('/v1/me', options);
}

/**
 * Changes the current user's password.
 *
 * @param {{current_password: string, new_password: string}} passwords
 * @param {Object=} options Request options, see `request` in client.js.
 * @return {Promise<null>}
 * @throws {ApiError} 401 if the current password is wrong. This does not
 *     trigger the global 401 handler (no logout).
 */
export function changePassword(passwords, options) {
  return api.put('/v1/me/password', passwords, { ...options, skipUnauthorized: true });
}

/**
 * Deletes the account and everything under it.
 *
 * @param {Object=} options Request options, see `request` in client.js.
 * @return {Promise<null>}
 */
export function deleteMe(options) {
  return api.delete('/v1/me', options);
}

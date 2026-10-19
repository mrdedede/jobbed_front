/**
 * @file Public auth endpoints (/v1/auth). The only routes that work without a token.
 */

import { api } from '../client.js';

/**
 * @typedef {Object} Token
 * @property {string} access_token
 * @property {'bearer'} token_type
 */

/**
 * Creates an account.
 *
 * @param {{email: string, password: string}} credentials Password is 8-72 bytes.
 * @param {Object=} options Request options, see `request` in client.js.
 * @return {Promise<Token>}
 * @throws {ApiError} 409 if the email is already registered.
 */
export function signup(credentials, options) {
  return api.post('/v1/auth/signup', credentials, options);
}

/**
 * Logs in with email and password.
 *
 * @param {{email: string, password: string}} credentials
 * @param {Object=} options Request options, see `request` in client.js.
 * @return {Promise<Token>}
 * @throws {ApiError} 401 if the credentials are invalid.
 */
export function login(credentials, options) {
  return api.post('/v1/auth/login', credentials, options);
}

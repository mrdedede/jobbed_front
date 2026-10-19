/**
 * @file Blacklist endpoints (/v1/me/blacklist). Terms are trimmed and lowercased by the API.
 */

import { api } from '../client.js';

/**
 * @typedef {Object} Term
 * @property {string} id
 * @property {string} term
 */

/**
 * Lists the user's blacklisted terms.
 *
 * @param {Object=} options Request options, see `request` in client.js.
 * @return {Promise<Term[]>}
 */
export function listBlacklist(options) {
  return api.get('/v1/me/blacklist', options);
}

/**
 * Adds a blacklisted term. Idempotent: an existing term returns its row.
 *
 * @param {string} term 1-100 characters.
 * @param {Object=} options Request options, see `request` in client.js.
 * @return {Promise<Term>}
 * @throws {ApiError} 409 if the per-user limit is reached.
 */
export function createBlacklistTerm(term, options) {
  return api.post('/v1/me/blacklist', { term }, options);
}

/**
 * Replaces a blacklisted term.
 *
 * @param {string} blacklistId Blacklist entry id.
 * @param {string} term New value, 1-100 characters.
 * @param {Object=} options Request options, see `request` in client.js.
 * @return {Promise<Term>}
 * @throws {ApiError} 404 if not found, 409 if the term already exists.
 */
export function updateBlacklistTerm(blacklistId, term, options) {
  return api.put(`/v1/me/blacklist/${blacklistId}`, { term }, options);
}

/**
 * Deletes a blacklisted term.
 *
 * @param {string} blacklistId Blacklist entry id.
 * @param {Object=} options Request options, see `request` in client.js.
 * @return {Promise<null>}
 * @throws {ApiError} 404 if not found.
 */
export function removeBlacklistTerm(blacklistId, options) {
  return api.delete(`/v1/me/blacklist/${blacklistId}`, options);
}

/**
 * @file Keyword endpoints (/v1/me/keywords). Terms are trimmed and lowercased by the API.
 */

import { api } from '../client.js';

/**
 * @typedef {Object} Term
 * @property {string} id
 * @property {string} term
 */

/**
 * Lists the user's keywords.
 *
 * @param {Object=} options Request options, see `request` in client.js.
 * @return {Promise<Term[]>}
 */
export function listKeywords(options) {
  return api.get('/v1/me/keywords', options);
}

/**
 * Adds a keyword. Idempotent: an existing term returns its row.
 *
 * @param {string} term 1-100 characters.
 * @param {Object=} options Request options, see `request` in client.js.
 * @return {Promise<Term>}
 * @throws {ApiError} 409 if the per-user limit is reached.
 */
export function createKeyword(term, options) {
  return api.post('/v1/me/keywords', { term }, options);
}

/**
 * Replaces a keyword.
 *
 * @param {string} keywordId Keyword id.
 * @param {string} term New value, 1-100 characters.
 * @param {Object=} options Request options, see `request` in client.js.
 * @return {Promise<Term>}
 * @throws {ApiError} 404 if not found, 409 if the term already exists.
 */
export function updateKeyword(keywordId, term, options) {
  return api.put(`/v1/me/keywords/${keywordId}`, { term }, options);
}

/**
 * Deletes a keyword.
 *
 * @param {string} keywordId Keyword id.
 * @param {Object=} options Request options, see `request` in client.js.
 * @return {Promise<null>}
 * @throws {ApiError} 404 if not found.
 */
export function removeKeyword(keywordId, options) {
  return api.delete(`/v1/me/keywords/${keywordId}`, options);
}

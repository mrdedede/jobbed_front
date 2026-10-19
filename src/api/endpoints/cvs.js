/**
 * @file CV endpoints (/v1/me/cvs).
 */

import { api } from '../client.js';

/**
 * @typedef {Object} Cv
 * @property {string} id
 * @property {string} content_md Markdown, 1-100000 characters.
 * @property {boolean} is_active
 */

/**
 * Lists the user's CVs.
 *
 * @param {Object=} options Request options, see `request` in client.js.
 * @return {Promise<Cv[]>}
 */
export function listCvs(options) {
  return api.get('/v1/me/cvs', options);
}

/**
 * Creates a CV.
 *
 * @param {string} contentMarkdown CV text in Markdown.
 * @param {boolean=} makeActive Whether the new CV becomes active. The API
 *     defaults to true.
 * @param {Object=} options Request options, see `request` in client.js.
 * @return {Promise<Cv>}
 * @throws {ApiError} 409 if the per-user limit is reached.
 */
export function createCv(contentMarkdown, makeActive, options) {
  return api.post(
    '/v1/me/cvs',
    { content_md: contentMarkdown, make_active: makeActive },
    options,
  );
}

/**
 * Replaces a CV's content.
 *
 * @param {string} cvId CV id.
 * @param {string} contentMarkdown New CV text in Markdown.
 * @param {Object=} options Request options, see `request` in client.js.
 * @return {Promise<Cv>}
 * @throws {ApiError} 404 if not found.
 */
export function updateCv(cvId, contentMarkdown, options) {
  return api.put(`/v1/me/cvs/${cvId}`, { content_md: contentMarkdown }, options);
}

/**
 * Makes a CV the active one (used by analysis).
 *
 * @param {string} cvId CV id.
 * @param {Object=} options Request options, see `request` in client.js.
 * @return {Promise<Cv>}
 * @throws {ApiError} 404 if not found.
 */
export function activateCv(cvId, options) {
  return api.put(`/v1/me/cvs/${cvId}/activate`, undefined, options);
}

/**
 * Deletes a CV. Deleting the active one leaves none active.
 *
 * @param {string} cvId CV id.
 * @param {Object=} options Request options, see `request` in client.js.
 * @return {Promise<null>}
 * @throws {ApiError} 404 if not found.
 */
export function removeCv(cvId, options) {
  return api.delete(`/v1/me/cvs/${cvId}`, options);
}

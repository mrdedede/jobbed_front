/**
 * @file Cover letter endpoints (/v1/me/cover-letters).
 */

import { api } from '../client.js';

/**
 * @typedef {Object} LetterAnswers What the user tells the model; each may be blank.
 * @property {string} motivation Why the job is interesting to them.
 * @property {string} career_fit How it aligns with their career goals.
 * @property {string} offer_fit Why the offer makes sense to them.
 */

/**
 * @typedef {Object} CoverLetter
 * @property {string} letter_id
 * @property {string} cv_id The generated CV it was written from.
 * @property {string} job_id
 * @property {string} title Posting title.
 * @property {string} company
 * @property {?number} adequation_grade
 * @property {?string} depth_analysis The posting's analysis, Markdown.
 * @property {?string} locale 'en' | 'es' | 'fr' | 'pt'
 * @property {LetterAnswers} answers
 * @property {string} letter Plain text, paragraphs separated by blank lines.
 * @property {string} created_at
 */

/**
 * Starts writing a cover letter from one of the user's generated CVs.
 *
 * @param {string} cvId Generated CV id.
 * @param {LetterAnswers} answers
 * @param {Object=} options Request options, see `request` in client.js.
 * @return {Promise<{generation_id: string}>}
 * @throws {ApiError} 404 if not this user's CV, 409 if a letter is already
 *     being written, 429 at the daily cap.
 */
export function startLetterGeneration(cvId, answers, options) {
  return api.post('/v1/me/cover-letters/generate', { cv_id: cvId, answers }, options);
}

/**
 * Current state of a generation started by `startLetterGeneration`.
 *
 * @param {string} generationId
 * @param {Object=} options Request options, see `request` in client.js.
 * @return {Promise<{status: string, letter: ?CoverLetter, error: ?Object}>}
 * @throws {ApiError} 404 if unknown, or lost to an API restart.
 */
export function getLetterGeneration(generationId, options) {
  return api.get(`/v1/me/cover-letters/generate/${generationId}`, options);
}

/**
 * The user's cover letters, newest first.
 *
 * @param {{limit?: number, offset?: number}=} page `limit` 1-100 (API default 20).
 * @param {Object=} options Request options, see `request` in client.js.
 * @return {Promise<import('./analyses.js').Page<CoverLetter>>}
 */
export function listCoverLetters({ limit = 20, offset = 0 } = {}, options) {
  return api.get(`/v1/me/cover-letters?limit=${limit}&offset=${offset}`, options);
}

/**
 * Replaces a cover letter's text with the user's edit.
 *
 * @param {string} letterId
 * @param {string} letter
 * @param {Object=} options Request options, see `request` in client.js.
 * @return {Promise<CoverLetter>}
 * @throws {ApiError} 404 if not this user's letter.
 */
export function updateCoverLetter(letterId, letter, options) {
  return api.put(`/v1/me/cover-letters/${letterId}`, { letter }, options);
}

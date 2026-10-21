/**
 * @file Generated-CV endpoints (/v1/me/cvs/generate, /v1/me/generated-cvs).
 */

import { api } from '../client.js';

/**
 * @typedef {Object} GeneratedCv
 * @property {string} cv_id
 * @property {string} job_id
 * @property {string} title Posting title.
 * @property {string} company
 * @property {number} adequation_grade
 * @property {string} locale 'en' | 'es' | 'fr' | 'pt'
 * @property {Object} cv The model's CV, see `sections` in cv/sections.js.
 */

/**
 * @typedef {Object} CvGeneration
 * @property {'running'|'done'|'failed'} status
 * @property {?GeneratedCv} cv Set when done.
 * @property {?{status: number, detail: string}} error Set when failed.
 */

/**
 * Starts writing a CV for a posting the user already graded.
 *
 * @param {string} jobId Posting id.
 * @param {Object=} options Request options, see `request` in client.js.
 * @return {Promise<{generation_id: string}>}
 * @throws {ApiError} 409 if a generation is already running, 429 at the daily cap.
 */
export function startCvGeneration(jobId, options) {
  return api.post('/v1/me/cvs/generate', { job_id: jobId }, options);
}

/**
 * Current state of a generation started by `startCvGeneration`.
 *
 * @param {string} generationId
 * @param {Object=} options Request options, see `request` in client.js.
 * @return {Promise<CvGeneration>}
 * @throws {ApiError} 404 if unknown, or lost to an API restart.
 */
export function getCvGeneration(generationId, options) {
  return api.get(`/v1/me/cvs/generate/${generationId}`, options);
}

/**
 * The user's generated CVs, newest first.
 *
 * @param {Object=} options Request options, see `request` in client.js.
 * @return {Promise<GeneratedCv[]>}
 */
export function listGeneratedCvs(options) {
  return api.get('/v1/me/generated-cvs', options);
}

/**
 * Replaces a generated CV's body with the user's edit.
 *
 * @param {string} cvId
 * @param {Object} cv Same shape as `GeneratedCv.cv`.
 * @param {Object=} options Request options, see `request` in client.js.
 * @return {Promise<GeneratedCv>}
 * @throws {ApiError} 404 if not this user's CV, 422 if the shape is wrong.
 */
export function updateGeneratedCv(cvId, cv, options) {
  return api.put(`/v1/me/generated-cvs/${cvId}`, { cv }, options);
}

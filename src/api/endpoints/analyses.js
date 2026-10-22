/**
 * @file Job analysis endpoints (/v1/me/analyze, /v1/me/analyses and /v1/me/jobs).
 */

import { api } from '../client.js';

/**
 * Grading calls to the LLM are slow; the default client timeout is too short.
 * Kept below the ingress proxy-read-timeout (k8s/ingress.yaml, 300 s) so the
 * client gives up first, with its own error, rather than getting a 504 page.
 */
const ANALYZE_TIMEOUT_MS = 170_000;

/**
 * @typedef {Object} Analysis
 * @property {string} job_id
 * @property {?number} adequation_grade 0-100.
 * @property {string} company
 * @property {string} title
 * @property {?string} place
 * @property {string} url
 * @property {?string} ai_model
 * @property {?string} depth_analysis
 * @property {string} analysed_at ISO 8601 timestamp.
 */

/**
 * @typedef {Object} AnalyzeResult
 * @property {number} analysed
 * @property {number} failed
 * @property {number} skipped Unknown, already graded, or past the daily cap.
 * @property {Analysis[]} results
 */

/**
 * @typedef {Object} Candidate An ungraded posting the user may pick.
 * @property {string} job_id
 * @property {string} company
 * @property {string} title
 * @property {?string} place
 * @property {string} url
 * @property {string} scraped_at ISO 8601 timestamp.
 */

/**
 * Grades the picked postings, in order, up to the daily cap.
 *
 * @param {{jobIds: string[], model?: string}} params `jobIds` 1-50 ids from
 *     `listCandidates`, `model` one of the server's allowed models
 *     (default 'haiku').
 * @param {Object=} options Request options, see `request` in client.js.
 * @return {Promise<AnalyzeResult>}
 * @throws {ApiError} 409 if there is no active CV or a run is in flight,
 *     429 if the daily cap is reached (see `retryAfter`), 502 if every
 *     grading call failed.
 */
export function analyze({ jobIds, model }, options) {
  return api.post(
    '/v1/me/analyze',
    { job_ids: jobIds, model },
    { timeout: ANALYZE_TIMEOUT_MS, ...options },
  );
}

/**
 * Lists stored analyses.
 *
 * @param {{limit?: number, minGrade?: number, sinceDays?: number}=} params
 *     `limit` 1-200 (API default 50), `minGrade` 0-100 (default 0),
 *     `sinceDays` 1-365 keeps only analyses made within that many days
 *     (default: all).
 * @param {Object=} options Request options, see `request` in client.js.
 * @return {Promise<Analysis[]>}
 */
export function listAnalyses({ limit, minGrade, sinceDays } = {}, options) {
  const query = new URLSearchParams();
  if (limit !== undefined) query.set('limit', limit);
  if (minGrade !== undefined) query.set('min_grade', minGrade);
  if (sinceDays !== undefined) query.set('since_days', sinceDays);
  const queryString = query.size ? `?${query}` : '';
  return api.get(`/v1/me/analyses${queryString}`, options);
}

/**
 * Lists the ungraded postings matching the user's keywords and blacklist,
 * newest first: what `analyze` picks from.
 *
 * @param {number=} windowDays 1-30 (API default 1).
 * @param {Object=} options Request options, see `request` in client.js.
 * @return {Promise<Candidate[]>}
 */
export function listCandidates(windowDays, options) {
  const queryString =
    windowDays === undefined ? '' : `?window_days=${windowDays}`;
  return api.get(`/v1/me/analyses/candidates${queryString}`, options);
}

/**
 * Reads one posting, description included.
 *
 * @param {string} jobId
 * @param {Object=} options Request options, see `request` in client.js.
 * @return {Promise<Candidate & {description: ?string}>}
 * @throws {ApiError} 404 if there is no such posting.
 */
export function getJob(jobId, options) {
  return api.get(`/v1/me/jobs/${jobId}`, options);
}

/**
 * @file Job analysis endpoints (/v1/me/analyze and /v1/me/analyses).
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
 * @property {number} due
 * @property {number} filtered_out
 * @property {number} remaining Call again while this is greater than 0.
 * @property {Analysis[]} results
 */

/**
 * Grades the next batch of matching postings, newest first.
 *
 * @param {{limit?: number, windowDays?: number, model?: string}=} params
 *     `limit` 1-50 (API default 20), `windowDays` 1-30 (default 1), `model`
 *     one of the server's allowed models (default 'haiku').
 * @param {Object=} options Request options, see `request` in client.js.
 * @return {Promise<AnalyzeResult>}
 * @throws {ApiError} 409 if there is no active CV or a run is in flight,
 *     429 if the daily cap is reached (see `retryAfter`), 502 if every
 *     grading call failed.
 */
export function analyze({ limit, windowDays, model } = {}, options) {
  return api.post(
    '/v1/me/analyze',
    { limit, window_days: windowDays, model },
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
 * Counts postings an analysis run could grade right now.
 *
 * @param {number=} windowDays 1-30 (API default 1).
 * @param {Object=} options Request options, see `request` in client.js.
 * @return {Promise<{due: number}>}
 */
export function getDueCount(windowDays, options) {
  const queryString =
    windowDays === undefined ? '' : `?window_days=${windowDays}`;
  return api.get(`/v1/me/analyses/due${queryString}`, options);
}

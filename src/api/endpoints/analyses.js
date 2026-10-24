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
 * Listing candidates filters every ungraded posting server-side. Cached after
 * the first call, but that first call after an ingest can take minutes on a
 * small host (~100 s on the phone sandbox with an 84k-posting backlog). Same
 * ceiling as analyze, for the same reason.
 */
const CANDIDATES_TIMEOUT_MS = 170_000;

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
 * @template T
 * @typedef {Object} Page One page of a listing.
 * @property {T[]} items
 * @property {number} total Every row the filters match.
 */

/**
 * @typedef {Object} AnalysisStats
 * @property {number} count Analyses matching, ungraded ones included.
 * @property {?number} average Mean grade, null when nothing is graded.
 * @property {Array<{range: string, count: number}>} histogram Five 20-point buckets.
 * @property {Array<{day: string, average: number}>} per_day UTC days, oldest first.
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

/** `?a=1&b=2` from the defined values, '' when there are none. */
function queryString(params) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) query.set(key, value);
  }
  return query.size ? `?${query}` : '';
}

/**
 * Lists stored analyses, best fit first.
 *
 * @param {{limit?: number, offset?: number, minGrade?: number, sinceDays?: number}=} params
 *     `limit` 1-100 (API default 20), `minGrade` 0-100 (default 0),
 *     `sinceDays` 1-365 keeps only analyses made within that many days
 *     (default: all).
 * @param {Object=} options Request options, see `request` in client.js.
 * @return {Promise<Page<Analysis>>}
 */
export function listAnalyses({ limit, offset, minGrade, sinceDays } = {}, options) {
  return api.get(`/v1/me/analyses${queryString({
    limit, offset, min_grade: minGrade, since_days: sinceDays,
  })}`, options);
}

/**
 * Count, average, histogram and per-day average of the stored analyses,
 * computed server-side over the same filters as `listAnalyses`.
 *
 * @param {{minGrade?: number, sinceDays?: number}=} params
 * @param {Object=} options Request options, see `request` in client.js.
 * @return {Promise<AnalysisStats>}
 */
export function getAnalysisStats({ minGrade, sinceDays } = {}, options) {
  return api.get(`/v1/me/analyses/stats${queryString({
    min_grade: minGrade, since_days: sinceDays,
  })}`, options);
}

/**
 * Graded postings the user has no generated CV for yet, best fit first.
 *
 * @param {{minGrade?: number, limit?: number, offset?: number}=} params
 * @param {Object=} options Request options, see `request` in client.js.
 * @return {Promise<Page<Analysis>>}
 */
export function listAnalysesWithoutCv({ minGrade, limit, offset } = {}, options) {
  return api.get(`/v1/me/analyses/without-cv${queryString({
    min_grade: minGrade, limit, offset,
  })}`, options);
}

/**
 * Lists the ungraded postings matching the user's keywords and blacklist,
 * newest first: what `analyze` picks from.
 *
 * @param {number=} windowDays 1-30 (API default 1).
 * @param {{limit?: number, offset?: number}=} page
 * @param {Object=} options Request options, see `request` in client.js.
 * @return {Promise<Page<Candidate>>}
 */
export function listCandidates(windowDays, { limit, offset } = {}, options) {
  return api.get(`/v1/me/analyses/candidates${queryString({
    window_days: windowDays, limit, offset,
  })}`, { timeout: CANDIDATES_TIMEOUT_MS, ...options });
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

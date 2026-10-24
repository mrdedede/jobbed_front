/**
 * @file Application-tracking endpoints (/v1/me/applications).
 */

import { api } from '../client.js';

/**
 * @typedef {'cv_generated'|'applied'|'interviews'|'jobbed'|'rejected'} ApplicationStatus
 */

/**
 * @typedef {Object} Application A card on the board: a posting with a generated CV.
 * @property {string} job_id
 * @property {string} cv_id The newest CV generated for the posting.
 * @property {string} title
 * @property {string} company
 * @property {?string} place
 * @property {string} url The posting.
 * @property {?number} adequation_grade
 * @property {string} cv_created_at ISO 8601.
 * @property {ApplicationStatus} status
 * @property {?ApplicationStatus} rejected_from The stage a rejected card was at.
 * @property {?('no_reply'|'rejected'|'withdrew'|'other')} rejection_reason
 * @property {?string} feedback
 * @property {?string} updated_at ISO 8601; null while in 'cv_generated'.
 */

/**
 * Every card of the user's board, rejected ones included.
 *
 * @param {Object=} options Request options, see `request` in client.js.
 * @return {Promise<Application[]>}
 */
export function listApplications(options) {
  return api.get('/v1/me/applications', options);
}

/**
 * Moves a card. `rejection_reason` and `feedback` are only accepted with
 * status 'rejected'; any other status clears them.
 *
 * @param {string} jobId
 * @param {{status: ApplicationStatus, rejection_reason?: string, feedback?: string}} body
 * @param {Object=} options Request options, see `request` in client.js.
 * @return {Promise<Application>}
 * @throws {ApiError} 404 if the user has no CV for the posting, 422 on a bad body.
 */
export function updateApplication(jobId, body, options) {
  return api.put(`/v1/me/applications/${jobId}`, body, options);
}

import { t } from '../l10n.js';
/**
 * Turns an API failure into something the UI can switch on.
 * 409s differ only by their detail text, so this matches the exact strings the
 * backend sends (jobbed_back/api/routers/user.py).
 *
 * @param {ApiError} error
 * @param {{doing: string, thing: string}} labels How the failing action reads
 *     in messages, e.g. {doing: 'analysing', thing: 'analysis'}.
 * @return {{kind: string, message: string, retryAfter: ?number}}
 */
export function toStopReason(error, { doing, thing }) {
  const { status, detail, retryAfter = null } = error;
  if (status === 409) {
    if (detail === 'no active CV') {
      return { kind: 'no-cv', message: t('stop_no_cv', { doing }), retryAfter };
    }
    if (detail === 'no analysis for job') {
      return { kind: 'no-analysis', message: t('stop_no_analysis'), retryAfter };
    }
    if (/already running/.test(detail ?? '')) {
      return {
        kind: 'busy',
        message: t('stop_busy', { thing }),
        retryAfter,
      };
    }
    return { kind: 'error', message: detail, retryAfter };
  }
  if (status === 429) {
    return { kind: 'quota', message: t('stop_quota', { thing }), retryAfter };
  }
  if (status === 502) {
    return { kind: 'all-failed', message: t('stop_all_failed'), retryAfter };
  }
  if (status === 503 && detail === 'interrupted') {
    return { kind: 'interrupted', message: t('stop_interrupted', { thing }), retryAfter };
  }
  if (status === 0) return { kind: 'network', message: detail, retryAfter };
  return { kind: 'error', message: detail ?? error.message, retryAfter };
}

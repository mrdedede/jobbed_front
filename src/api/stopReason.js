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
      return { kind: 'no-cv', message: `You need an active CV before ${doing}.`, retryAfter };
    }
    if (detail === 'no analysis for job') {
      return { kind: 'no-analysis', message: 'This posting has no grade yet. Analyse it first.', retryAfter };
    }
    if (/already running/.test(detail ?? '')) {
      return {
        kind: 'busy',
        message: `Another ${thing} is still running for your account. It finishes on its own; this page updates when it does.`,
        retryAfter,
      };
    }
    return { kind: 'error', message: detail, retryAfter };
  }
  if (status === 429) {
    return { kind: 'quota', message: `Daily ${thing} limit reached.`, retryAfter };
  }
  if (status === 502) {
    return { kind: 'all-failed', message: `The AI model failed. Try again later.`, retryAfter };
  }
  if (status === 503 && detail === 'interrupted') {
    return { kind: 'interrupted', message: `The ${thing} was interrupted. Try again.`, retryAfter };
  }
  if (status === 0) return { kind: 'network', message: detail, retryAfter };
  return { kind: 'error', message: detail ?? error.message, retryAfter };
}

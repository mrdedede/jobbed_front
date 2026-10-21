/**
 * Turns an API failure into something the UI can switch on.
 * The two 409s differ only by their detail text, so this matches on it.
 *
 * @param {ApiError} error
 * @param {{doing: string, thing: string}} labels How the failing action reads
 *     in messages, e.g. {doing: 'analysing', thing: 'analysis'}.
 * @return {{kind: string, message: string, retryAfter: ?number}}
 */
export function toStopReason(error, { doing, thing }) {
  const { status, detail, retryAfter = null } = error;
  if (status === 409 && /cv/i.test(detail)) {
    return { kind: 'no-cv', message: `You need an active CV before ${doing}.`, retryAfter };
  }
  if (status === 409) {
    return { kind: 'busy', message: `A ${thing} is already running for your account.`, retryAfter };
  }
  if (status === 429) {
    return { kind: 'quota', message: `Daily ${thing} limit reached.`, retryAfter };
  }
  if (status === 502) {
    return { kind: 'all-failed', message: `The AI model failed. Try again later.`, retryAfter };
  }
  if (status === 0) return { kind: 'network', message: detail, retryAfter };
  return { kind: 'error', message: detail ?? error.message, retryAfter };
}

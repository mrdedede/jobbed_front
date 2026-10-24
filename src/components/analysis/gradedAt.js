/**
 * @file When a posting was (last) graded, for display.
 */

/**
 * `analysed_at` in the viewer's locale. Date and time: several runs a day are
 * common, and a re-grade moves the timestamp.
 *
 * @param {string} iso `analysed_at`, ISO 8601.
 * @return {string}
 */
export function formatGradedAt(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}

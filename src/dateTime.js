/**
 * @file Timestamps from the API, for display.
 */

/**
 * An API timestamp in the viewer's locale, date and time: several analysis
 * runs or generations a day are common, so the day alone is not enough.
 *
 * @param {string} iso ISO 8601, e.g. `analysed_at` or a generated CV's `created_at`.
 * @return {string}
 */
export function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}

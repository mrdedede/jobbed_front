/**
 * @file UI strings, looked up by ID from l10n/<locale>.json (jobbed_front/l10n).
 * English only for now; a second locale means picking the file by language.
 */

import en from '../l10n/en.json';

/**
 * The UI string `id`, with each `{name}` filled from `params`. A `{name}`
 * not in `params` stays as is (some strings show literal braces).
 *
 * @param {string} id
 * @param {Object<string, *>=} params
 * @return {string}
 * @throws {Error} On an unknown ID: a raw key on screen is a bug, so fail loud.
 */
export function t(id, params = {}) {
  const text = en[id];
  if (text === undefined) throw new Error(`Missing l10n id: ${id}`);
  return text.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
}

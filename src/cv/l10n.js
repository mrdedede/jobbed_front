import en from './l10n/values_en.json';
import es from './l10n/values_es.json';
import fr from './l10n/values_fr.json';
import pt from './l10n/values_pt.json';
import { t } from '../l10n.js';

const LOCALES = { en, es, fr, pt };
const DEFAULT_LOCALE = 'en';
const PLACEHOLDER = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

/**
 * Section titles and fixed words for a CV locale. Unknown codes fall back to
 * English (the column is free text server-side).
 *
 * @param {string} locale
 * @return {Object<string, string>}
 */
export function loadL10n(locale) {
  return LOCALES[locale] ?? LOCALES[DEFAULT_LOCALE];
}

/**
 * Replaces every `{KEY}` with its string, so a user writes
 * "{language_fr}, C1 - {LEVEL_FLUENT}" once and gets it in the posting's language.
 *
 * @param {string} text
 * @param {Object<string, string>} l10n
 * @return {string}
 * @throws {Error} Naming the unknown keys: a `{language_ja}` printed verbatim
 *     into a CV that goes to a recruiter is the failure worth being loud about.
 */
export function resolveKeys(text, l10n) {
  const unknown = [...text.matchAll(PLACEHOLDER)].map((m) => m[1]).filter((key) => !(key in l10n));
  if (unknown.length > 0) throw new Error(t('cv_unknown_locale_ids', { ids: unknown.join(', ') }));
  return text.replace(PLACEHOLDER, (_, key) => l10n[key]);
}

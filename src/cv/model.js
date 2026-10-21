import { loadL10n, resolveKeys } from './l10n.js';
import { sections } from './sections.js';

/**
 * @typedef {Object} Profile What only the user knows; never leaves the browser.
 * @property {string} name
 * @property {string} contact One line: email, phone, city, links.
 * @property {string[]} languages One line each; may use locale IDs, e.g.
 *     "{language_fr}, C1 - {LEVEL_FLUENT}". The model never writes this section.
 */

/**
 * @typedef {Object} CvDocument
 * @property {string} name
 * @property {string} contact
 * @property {string[][]} introduction
 * @property {{title: string, lines: string[][]}[]} sections
 */

/**
 * Everything both renderers need, in order, with headings in the CV's language.
 *
 * @param {GeneratedCv} generated
 * @param {Profile} profile
 * @return {CvDocument}
 * @throws {Error} If a language line names a locale ID that does not exist.
 */
export function buildDocument(generated, profile) {
  const l10n = loadL10n(generated.locale);
  const parts = sections(generated.cv);
  const languages = profile.languages
    .filter((line) => line.trim())
    .map((line) => ['', resolveKeys(line, l10n)]);

  return {
    name: profile.name,
    contact: profile.contact,
    introduction: parts.introduction,
    sections: [
      { title: l10n.PROFILE_TITLE, lines: parts.profile },
      { title: l10n.SKILLS_TITLE, lines: parts.skills },
      { title: l10n.EXPERIENCES_TITLE, lines: parts.experiences },
      { title: l10n.EDUCATION_TITLE, lines: parts.education },
      { title: l10n.LANGUAGES_TITLE, lines: languages },
    ].filter((section) => section.lines.length > 0),
  };
}

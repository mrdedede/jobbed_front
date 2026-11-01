/**
 * The generated CV as lines of text. Port of `sections()` in the back end's
 * cv_generator/docx_gen.py (kept in step by src/cv/cv.test.js), except that
 * only this one merges consecutive positions at one company.
 *
 * A line is `[bold, rest]`: the part set in bold, then the rest.
 */

/** Literal glyph, not a list: a parser reads it, a list style often renders as nothing. */
export const BULLET = '• ';

/** The longest break, in months, that still counts as one stay at a company. */
const MAX_GAP_MONTHS = 1;

const fold = (text) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Lowercase, accent-free month name to month index, in every CV language. */
const MONTHS = new Map(['en', 'es', 'fr', 'pt'].flatMap((locale) => {
  const format = new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' });
  return Array.from({ length: 12 }, (_, month) => [fold(format.format(Date.UTC(2000, month, 1))), month]);
}));

/** "March, 2022" or "março de 2022" as a month count; null for anything else. */
function toMonths(text) {
  const year = text.match(/\b(?:19|20)\d{2}\b/);
  const month = fold(text).match(/\p{L}+/gu)?.map((word) => MONTHS.get(word)).find((m) => m !== undefined);
  return year && month !== undefined ? Number(year[0]) * 12 + month : null;
}

/** A position's dates as month counts, or null if they can't be read. No digits and not blank: ongoing. */
function periodOf({ start_date: startText, end_date: endText }) {
  const start = toMonths(startText);
  let end = null;
  if (/\d/.test(endText)) end = toMonths(endText);
  else if (endText.trim()) end = Infinity;
  return start === null || end === null ? null : { start, end, startText, endText };
}

const sameCompany = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Merges each position into the group just before it when the company matches
 * and the dates run on. Never looks past a neighbour, so the editor's order is
 * what prints, and unreadable dates stay separate rather than merge by mistake.
 *
 * @param {Object[]} experiences
 * @return {{positions: Object[], span: ?Object}[]}
 */
function groupByCompany(experiences) {
  const groups = [];
  for (const position of experiences) {
    const period = periodOf(position);
    const group = groups.at(-1);
    const span = group?.span;
    const continues = span && period && sameCompany(group.positions[0].company, position.company)
      && Math.max(period.start, span.start) - Math.min(period.end, span.end) <= MAX_GAP_MONTHS;
    if (continues) {
      group.positions.push(position);
      if (period.start < span.start) Object.assign(span, { start: period.start, startText: period.startText });
      if (period.end > span.end) Object.assign(span, { end: period.end, endText: period.endText });
    } else {
      groups.push({ positions: [position], span: period });
    }
  }
  return groups;
}

const bulletLines = (position) => position.bullets.map((bullet) => ['', BULLET + bullet]);

function groupLines({ positions, span }) {
  const [first] = positions;
  if (positions.length === 1) {
    return [
      [`${first.role} - ${first.company}`, `, ${first.location} (${first.start_date} - ${first.end_date})`],
      ...bulletLines(first),
    ];
  }
  const oneLocation = positions.every((p) => p.location === first.location);
  return [
    [first.company, `${oneLocation ? `, ${first.location}` : ''} (${span.startText} - ${span.endText})`],
    ...positions.flatMap((p) => [
      [p.role, `${oneLocation ? '' : `, ${p.location}`} (${p.start_date} - ${p.end_date})`],
      ...bulletLines(p),
    ]),
  ];
}

/**
 * @param {Object} cv The `cv` object of a GeneratedCv (shape pinned by
 *     CV_SCHEMA in the back end's ai/cv_generation.py).
 * @return {{introduction: string[][], profile: string[][], skills: string[][],
 *     experiences: string[][], education: string[][]}}
 */
export function sections(cv) {
  const experiences = groupByCompany(cv.experiences).flatMap(groupLines);

  const education = cv.education.flatMap((e) => [
    [`${e.diploma} - ${e.institution}`, `, ${e.location} (${e.period})`],
    ['', e.degree],
    ...(e.details.trim() ? [['', e.details]] : []),
  ]);

  return {
    introduction: [['', cv.cv_introduction]],
    profile: [['', cv.profile_text]],
    skills: cv.skills.map((g) => [`${g.competence}: `, g.skills.join(', ')]),
    experiences,
    education,
  };
}

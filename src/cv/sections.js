/**
 * The generated CV as lines of text.
 *
 * A line is `[bold, rest]`: the part set in bold, then the rest.
 */

/** Literal glyph, not a list: a parser reads it, a list style often renders as nothing. */
export const BULLET = '• ';

const bulletLines = (position) => position.bullets.map((bullet) => ['', BULLET + bullet]);

/** One line per position, the same shape for each: parsers read a section best when it is uniform. */
const positionLines = (position) => [
  [`${position.role} - ${position.company}`, `, ${position.location} (${position.start_date} - ${position.end_date})`],
  ...bulletLines(position),
];

/** Name in bold, then whichever of issuer and year the CV gives. */
function certificationLine({ name, issuer, year }) {
  const by = issuer.trim() ? `, ${issuer}` : '';
  return [name, `${by}${year.trim() ? ` (${year})` : ''}`];
}

/**
 * @param {Object} cv The `cv` object of a GeneratedCv (shape pinned by
 *     CV_SCHEMA in the back end's ai/cv_generation.py).
 * @return {{introduction: string[][], profile: string[][], skills: string[][],
 *     experiences: string[][], education: string[][], certifications: string[][]}}
 */
export function sections(cv) {
  const education = cv.education.flatMap((e) => [
    [`${e.diploma} - ${e.institution}`, `, ${e.location} (${e.period})`],
    ['', e.degree],
    ...(e.details.trim() ? [['', e.details]] : []),
  ]);

  return {
    introduction: [['', cv.cv_introduction]],
    profile: [['', cv.profile_text]],
    skills: cv.skills.map((g) => [`${g.competence}: `, g.skills.join(', ')]),
    experiences: cv.experiences.flatMap(positionLines),
    education,
    // Absent from CVs generated before the field existed.
    certifications: (cv.certifications ?? []).map(certificationLine),
  };
}

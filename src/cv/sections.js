/**
 * The generated CV as lines of text. Port of `sections()` in the back end's
 * cv_generator/docx_gen.py (kept in step by src/cv/cv.test.js).
 *
 * A line is `[bold, rest]`: the part set in bold, then the rest.
 */

/** Literal glyph, not a list: a parser reads it, a list style often renders as nothing. */
export const BULLET = '• ';

/**
 * @param {Object} cv The `cv` object of a GeneratedCv (shape pinned by
 *     CV_SCHEMA in the back end's ai/cv_generation.py).
 * @return {{introduction: string[][], profile: string[][], skills: string[][],
 *     experiences: string[][], education: string[][]}}
 */
export function sections(cv) {
  const experiences = cv.experiences.flatMap((x) => [
    [`${x.role} - ${x.company}`, `, ${x.location} (${x.start_date} - ${x.end_date})`],
    ...x.bullets.map((bullet) => ['', BULLET + bullet]),
  ]);

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

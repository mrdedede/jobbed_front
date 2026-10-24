import {
  getLetterGeneration, listCoverLetters, startLetterGeneration,
} from '../api/endpoints/coverLetters.js';
import { useGeneration } from './useGenerateCv.js';
import { t } from '../l10n.js';

const LETTER_KIND = {
  start: ({ cvId, answers }, options) => startLetterGeneration(cvId, answers, options),
  poll: getLetterGeneration,
  list: listCoverLetters,
  labels: { doing: t('stop_labels_letter_doing'), thing: t('stop_labels_letter_thing') },
};

/**
 * Writes a cover letter from a generated CV and keeps the list of letters fresh.
 *
 * Example:
 *   const { generate, status, items } = useGenerateLetter();
 *   generate({ cvId: cv.cv_id, answers: { motivation: '...' } });
 *
 * @param {number=} page The 1-based page of letters to show.
 * @return {Object} See `useGeneration`.
 */
export function useGenerateLetter(page = 1) {
  return useGeneration(LETTER_KIND, page);
}

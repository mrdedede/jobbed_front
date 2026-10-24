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
 * @return {Object} See `useGeneration`.
 */
export function useGenerateLetter() {
  return useGeneration(LETTER_KIND);
}

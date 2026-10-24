import { t } from '../../l10n.js';

/** The questions the letter form asks; `key` is the API's `answers` field. */
export const QUESTIONS = [
  { key: 'motivation', label: t('cover_letter_q_motivation'), hint: t('cover_letter_q_motivation_hint') },
  { key: 'career_fit', label: t('cover_letter_q_career_fit'), hint: t('cover_letter_q_career_fit_hint') },
  { key: 'offer_fit', label: t('cover_letter_q_offer_fit'), hint: t('cover_letter_q_offer_fit_hint') },
];

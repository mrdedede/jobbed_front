import { Select } from '@mantine/core';
import { t } from '../../l10n.js';

const OPTIONS = [
  { value: '', label: t('ai_analysis_since_all') },
  { value: '1', label: t('ai_analysis_since_day') },
  { value: '7', label: t('ai_analysis_since_7') },
  { value: '30', label: t('ai_analysis_since_30') },
];

/**
 * How recent an analysis must be: all time, or the last 1, 7 or 30 days.
 *
 * @param {{value: (number|undefined), onChange: function((number|undefined)): void}} props
 *     `value` is the `sinceDays` the API takes, undefined for all time.
 */
export default function SinceSelect({ value, onChange }) {
  return (
    <Select label={t('ai_analysis_since_label')} data={OPTIONS} value={value ? String(value) : ''}
      allowDeselect={false} onChange={(days) => onChange(days ? Number(days) : undefined)} w={160} />
  );
}

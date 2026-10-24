import { BarChart, LineChart } from '@mantine/charts';
import { Group, Stack, Text, Title } from '@mantine/core';
import { t } from '../../l10n.js';

/**
 * Grade histogram and average grade per day, as computed by the server.
 *
 * @param {{stats: AnalysisStats}} props
 */
export default function GradeCharts({ stats }) {
  const { histogram, per_day: perDay, count } = stats;

  return (
    <Stack>
      <Group grow align="flex-start">
        <Stack gap="xs">
          <Title order={5}>{t('grade_charts_grades')}</Title>
          <BarChart h={220} data={histogram} dataKey="range" series={[{ name: 'count', label: t('grade_charts_series_count'), color: 'violet.6' }]} />
        </Stack>
        <Stack gap="xs">
          <Title order={5}>{t('grade_charts_average_per_day')}</Title>
          <LineChart h={220} data={perDay} dataKey="day" series={[{ name: 'average', label: t('grade_charts_series_average'), color: 'violet.6' }]}
            yAxisProps={{ domain: [0, 100] }} />
        </Stack>
      </Group>
      <Text size="xs" c="dimmed">
        {t('grade_charts_summary', {
          count,
          grades: histogram.map(({ range, count }) => `${range}: ${count}`).join(', '),
        })}
      </Text>
    </Stack>
  );
}

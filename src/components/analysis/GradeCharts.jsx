import { useMemo } from 'react';
import { BarChart, LineChart } from '@mantine/charts';
import { Group, Stack, Text, Title } from '@mantine/core';

const BUCKETS = ['0-19', '20-39', '40-59', '60-79', '80-100'];

/**
 * Grade histogram and average grade per day, from already-loaded analyses.
 *
 * @param {{analyses: Analysis[]}} props
 */
export default function GradeCharts({ analyses }) {
  const { histogram, perDay } = useMemo(() => {
    const counts = BUCKETS.map((range) => ({ range, count: 0 }));
    const days = new Map();
    for (const { adequation_grade: grade, analysed_at: at } of analyses) {
      if (grade == null) continue;
      counts[Math.min(Math.floor(grade / 20), 4)].count += 1;
      const day = at.slice(0, 10);
      const entry = days.get(day) ?? { sum: 0, n: 0 };
      days.set(day, { sum: entry.sum + grade, n: entry.n + 1 });
    }
    return {
      histogram: counts,
      perDay: [...days.entries()].sort(([a], [b]) => a.localeCompare(b))
        .map(([day, { sum, n }]) => ({ day, average: Math.round(sum / n) })),
    };
  }, [analyses]);

  return (
    <Stack>
      <Group grow align="flex-start">
        <Stack gap="xs">
          <Title order={5}>Grades</Title>
          <BarChart h={220} data={histogram} dataKey="range" series={[{ name: 'count', color: 'violet.6' }]} />
        </Stack>
        <Stack gap="xs">
          <Title order={5}>Average grade per day</Title>
          <LineChart h={220} data={perDay} dataKey="day" series={[{ name: 'average', color: 'violet.6' }]}
            yAxisProps={{ domain: [0, 100] }} />
        </Stack>
      </Group>
      <Text size="xs" c="dimmed">
        Based on the {analyses.length} analyses currently loaded (max 200). Grades:{' '}
        {histogram.map(({ range, count }) => `${range}: ${count}`).join(', ')}.
      </Text>
    </Stack>
  );
}

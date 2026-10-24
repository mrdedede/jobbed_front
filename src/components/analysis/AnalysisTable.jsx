import { useState } from 'react';
import { Anchor, Badge, Drawer, Stack, Table, Text, Typography } from '@mantine/core';
import ReactMarkdown from 'react-markdown';
import { t } from '../../l10n.js';
import { formatDateTime } from '../../dateTime.js';

function gradeColor(grade) {
  if (grade >= 80) return 'green';
  if (grade >= 60) return 'lime';
  if (grade >= 40) return 'yellow';
  return 'red';
}

export function GradeBadge({ grade }) {
  return grade == null
    ? <Badge color="gray" variant="light">{t('analysis_not_graded')}</Badge>
    : <Badge color={gradeColor(grade)}>{grade}</Badge>;
}

/**
 * Analyses table; clicking a row (or Enter / Space on it) opens the full
 * analysis in a drawer.
 *
 * @param {{analyses: Analysis[]}} props
 */
export default function AnalysisTable({ analyses }) {
  const [selected, setSelected] = useState(null);

  if (analyses.length === 0) return <Text c="dimmed">{t('analysis_no_match')}</Text>;

  return (
    <>
      <Table highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t('analysis_col_grade')}</Table.Th><Table.Th>{t('analysis_col_company')}</Table.Th>
            <Table.Th>{t('analysis_col_title')}</Table.Th><Table.Th>{t('analysis_col_place')}</Table.Th>
            <Table.Th>{t('analysis_col_graded')}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {analyses.map((analysis) => (
            <Table.Tr key={analysis.job_id} style={{ cursor: 'pointer' }}
              tabIndex={0} role="button"
              aria-label={t('analysis_row_label', { title: analysis.title, company: analysis.company })}
              onClick={() => setSelected(analysis)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                setSelected(analysis);
              }}>
              <Table.Td><GradeBadge grade={analysis.adequation_grade} /></Table.Td>
              <Table.Td>{analysis.company}</Table.Td>
              <Table.Td>{analysis.title}</Table.Td>
              <Table.Td>{analysis.place}</Table.Td>
              <Table.Td>{formatDateTime(analysis.analysed_at)}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Drawer opened={selected !== null} onClose={() => setSelected(null)} position="right" size="lg"
        title={selected && t('analysis_drawer_title', { title: selected.title, company: selected.company })}>
        {selected && (
          <Stack>
            <GradeBadge grade={selected.adequation_grade} />
            <Text size="sm" c="dimmed">{t('analysis_graded_at', { when: formatDateTime(selected.analysed_at) })}</Text>
            <Anchor href={selected.url} target="_blank" rel="noreferrer">{t('analysis_open_posting')}</Anchor>
            {selected.depth_analysis
              ? <Typography><ReactMarkdown>{selected.depth_analysis}</ReactMarkdown></Typography>
              : <Text c="dimmed">{t('analysis_no_details')}</Text>}
          </Stack>
        )}
      </Drawer>
    </>
  );
}

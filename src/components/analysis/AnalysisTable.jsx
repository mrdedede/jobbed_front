import { useState } from 'react';
import { Anchor, Badge, Drawer, Stack, Table, Text, Typography } from '@mantine/core';
import ReactMarkdown from 'react-markdown';

function gradeColor(grade) {
  if (grade >= 80) return 'green';
  if (grade >= 60) return 'lime';
  if (grade >= 40) return 'yellow';
  return 'red';
}

function GradeBadge({ grade }) {
  return grade == null
    ? <Badge color="gray" variant="light">not graded</Badge>
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

  if (analyses.length === 0) return <Text c="dimmed">No analyses match these filters.</Text>;

  return (
    <>
      <Table highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Grade</Table.Th><Table.Th>Company</Table.Th>
            <Table.Th>Title</Table.Th><Table.Th>Place</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {analyses.map((analysis) => (
            <Table.Tr key={analysis.job_id} style={{ cursor: 'pointer' }}
              tabIndex={0} role="button"
              aria-label={`Open the analysis of ${analysis.title} at ${analysis.company}`}
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
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Drawer opened={selected !== null} onClose={() => setSelected(null)} position="right" size="lg"
        title={selected && `${selected.title} - ${selected.company}`}>
        {selected && (
          <Stack>
            <GradeBadge grade={selected.adequation_grade} />
            <Anchor href={selected.url} target="_blank" rel="noreferrer">Open posting</Anchor>
            {selected.depth_analysis
              ? <Typography><ReactMarkdown>{selected.depth_analysis}</ReactMarkdown></Typography>
              : <Text c="dimmed">No detailed analysis.</Text>}
          </Stack>
        )}
      </Drawer>
    </>
  );
}

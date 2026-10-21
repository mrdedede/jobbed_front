import { useMemo } from 'react';
import {
  Alert, Anchor, Badge, Button, Group, List, Loader, Paper, SimpleGrid, Stack, Table, Text, Title,
  VisuallyHidden,
} from '@mantine/core';
import { Link } from 'react-router-dom';
import { getDueCount, listAnalyses } from '../../api/endpoints/analyses.js';
import { listCvs } from '../../api/endpoints/cvs.js';
import { listGeneratedCvs } from '../../api/endpoints/generatedCvs.js';
import { listKeywords } from '../../api/endpoints/keywords.js';
import GradeCharts from '../../components/analysis/GradeCharts.jsx';
import { useFetch } from '../../hooks/useFetch.js';

const WEEK = 7;
const TOP_GRADE = 70;
const TOP_COUNT = 5;

/**
 * One headline number. Loading and errors are per tile, so one slow or failed
 * endpoint does not hide the others.
 *
 * @param {{label: string, query: {loading: boolean, error: ?ApiError},
 *     value: ?(string|number), hint?: import('react').ReactNode}} props
 */
function StatTile({ label, query, value, hint }) {
  let body;
  if (query.error) body = <Text c="red" size="sm" role="alert">Failed to load</Text>;
  else if (query.loading && value == null) body = <Loader size="sm" aria-label={`Loading ${label}`} />;
  else body = <Text fz={32} fw={700} lh={1.1}>{value}</Text>;
  return (
    <Paper withBorder p="md">
      <Text size="sm" c="dimmed">{label}</Text>
      {body}
      {hint && <Text size="xs" c="dimmed" mt={4}>{hint}</Text>}
    </Paper>
  );
}

export default function Dashboard() {
  const due = useFetch((signal) => getDueCount(1, { signal }));
  const week = useFetch((signal) => listAnalyses({ sinceDays: WEEK, limit: 200 }, { signal }));
  const cvs = useFetch((signal) => listCvs({ signal }));
  const generated = useFetch((signal) => listGeneratedCvs({ signal }));
  const keywords = useFetch((signal) => listKeywords({ signal }));

  const analyses = useMemo(() => week.data ?? [], [week.data]);
  const graded = analyses.filter((a) => a.adequation_grade != null);
  const average = graded.length
    ? Math.round(graded.reduce((sum, a) => sum + a.adequation_grade, 0) / graded.length)
    : null;
  const top = useMemo(() => analyses
    .filter((a) => a.adequation_grade >= TOP_GRADE)
    .sort((a, b) => b.adequation_grade - a.adequation_grade || b.analysed_at.localeCompare(a.analysed_at))
    .slice(0, TOP_COUNT), [analyses]);

  const hasActiveCv = cvs.data?.some((cv) => cv.is_active);
  const setupSteps = [
    keywords.data?.length === 0 && { to: '/keywords', text: 'Add keywords, so analysis knows which postings to grade.' },
    cvs.data && !hasActiveCv && { to: '/cvs', text: 'Add or activate a CV; grading compares postings with it.' },
  ].filter(Boolean);

  return (
    <Stack maw={1000}>
      <Title order={2}>Dashboard</Title>

      {setupSteps.length > 0 && (
        <Alert color="yellow" title="Finish setting up">
          <List size="sm">
            {setupSteps.map((step) => (
              <List.Item key={step.to}>
                <Anchor component={Link} to={step.to}>{step.text}</Anchor>
              </List.Item>
            ))}
          </List>
        </Alert>
      )}

      <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }}>
        <StatTile label="Waiting to be graded" query={due} value={due.data?.due}
          hint={<Anchor component={Link} to="/ai-analysis" size="xs">Run analysis</Anchor>} />
        <StatTile label={`Graded, last ${WEEK} days`} query={week} value={week.data && analyses.length}
          hint={average != null && `Average grade ${average}`} />
        <StatTile label="Active CV" query={cvs} value={cvs.data && (hasActiveCv ? 'Yes' : 'No')}
          hint={cvs.data && `${cvs.data.length} saved`} />
        <StatTile label="Generated CVs" query={generated} value={generated.data?.length}
          hint={<Anchor component={Link} to="/cv-generation" size="xs">Open CV generation</Anchor>} />
      </SimpleGrid>

      <Title order={4}>Top matches this week</Title>
      {week.error ? <Text c="red" role="alert">Failed to load analyses.</Text>
        : week.loading && !week.data ? <Loader />
        : top.length === 0 ? <Text c="dimmed">No posting graded {TOP_GRADE}+ in the last {WEEK} days.</Text>
        : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Grade</Table.Th><Table.Th>Company</Table.Th><Table.Th>Posting</Table.Th>
                <Table.Th><VisuallyHidden>Actions</VisuallyHidden></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {top.map((a) => (
                <Table.Tr key={a.job_id}>
                  <Table.Td><Badge>{a.adequation_grade}</Badge></Table.Td>
                  <Table.Td>{a.company}</Table.Td>
                  <Table.Td>
                    <Anchor href={a.url} target="_blank" rel="noreferrer">{a.title}</Anchor>
                  </Table.Td>
                  <Table.Td>
                    <Group justify="flex-end">
                      <Button size="xs" variant="light" component={Link} to="/cv-generation"
                        state={{ jobId: a.job_id }}>Generate CV</Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}

      {analyses.length > 0 && (
        <>
          <Title order={4}>Last {WEEK} days</Title>
          <GradeCharts analyses={analyses} />
        </>
      )}
    </Stack>
  );
}

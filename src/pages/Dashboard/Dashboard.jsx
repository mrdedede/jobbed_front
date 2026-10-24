import { useMemo } from 'react';
import { BarChart } from '@mantine/charts';
import {
  Alert, Anchor, Badge, Button, Group, List, Loader, Paper, SimpleGrid, Stack, Table, Text, Title,
  VisuallyHidden,
} from '@mantine/core';
import { Link } from 'react-router-dom';
import { listAnalyses, listCandidates } from '../../api/endpoints/analyses.js';
import { listApplications } from '../../api/endpoints/applications.js';
import { listCvs } from '../../api/endpoints/cvs.js';
import { listGeneratedCvs } from '../../api/endpoints/generatedCvs.js';
import { listKeywords } from '../../api/endpoints/keywords.js';
import GradeCharts from '../../components/analysis/GradeCharts.jsx';
import { STAGES, funnel, stageLabel } from '../../hooks/useApplications.js';
import { useFetch } from '../../hooks/useFetch.js';
import { t } from '../../l10n.js';

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
  if (query.error) body = <Text c="red" size="sm" role="alert">{t('dashboard_tile_failed')}</Text>;
  else if (query.loading && value == null) body = <Loader size="sm" aria-label={t('dashboard_tile_loading', { label })} />;
  else body = <Text fz={32} fw={700} lh={1.1}>{value}</Text>;
  return (
    <Paper withBorder p="md">
      <Text size="sm" c="dimmed">{label}</Text>
      {body}
      {hint && <Text size="xs" c="dimmed" mt={4}>{hint}</Text>}
    </Paper>
  );
}

/**
 * How far applications got and where the rejected ones stopped.
 *
 * @param {{applications: Application[]}} props
 */
function ApplicationFunnel({ applications }) {
  const { reached, rejectedFrom } = useMemo(() => funnel(applications), [applications]);
  const data = STAGES.map((stage) => ({
    stage: stageLabel(stage),
    reached: reached[stage],
    rejected: rejectedFrom[stage] ?? 0,
  }));
  return (
    <>
      <Group justify="space-between">
        <Title order={4}>{t('dashboard_applications')}</Title>
        <Anchor component={Link} to="/applications" size="sm">{t('dashboard_open_applications')}</Anchor>
      </Group>
      <BarChart h={220} data={data} dataKey="stage" series={[
        { name: 'reached', label: t('dashboard_applications_reached'), color: 'violet.6' },
        { name: 'rejected', label: t('dashboard_applications_rejected'), color: 'red.6' },
      ]} withLegend />
      {reached.applied > 0 && (
        <Text size="sm" c="dimmed">
          {t('dashboard_applications_rate', {
            interviews: reached.interviews,
            applied: reached.applied,
            rate: Math.round((100 * reached.interviews) / reached.applied),
          })}
        </Text>
      )}
    </>
  );
}

export default function Dashboard() {
  const due = useFetch((signal) => listCandidates(1, { signal }));
  const week = useFetch((signal) => listAnalyses({ sinceDays: WEEK, limit: 200 }, { signal }));
  const cvs = useFetch((signal) => listCvs({ signal }));
  const generated = useFetch((signal) => listGeneratedCvs({ signal }));
  const keywords = useFetch((signal) => listKeywords({ signal }));
  const applications = useFetch((signal) => listApplications({ signal }));

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
    keywords.data?.length === 0 && { to: '/keywords', text: t('dashboard_setup_keywords') },
    cvs.data && !hasActiveCv && { to: '/cvs', text: t('dashboard_setup_cv') },
  ].filter(Boolean);

  return (
    <Stack maw={1000}>
      <Title order={2}>{t('dashboard_title')}</Title>

      {setupSteps.length > 0 && (
        <Alert color="yellow" title={t('dashboard_finish_setup')}>
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
        <StatTile label={t('dashboard_waiting')} query={due} value={due.data?.length}
          hint={<Anchor component={Link} to="/ai-analysis" size="xs">{t('dashboard_run_analysis')}</Anchor>} />
        <StatTile label={t('dashboard_graded_last_days', { days: WEEK })} query={week} value={week.data && analyses.length}
          hint={average != null && t('dashboard_average_grade', { average })} />
        <StatTile label={t('dashboard_active_cv')} query={cvs} value={cvs.data && (hasActiveCv ? t('dashboard_yes') : t('dashboard_no'))}
          hint={cvs.data && t('dashboard_saved_count', { count: cvs.data.length })} />
        <StatTile label={t('dashboard_generated_cvs')} query={generated} value={generated.data?.length}
          hint={<Anchor component={Link} to="/cv-generation" size="xs">{t('dashboard_open_cv_generation')}</Anchor>} />
      </SimpleGrid>

      <Title order={4}>{t('dashboard_top_matches')}</Title>
      {week.error ? <Text c="red" role="alert">{t('dashboard_failed_analyses')}</Text>
        : week.loading && !week.data ? <Loader />
        : top.length === 0 ? <Text c="dimmed">{t('dashboard_no_top', { grade: TOP_GRADE, days: WEEK })}</Text>
        : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('dashboard_col_grade')}</Table.Th><Table.Th>{t('dashboard_col_company')}</Table.Th>
                <Table.Th>{t('dashboard_col_posting')}</Table.Th>
                <Table.Th><VisuallyHidden>{t('dashboard_col_actions')}</VisuallyHidden></Table.Th>
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
                        state={{ jobId: a.job_id }}>{t('dashboard_generate_cv')}</Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}

      {applications.data?.length > 0 && <ApplicationFunnel applications={applications.data} />}

      {analyses.length > 0 && (
        <>
          <Title order={4}>{t('dashboard_last_days', { days: WEEK })}</Title>
          <GradeCharts analyses={analyses} />
        </>
      )}
    </Stack>
  );
}

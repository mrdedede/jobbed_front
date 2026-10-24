import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Badge, Button, Group, Loader, Stack, Table, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import JobDrawer from '../../components/JobDrawer.jsx';
import QueryState from '../../components/QueryState.jsx';
import StopAlert from '../../components/StopAlert.jsx';
import { formatGradedAt } from '../../components/analysis/gradedAt.js';
import CvProfileForm from '../../components/cv/CvProfileForm.jsx';
import GeneratedCvEditor from '../../components/cv/GeneratedCvEditor.jsx';
import { updateGeneratedCv } from '../../api/endpoints/generatedCvs.js';
import { useAnalyses } from '../../hooks/useAnalyses.js';
import { useGenerateCv } from '../../hooks/useGenerateCv.js';
import { cvFilename } from '../../cv/filename.js';
import { downloadBlob } from '../../cv/download.js';
import { buildDocument } from '../../cv/model.js';
import { printPdf } from '../../cv/toPdf.js';
import { t } from '../../l10n.js';

const MIN_GRADE = 50;

// The cell holding a row's buttons: its clicks must not open the row.
const stop = (event) => event.stopPropagation();

export default function CvGeneration() {
  const [details, setDetails] = useState({ profile: null, photo: null });
  const gen = useGenerateCv();
  const analysesQuery = useAnalyses({ minGrade: MIN_GRADE });
  const { analyses } = analysesQuery;
  const active = gen.status === 'starting' || gen.status === 'running';
  // `editing`: the GeneratedCv open in the editor, or null.
  const [editing, setEditing] = useState(null);
  // The posting last sent to Generate, until its CV shows up in the list.
  const [pendingJobId, setPendingJobId] = useState(null);
  // The posting shown in the drawer: an analysis or a generated CV, both carry the analysis.
  const [drawerJob, setDrawerJob] = useState(null);

  // Props that open a row's posting in the drawer, by click or Enter/Space.
  const openRow = (row) => ({
    style: { cursor: 'pointer' }, tabIndex: 0, role: 'button',
    'aria-label': t('analysis_row_label', { title: row.title, company: row.company }),
    onClick: () => setDrawerJob(row),
    onKeyDown: (event) => {
      if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return;
      event.preventDefault();
      setDrawerJob(row);
    },
  });

  useEffect(() => {
    if (gen.status === 'done') {
      notifications.show({ color: 'green', message: t('cv_generation_done') });
    }
  }, [gen.status]);

  // Open the new CV for review once the refetched list has it (the poll's
  // `cv` can be null, the list cannot).
  const fresh = gen.status === 'done' && gen.cvs.find((cv) => cv.job_id === pendingJobId);
  useEffect(() => {
    if (!fresh) return;
    // oxlint-disable-next-line react/set-state-in-effect -- reacts to the list refetch
    setEditing(fresh);
    setPendingJobId(null);
  }, [fresh]);

  const generate = (jobId) => {
    setPendingJobId(jobId);
    gen.generate(jobId);
  };

  const saveEdit = async (cv) => {
    await updateGeneratedCv(editing.cv_id, cv);
    gen.refetch();
    notifications.show({ color: 'green', message: t('cv_generation_saved') });
  };

  // Coming from the dashboard's "Generate CV": that posting goes first.
  const selectedJobId = useLocation().state?.jobId;
  const eligible = useMemo(() => {
    const done = new Set(gen.cvs.map((cv) => cv.job_id));
    const waiting = analyses.filter((a) => !done.has(a.job_id));
    const selected = waiting.filter((a) => a.job_id === selectedJobId);
    return [...selected, ...waiting.filter((a) => a.job_id !== selectedJobId)];
  }, [analyses, gen.cvs, selectedJobId]);

  const download = async (cv, kind) => {
    try {
      const doc = buildDocument(cv, details.profile);
      const parts = { name: doc.name, company: cv.company, title: cv.title };
      if (kind === 'docx') {
        // Loaded on demand: the docx library is most of the bundle.
        const { toDocx } = await import('../../cv/toDocx.js');
        downloadBlob(await toDocx(doc), cvFilename(parts, 'docx'));
      }
      else await printPdf(doc, details.photo);
    } catch (error) {
      notifications.show({ color: 'red', message: error.message });
    }
  };

  return (
    <Stack maw={1000}>
      <Title order={2}>{t('cv_generation_title')}</Title>
      <CvProfileForm onChange={(profile, photo) => setDetails({ profile, photo })} />

      {gen.stopReason && <StopAlert reason={gen.stopReason} />}
      {active && <Group><Loader size="sm" /><Text size="sm">{t('cv_generation_writing')}</Text></Group>}

      <Title order={4}>{t('cv_generation_generated_title')}</Title>
      <QueryState loading={gen.loading} error={gen.listError} hasData={gen.loaded}
        label={t('cv_generation_generated_label')} empty={gen.cvs.length === 0 && t('cv_generation_generated_empty')}>
        <Table highlightOnHover>
          <Table.Tbody>
            {gen.cvs.map((cv) => (
              <Table.Tr key={cv.cv_id} {...openRow(cv)}>
                <Table.Td><Badge>{cv.adequation_grade}</Badge></Table.Td>
                <Table.Td>{cv.company}</Table.Td>
                <Table.Td>{cv.title}</Table.Td>
                <Table.Td>{cv.locale}</Table.Td>
                <Table.Td onClick={stop}>
                  <Group gap="xs" justify="flex-end">
                    <Button size="xs" variant="default" onClick={() => setEditing(cv)}>{t('cv_generation_review')}</Button>
                    <Button size="xs" variant="default" component={Link} to="/cover-letters"
                      state={{ cvId: cv.cv_id }}>{t('cv_generation_cover_letter')}</Button>
                    <Button size="xs" variant="light" disabled={!details.profile?.name}
                      onClick={() => download(cv, 'docx')}>{t('cv_generation_word')}</Button>
                    <Button size="xs" variant="light" disabled={!details.profile?.name}
                      onClick={() => download(cv, 'pdf')}>{t('cv_generation_pdf')}</Button>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </QueryState>
      {gen.cvs.length > 0 && (
        <Text size="sm" c="dimmed">{t('cv_generation_ai_warning')}</Text>
      )}
      {gen.cvs.length > 0 && !details.profile?.name && (
        <Text size="sm" c="dimmed">{t('cv_generation_enter_name')}</Text>
      )}

      <Title order={4}>{t('cv_generation_postings_title', { grade: MIN_GRADE })}</Title>
      <QueryState loading={analysesQuery.loading} error={analysesQuery.error}
        hasData={analysesQuery.loaded} onRetry={analysesQuery.refetch} label={t('cv_generation_postings_label')}
        empty={eligible.length === 0 && t('cv_generation_postings_empty')}>
        <Table highlightOnHover>
          <Table.Tbody>
            {eligible.map((a) => (
              <Table.Tr key={a.job_id} bg={a.job_id === selectedJobId ? 'var(--mantine-primary-color-light)' : undefined}
                {...openRow(a)}>
                <Table.Td><Badge>{a.adequation_grade}</Badge></Table.Td>
                <Table.Td>{a.company}</Table.Td>
                <Table.Td>{a.title}</Table.Td>
                <Table.Td onClick={stop}>
                  <Text size="sm" c="dimmed">{t('analysis_graded_at', { when: formatGradedAt(a.analysed_at) })}</Text>
                </Table.Td>
                <Table.Td>
                  <Group justify="flex-end">
                    <Button size="xs" disabled={active} onClick={() => generate(a.job_id)}>
                      {t('cv_generation_generate')}
                    </Button>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </QueryState>

      <JobDrawer job={drawerJob} onClose={() => setDrawerJob(null)} />
      {editing && <GeneratedCvEditor generated={editing} onClose={() => setEditing(null)} onSave={saveEdit} />}
    </Stack>
  );
}

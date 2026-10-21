import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Badge, Button, Group, Loader, Stack, Table, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import QueryState from '../../components/QueryState.jsx';
import StopAlert from '../../components/StopAlert.jsx';
import CvProfileForm from '../../components/cv/CvProfileForm.jsx';
import GeneratedCvEditor from '../../components/cv/GeneratedCvEditor.jsx';
import { updateGeneratedCv } from '../../api/endpoints/generatedCvs.js';
import { useAnalyses } from '../../hooks/useAnalyses.js';
import { useGenerateCv } from '../../hooks/useGenerateCv.js';
import { cvFilename } from '../../cv/filename.js';
import { downloadBlob } from '../../cv/download.js';
import { buildDocument } from '../../cv/model.js';
import { printPdf } from '../../cv/toPdf.js';

const MIN_GRADE = 50;

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

  useEffect(() => {
    if (gen.status === 'done') {
      notifications.show({ color: 'green', message: 'CV generated, review it before downloading' });
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
    notifications.show({ color: 'green', message: 'CV saved' });
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
      <Title order={2}>CV generation</Title>
      <CvProfileForm onChange={(profile, photo) => setDetails({ profile, photo })} />

      {gen.stopReason && <StopAlert reason={gen.stopReason} />}
      {active && <Group><Loader size="sm" /><Text size="sm">Writing your CV, this can take a minute...</Text></Group>}

      <Title order={4}>Generated CVs</Title>
      <QueryState loading={gen.loading} error={gen.listError} hasData={gen.loaded}
        label="generated CVs" empty={gen.cvs.length === 0 && 'No CV generated yet.'}>
        <Table>
          <Table.Tbody>
            {gen.cvs.map((cv) => (
              <Table.Tr key={cv.cv_id}>
                <Table.Td><Badge>{cv.adequation_grade}</Badge></Table.Td>
                <Table.Td>{cv.company}</Table.Td>
                <Table.Td>{cv.title}</Table.Td>
                <Table.Td>{cv.locale}</Table.Td>
                <Table.Td>
                  <Group gap="xs" justify="flex-end">
                    <Button size="xs" variant="default" onClick={() => setEditing(cv)}>Review / edit</Button>
                    <Button size="xs" variant="light" disabled={!details.profile?.name}
                      onClick={() => download(cv, 'docx')}>Word</Button>
                    <Button size="xs" variant="light" disabled={!details.profile?.name}
                      onClick={() => download(cv, 'pdf')}>PDF</Button>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </QueryState>
      {gen.cvs.length > 0 && (
        <Text size="sm" c="dimmed">AI-generated CVs can contain mistakes. Review them before downloading.</Text>
      )}
      {gen.cvs.length > 0 && !details.profile?.name && (
        <Text size="sm" c="dimmed">Enter your name above to enable downloads.</Text>
      )}

      <Title order={4}>Postings without a CV (grade {MIN_GRADE}+)</Title>
      <QueryState loading={analysesQuery.loading} error={analysesQuery.error}
        hasData={analysesQuery.loaded} onRetry={analysesQuery.refetch} label="graded postings"
        empty={eligible.length === 0 && 'Nothing waiting. Grade more postings in AI analysis.'}>
        <Table highlightOnHover>
          <Table.Tbody>
            {eligible.map((a) => (
              <Table.Tr key={a.job_id} bg={a.job_id === selectedJobId ? 'var(--mantine-primary-color-light)' : undefined}>
                <Table.Td><Badge>{a.adequation_grade}</Badge></Table.Td>
                <Table.Td>{a.company}</Table.Td>
                <Table.Td>{a.title}</Table.Td>
                <Table.Td>
                  <Group justify="flex-end">
                    <Button size="xs" disabled={active} onClick={() => generate(a.job_id)}>
                      Generate
                    </Button>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </QueryState>

      {editing && <GeneratedCvEditor generated={editing} onClose={() => setEditing(null)} onSave={saveEdit} />}
    </Stack>
  );
}

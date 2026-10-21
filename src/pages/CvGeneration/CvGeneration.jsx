import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Group, Loader, Stack, Table, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import StopAlert from '../../components/StopAlert.jsx';
import CvProfileForm from '../../components/cv/CvProfileForm.jsx';
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
  const { analyses, loading: loadingAnalyses } = useAnalyses({ minGrade: MIN_GRADE });
  const active = gen.status === 'starting' || gen.status === 'running';

  useEffect(() => {
    if (gen.status === 'done') notifications.show({ color: 'green', message: 'CV generated' });
  }, [gen.status]);

  const eligible = useMemo(() => {
    const done = new Set(gen.cvs.map((cv) => cv.job_id));
    return analyses.filter((a) => !done.has(a.job_id));
  }, [analyses, gen.cvs]);

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
      {gen.listError && <Text c="red">Failed to load: {gen.listError.detail ?? gen.listError.message}</Text>}
      {gen.cvs.length === 0 ? <Text c="dimmed">No CV generated yet.</Text> : (
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
      )}
      {gen.cvs.length > 0 && !details.profile?.name && (
        <Text size="sm" c="dimmed">Enter your name above to enable downloads.</Text>
      )}

      <Title order={4}>Postings without a CV (grade {MIN_GRADE}+)</Title>
      {loadingAnalyses && eligible.length === 0 ? <Loader /> : eligible.length === 0 ? (
        <Text c="dimmed">Nothing waiting. Grade more postings in AI analysis.</Text>
      ) : (
        <Table highlightOnHover>
          <Table.Tbody>
            {eligible.map((a) => (
              <Table.Tr key={a.job_id}>
                <Table.Td><Badge>{a.adequation_grade}</Badge></Table.Td>
                <Table.Td>{a.company}</Table.Td>
                <Table.Td>{a.title}</Table.Td>
                <Table.Td>
                  <Group justify="flex-end">
                    <Button size="xs" disabled={active} onClick={() => gen.generate(a.job_id)}>
                      Generate
                    </Button>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Stack>
  );
}

import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Button, CopyButton, Group, Loader, Paper, Select, Stack, Table, Text, Textarea, Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import JobDrawer from '../../components/JobDrawer.jsx';
import QueryState from '../../components/QueryState.jsx';
import StopAlert from '../../components/StopAlert.jsx';
import CvProfileForm from '../../components/cv/CvProfileForm.jsx';
import CoverLetterEditor from '../../components/letter/CoverLetterEditor.jsx';
import { QUESTIONS } from '../../components/letter/questions.js';
import { updateCoverLetter } from '../../api/endpoints/coverLetters.js';
import { listGeneratedCvs } from '../../api/endpoints/generatedCvs.js';
import { useFetch } from '../../hooks/useFetch.js';
import { useGenerateLetter } from '../../hooks/useGenerateLetter.js';
import { downloadBlob } from '../../cv/download.js';
import { cvFilename } from '../../cv/filename.js';
import { t } from '../../l10n.js';

const NO_ANSWERS = Object.fromEntries(QUESTIONS.map(({ key }) => [key, '']));

export default function CoverLetters() {
  const [profile, setProfile] = useState(null);
  const gen = useGenerateLetter();
  const cvsQuery = useFetch((signal) => listGeneratedCvs({ signal }));
  const cvs = cvsQuery.data ?? [];
  const active = gen.status === 'starting' || gen.status === 'running';

  // Coming from CV generation's "Cover letter": that CV is preselected.
  const [cvId, setCvId] = useState(useLocation().state?.cvId ?? null);
  const [answers, setAnswers] = useState(NO_ANSWERS);
  const [editing, setEditing] = useState(null);
  // The job shown in the drawer: a letter or a generated CV, both carry the analysis.
  const [drawerJob, setDrawerJob] = useState(null);
  // How many letters existed when Generate was pressed, to spot the new one.
  const [pendingCount, setPendingCount] = useState(null);

  const picked = cvs.find((cv) => cv.cv_id === cvId) ?? null;

  useEffect(() => {
    if (gen.status === 'done') {
      notifications.show({ color: 'green', message: t('cover_letter_done') });
    }
  }, [gen.status]);

  // Open the new letter once the refetched list has it (newest first).
  const fresh = gen.status === 'done' && pendingCount !== null && gen.items.length > pendingCount
    ? gen.items[0] : null;
  useEffect(() => {
    if (!fresh) return;
    // oxlint-disable-next-line react/set-state-in-effect -- reacts to the list refetch
    setEditing(fresh);
    setPendingCount(null);
  }, [fresh]);

  const generate = () => {
    setPendingCount(gen.items.length);
    gen.generate({ cvId, answers });
  };

  const saveEdit = async (letter) => {
    await updateCoverLetter(editing.letter_id, letter);
    gen.refetch();
    notifications.show({ color: 'green', message: t('cover_letter_saved') });
  };

  const download = async (letter, kind) => {
    try {
      const parts = { name: `${profile.name} ${t('cover_letter_file')}`, company: letter.company, title: letter.title };
      // Loaded on demand: the docx library is most of the bundle.
      const { letterToDocx, printLetter } = await import('../../cv/letter.js');
      if (kind === 'docx') downloadBlob(await letterToDocx(letter.letter, profile), cvFilename(parts, 'docx'));
      else await printLetter(letter.letter, profile);
    } catch (error) {
      notifications.show({ color: 'red', message: error.message });
    }
  };

  const canDownload = Boolean(profile?.name);

  return (
    <Stack maw={1000}>
      <Title order={2}>{t('cover_letter_title')}</Title>
      <CvProfileForm onChange={(p) => setProfile(p)} />

      <Title order={4}>{t('cover_letter_write_title')}</Title>
      <QueryState loading={cvsQuery.loading} error={cvsQuery.error} hasData={cvsQuery.data !== null}
        onRetry={cvsQuery.refetch} label={t('cv_generation_generated_label')}
        empty={cvs.length === 0 && t('cover_letter_no_cvs')}>
        <Paper withBorder p="md">
          <Stack>
            <Group align="flex-end">
              <Select label={t('cover_letter_pick_cv')} placeholder={t('cover_letter_pick_cv_placeholder')}
                style={{ flex: 1 }} searchable value={cvId} onChange={setCvId}
                data={cvs.map((cv) => ({ value: cv.cv_id, label: `${cv.company} · ${cv.title} (${cv.locale})` }))} />
              <Button variant="default" disabled={!picked} onClick={() => setDrawerJob(picked)}>
                {t('cover_letter_job_details')}
              </Button>
            </Group>
            {QUESTIONS.map(({ key, label, hint }) => (
              <Textarea key={key} label={label} description={hint} autosize minRows={2} maxLength={2000}
                value={answers[key]}
                onChange={(event) => {
                  const { value } = event.currentTarget;
                  setAnswers((a) => ({ ...a, [key]: value }));
                }} />
            ))}
            <Group justify="flex-end">
              <Button disabled={!picked || active} onClick={generate}>{t('cover_letter_generate')}</Button>
            </Group>
          </Stack>
        </Paper>
      </QueryState>

      {gen.stopReason && <StopAlert reason={gen.stopReason} />}
      {active && <Group><Loader size="sm" /><Text size="sm">{t('cover_letter_writing')}</Text></Group>}

      <Title order={4}>{t('cover_letter_list_title')}</Title>
      <QueryState loading={gen.loading} error={gen.listError} hasData={gen.loaded}
        onRetry={gen.refetch} label={t('cover_letter_list_label')}
        empty={gen.items.length === 0 && t('cover_letter_list_empty')}>
        <Table>
          <Table.Tbody>
            {gen.items.map((letter) => (
              <Table.Tr key={letter.letter_id}>
                <Table.Td>{letter.company}</Table.Td>
                <Table.Td>{letter.title}</Table.Td>
                <Table.Td>{letter.locale}</Table.Td>
                <Table.Td>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(letter.created_at))}</Table.Td>
                <Table.Td>
                  <Group gap="xs" justify="flex-end">
                    <Button size="xs" variant="default" onClick={() => setEditing(letter)}>{t('cv_generation_review')}</Button>
                    <Button size="xs" variant="default" onClick={() => setDrawerJob(letter)}>{t('cover_letter_job_details')}</Button>
                    <CopyButton value={letter.letter}>
                      {({ copied, copy }) => (
                        <Button size="xs" variant="light" onClick={copy}>
                          {copied ? t('cover_letter_copied') : t('cover_letter_copy')}
                        </Button>
                      )}
                    </CopyButton>
                    <Button size="xs" variant="light" disabled={!canDownload}
                      onClick={() => download(letter, 'docx')}>{t('cv_generation_word')}</Button>
                    <Button size="xs" variant="light" disabled={!canDownload}
                      onClick={() => download(letter, 'pdf')}>{t('cv_generation_pdf')}</Button>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </QueryState>
      {gen.items.length > 0 && (
        <Text size="sm" c="dimmed">{t('cover_letter_ai_warning')}</Text>
      )}
      {gen.items.length > 0 && !canDownload && (
        <Text size="sm" c="dimmed">{t('cv_generation_enter_name')}</Text>
      )}

      {editing && <CoverLetterEditor letter={editing} onClose={() => setEditing(null)} onSave={saveEdit} />}
      <JobDrawer job={drawerJob} onClose={() => setDrawerJob(null)} />
    </Stack>
  );
}

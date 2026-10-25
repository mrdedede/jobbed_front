import { useCallback, useState } from 'react';
import { Alert, Badge, Button, Group, Modal, Paper, Stack, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import CvEditor from '../../components/CvEditor/CvEditor.jsx';
import InfoTip from '../../components/InfoTip.jsx';
import QueryState from '../../components/QueryState.jsx';
import SuggestTermsModal from '../../components/cv/SuggestTermsModal.jsx';
import { MAX_CVS, useCvs } from '../../hooks/useCvs.js';
import { t } from '../../l10n.js';

const PREVIEW_CHARS = 200;

function preview(markdown) {
  const flat = markdown.replace(/\s+/g, ' ').trim();
  return flat.length > PREVIEW_CHARS ? `${flat.slice(0, PREVIEW_CHARS)}…` : flat;
}

export default function Cvs() {
  const { cvs, loaded, loading, error, refetch, create, update, activate, remove } = useCvs();
  // `editor`: null (closed), 'new', or the CV being edited.
  const [editor, setEditor] = useState(null);
  const [deleting, setDeleting] = useState(null);
  // Id of the CV just created, while its term suggestions are on screen.
  const [suggestFor, setSuggestFor] = useState(null);
  const closeSuggestions = useCallback(() => setSuggestFor(null), []);

  const notifyFailure = (caught) =>
    notifications.show({ color: 'red', title: t('common_request_failed'), message: caught.message });

  const handleActivate = (cv) => activate(cv.id).catch(notifyFailure);

  const handleDelete = () => {
    const cv = deleting;
    setDeleting(null);
    remove(cv.id).catch(notifyFailure);
  };

  const atLimit = cvs.length >= MAX_CVS;

  return (
    <Stack maw={720}>
      <Group justify="space-between">
        <Group gap={4}>
          <Title order={2}>{t('cvs_title')}</Title>
          <InfoTip label={t('cvs_title')}>{t('help_cvs')}</InfoTip>
        </Group>
        <Group>
          <Badge variant="light" color={atLimit ? 'red' : 'violet'}>{cvs.length} / {MAX_CVS}</Badge>
          <Button disabled={atLimit} onClick={() => setEditor('new')}>{t('cvs_new')}</Button>
        </Group>
      </Group>

      {atLimit && <Text size="sm" c="red">{t('cvs_limit_reached', { max: MAX_CVS })}</Text>}
      {cvs.length > 0 && !cvs.some((cv) => cv.is_active) && (
        <Alert color="yellow">{t('cvs_no_active')}</Alert>
      )}
      <QueryState loading={loading} error={error} hasData={loaded}
        onRetry={refetch} label={t('cvs_query_label')} empty={cvs.length === 0 && t('cvs_empty')}>
      {cvs.map((cv) => (
        <Paper key={cv.id} withBorder p="md" opacity={cv.pending ? 0.5 : 1}>
          <Stack gap="xs">
            <Group justify="space-between">
              {cv.is_active
                ? <Badge color="green">{t('cvs_active')}</Badge>
                : <Button size="xs" variant="light" disabled={cv.pending}
                    onClick={() => handleActivate(cv)}>{t('cvs_activate')}</Button>}
              <Text size="xs" c="dimmed">{t('cvs_characters', { count: cv.content_md.length })}</Text>
            </Group>
            <Text size="sm" style={{ overflowWrap: 'anywhere' }}>{preview(cv.content_md)}</Text>
            <Group justify="flex-end" gap="xs">
              <Button size="xs" variant="subtle" disabled={cv.pending}
                onClick={() => setEditor(cv)}>{t('common_edit')}</Button>
              <Button size="xs" variant="subtle" color="red" disabled={cv.pending}
                onClick={() => setDeleting(cv)}>{t('common_delete')}</Button>
            </Group>
          </Stack>
        </Paper>
      ))}
      </QueryState>

      {editor && (
        <CvEditor
          cv={editor === 'new' ? null : editor}
          onClose={() => setEditor(null)}
          onSave={(markdown, makeActive) => (editor === 'new'
            ? create(markdown, makeActive).then((created) => setSuggestFor(created.id))
            : update(editor.id, markdown))}
        />
      )}

      {suggestFor && <SuggestTermsModal cvId={suggestFor} onClose={closeSuggestions} />}

      <Modal opened={deleting !== null} onClose={() => setDeleting(null)} title={t('cvs_delete_title')} centered>
        <Stack>
          <Text>
            {t('cvs_delete_message')}
            {deleting?.is_active && t('cvs_delete_active_warning')}
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleting(null)}>{t('common_cancel')}</Button>
            <Button color="red" onClick={handleDelete}>{t('common_delete')}</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

import { useState } from 'react';
import { Alert, Badge, Button, Group, Modal, Paper, Stack, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import CvEditor from '../../components/CvEditor/CvEditor.jsx';
import QueryState from '../../components/QueryState.jsx';
import { MAX_CVS, useCvs } from '../../hooks/useCvs.js';

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

  const notifyFailure = (caught) =>
    notifications.show({ color: 'red', title: 'Request failed', message: caught.message });

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
        <Title order={2}>CVs</Title>
        <Group>
          <Badge variant="light" color={atLimit ? 'red' : 'violet'}>{cvs.length} / {MAX_CVS}</Badge>
          <Button disabled={atLimit} onClick={() => setEditor('new')}>New CV</Button>
        </Group>
      </Group>

      {cvs.length > 0 && !cvs.some((cv) => cv.is_active) && (
        <Alert color="yellow">Analysis needs an active CV. Activate one below.</Alert>
      )}
      <QueryState loading={loading} error={error} hasData={loaded}
        onRetry={refetch} label="CVs" empty={cvs.length === 0 && 'No CVs yet.'}>
      {cvs.map((cv) => (
        <Paper key={cv.id} withBorder p="md" opacity={cv.pending ? 0.5 : 1}>
          <Stack gap="xs">
            <Group justify="space-between">
              {cv.is_active
                ? <Badge color="green">Active</Badge>
                : <Button size="xs" variant="light" disabled={cv.pending}
                    onClick={() => handleActivate(cv)}>Activate</Button>}
              <Text size="xs" c="dimmed">{cv.content_md.length} characters</Text>
            </Group>
            <Text size="sm" style={{ overflowWrap: 'anywhere' }}>{preview(cv.content_md)}</Text>
            <Group justify="flex-end" gap="xs">
              <Button size="xs" variant="subtle" disabled={cv.pending}
                onClick={() => setEditor(cv)}>Edit</Button>
              <Button size="xs" variant="subtle" color="red" disabled={cv.pending}
                onClick={() => setDeleting(cv)}>Delete</Button>
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
            ? create(markdown, makeActive)
            : update(editor.id, markdown))}
        />
      )}

      <Modal opened={deleting !== null} onClose={() => setDeleting(null)} title="Delete CV?" centered>
        <Stack>
          <Text>
            This cannot be undone.
            {deleting?.is_active && ' This is your active CV: analysis will have no CV until you activate another.'}
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button color="red" onClick={handleDelete}>Delete</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

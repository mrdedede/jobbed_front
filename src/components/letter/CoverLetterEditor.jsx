import { useState } from 'react';
import {
  Alert, Badge, Button, CopyButton, Group, Modal, Stack, Text, Textarea,
} from '@mantine/core';
import JobDrawer from '../JobDrawer.jsx';
import { QUESTIONS } from './questions.js';
import { t } from '../../l10n.js';

/**
 * Modal to review and correct an AI-written cover letter. Mount it only while
 * open; its draft starts from `letter.letter` every time it mounts.
 *
 * @param {{letter: CoverLetter, onClose: function(): void,
 *     onSave: function(string): Promise<void>}} props `onSave` gets the edited
 *     text and should throw an Error to keep the editor open.
 */
export default function CoverLetterEditor({ letter, onClose, onSave }) {
  const [text, setText] = useState(letter.letter);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showJob, setShowJob] = useState(false);

  const dirty = text !== letter.letter;

  const close = () => {
    if (!dirty || window.confirm(t('cv_editor_discard'))) onClose();
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(text);
      onClose();
    } catch (caught) {
      setError(caught.message);
    } finally {
      setSaving(false);
    }
  };

  const answered = QUESTIONS.filter(({ key }) => letter.answers?.[key]);

  return (
    <Modal opened onClose={close} size="xl"
      title={<Group gap="xs">{t('cover_letter_review_title', { company: letter.company, title: letter.title })}<Badge>{letter.locale}</Badge></Group>}>
      <Stack>
        <Alert color="yellow">{t('cover_letter_review_ai_warning')}</Alert>
        <Group>
          <Button variant="default" size="xs" onClick={() => setShowJob(true)}>{t('cover_letter_job_details')}</Button>
        </Group>

        {answered.length > 0 && (
          <Stack gap={4}>
            {answered.map(({ key, label }) => (
              <Text key={key} size="sm"><b>{label}</b> {letter.answers[key]}</Text>
            ))}
          </Stack>
        )}

        <Textarea label={t('cover_letter_text')} autosize minRows={14} value={text}
          onChange={(event) => setText(event.currentTarget.value)} />

        {error && <Alert color="red">{error}</Alert>}
        <Group justify="flex-end">
          {!dirty && <Text size="xs" c="dimmed">{t('cv_review_no_changes')}</Text>}
          <CopyButton value={text}>
            {({ copied, copy }) => (
              <Button variant="light" onClick={copy}>{copied ? t('cover_letter_copied') : t('cover_letter_copy')}</Button>
            )}
          </CopyButton>
          <Button variant="default" onClick={close}>{t('common_cancel')}</Button>
          <Button loading={saving} disabled={!text.trim()} onClick={save}>{t('common_save')}</Button>
        </Group>
      </Stack>
      <JobDrawer job={showJob ? letter : null} onClose={() => setShowJob(false)} />
    </Modal>
  );
}

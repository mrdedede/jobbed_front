import { useState } from 'react';
import { Alert, Button, Checkbox, Group, Modal, Stack, Tabs, Text, Textarea, Typography } from '@mantine/core';
import ReactMarkdown from 'react-markdown';
import { CV_MAX_LENGTH } from '../../hooks/useCvs.js';
import { t } from '../../l10n.js';

/**
 * Modal to write a CV in Markdown, with a rendered preview tab. Mount it only
 * while open; its draft starts from `cv` every time it mounts.
 *
 * @param {{cv: ?{content_md: string}, onClose: function(): void,
 *     onSave: function(string, boolean): Promise<void>}} props `cv` is null
 *     when creating. `onSave` should throw an Error to keep the editor open.
 */
export default function CvEditor({ cv, onClose, onSave }) {
  const [draft, setDraft] = useState(cv?.content_md ?? '');
  const [makeActive, setMakeActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const dirty = draft !== (cv?.content_md ?? '');
  const tooLong = draft.length > CV_MAX_LENGTH;

  const close = () => {
    if (!dirty || window.confirm(t('cv_editor_discard'))) onClose();
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(draft, makeActive);
      onClose();
    } catch (caught) {
      setError(caught.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal opened onClose={close} size="xl" title={cv ? t('cv_editor_edit_title') : t('cv_editor_new_title')}>
      <Stack>
        <Tabs defaultValue="write">
          <Tabs.List>
            <Tabs.Tab value="write">{t('cv_editor_write')}</Tabs.Tab>
            <Tabs.Tab value="preview">{t('cv_editor_preview')}</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="write" pt="sm">
            <Textarea autosize minRows={12} maxRows={24} autoFocus value={draft}
              placeholder={t('cv_editor_placeholder')}
              styles={{ input: { fontFamily: 'monospace' } }}
              onChange={(event) => setDraft(event.currentTarget.value)} />
          </Tabs.Panel>
          <Tabs.Panel value="preview" pt="sm">
            {draft.trim()
              ? <Typography><ReactMarkdown>{draft}</ReactMarkdown></Typography>
              : <Text c="dimmed">{t('cv_editor_nothing_to_preview')}</Text>}
          </Tabs.Panel>
        </Tabs>

        <Text size="xs" c={tooLong ? 'red' : 'dimmed'} ta="right">
          {draft.length} / {CV_MAX_LENGTH}
        </Text>
        {error && <Alert color="red">{error}</Alert>}

        <Group justify="space-between">
          {cv
            ? <span />
            : <Checkbox label={t('cv_editor_make_active')} checked={makeActive}
                onChange={(event) => setMakeActive(event.currentTarget.checked)} />}
          <Group>
            <Button variant="default" onClick={close}>{t('common_cancel')}</Button>
            <Button loading={saving} disabled={!draft.trim() || tooLong} onClick={save}>{t('common_save')}</Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}

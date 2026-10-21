import { useState } from 'react';
import {
  ActionIcon, Alert, Badge, Button, Group, Modal, Paper, Stack, Text, TextInput, Textarea, Title,
} from '@mantine/core';

const EXPERIENCE_FIELDS = [
  ['role', 'Role'], ['company', 'Company'], ['location', 'Location'],
  ['start_date', 'Start'], ['end_date', 'End'],
];
const EDUCATION_FIELDS = [
  ['diploma', 'Diploma'], ['institution', 'Institution'], ['location', 'Location'],
  ['period', 'Period'], ['degree', 'Degree'], ['details', 'Details'],
];

/** The CV with its string lists as editable text: bullets one per line, skills comma-separated. */
function toForm(cv) {
  return {
    ...cv,
    skills: cv.skills.map((g) => ({ ...g, skills: g.skills.join(', ') })),
    experiences: cv.experiences.map((x) => ({ ...x, bullets: x.bullets.join('\n') })),
  };
}

const splitOn = (text, separator) => text.split(separator).map((s) => s.trim()).filter(Boolean);

/** Back to the stored shape; blank bullets and skills are dropped. */
function fromForm(form) {
  return {
    ...form,
    skills: form.skills.map((g) => ({ ...g, skills: splitOn(g.skills, ',') })),
    experiences: form.experiences.map((x) => ({ ...x, bullets: splitOn(x.bullets, '\n') })),
  };
}

function RemoveButton({ label, onClick }) {
  return (
    <ActionIcon variant="subtle" color="red" aria-label={label} onClick={onClick}>×</ActionIcon>
  );
}

/**
 * Modal to review and correct an AI-generated CV. Mount it only while open;
 * its draft starts from `generated.cv` every time it mounts.
 *
 * @param {{generated: GeneratedCv, onClose: function(): void,
 *     onSave: function(Object): Promise<void>}} props `onSave` gets the edited
 *     `cv` and should throw an Error to keep the editor open.
 */
export default function GeneratedCvEditor({ generated, onClose, onSave }) {
  const [initial] = useState(() => toForm(generated.cv));
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const close = () => {
    if (!dirty || window.confirm('Discard your unsaved changes?')) onClose();
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(fromForm(form));
      onClose();
    } catch (caught) {
      setError(caught.message);
    } finally {
      setSaving(false);
    }
  };

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setItem = (list, index, key, value) => setForm((f) => ({
    ...f, [list]: f[list].map((item, i) => (i === index ? { ...item, [key]: value } : item)),
  }));
  const removeItem = (list, index) => setForm((f) => ({
    ...f, [list]: f[list].filter((_, i) => i !== index),
  }));
  const input = (list, index, key, label, item) => (
    <TextInput key={key} label={label} value={item[key]}
      onChange={(event) => setItem(list, index, key, event.currentTarget.value)} />
  );

  return (
    <Modal opened onClose={close} size="xl"
      title={<Group gap="xs">{`Review CV: ${generated.company}, ${generated.title}`}<Badge>{generated.locale}</Badge></Group>}>
      <Stack>
        <Alert color="yellow">
          This CV was written by AI. Check names, employers, dates and claims before downloading.
        </Alert>

        <TextInput label="Introduction" value={form.cv_introduction}
          onChange={(event) => set('cv_introduction', event.currentTarget.value)} />
        <Textarea label="Profile" autosize minRows={3} value={form.profile_text}
          onChange={(event) => set('profile_text', event.currentTarget.value)} />

        <Title order={5}>Skills</Title>
        {form.skills.map((group, i) => (
          <Group key={i} align="flex-end" wrap="nowrap">
            <TextInput label="Competence" value={group.competence} w="30%"
              onChange={(event) => setItem('skills', i, 'competence', event.currentTarget.value)} />
            <TextInput label="Skills (comma-separated)" value={group.skills} style={{ flex: 1 }}
              onChange={(event) => setItem('skills', i, 'skills', event.currentTarget.value)} />
            <RemoveButton label={`Remove skill group ${i + 1}`} onClick={() => removeItem('skills', i)} />
          </Group>
        ))}

        <Title order={5}>Experiences</Title>
        {form.experiences.map((experience, i) => (
          <Paper key={i} withBorder p="sm">
            <Stack gap="xs">
              <Group justify="flex-end">
                <RemoveButton label={`Remove experience ${i + 1}`} onClick={() => removeItem('experiences', i)} />
              </Group>
              {EXPERIENCE_FIELDS.map(([key, label]) => input('experiences', i, key, label, experience))}
              <Textarea label="Bullets (one per line)" autosize minRows={2} value={experience.bullets}
                onChange={(event) => setItem('experiences', i, 'bullets', event.currentTarget.value)} />
            </Stack>
          </Paper>
        ))}

        <Title order={5}>Education</Title>
        {form.education.map((education, i) => (
          <Paper key={i} withBorder p="sm">
            <Stack gap="xs">
              <Group justify="flex-end">
                <RemoveButton label={`Remove education ${i + 1}`} onClick={() => removeItem('education', i)} />
              </Group>
              {EDUCATION_FIELDS.map(([key, label]) => input('education', i, key, label, education))}
            </Stack>
          </Paper>
        ))}

        {error && <Alert color="red">{error}</Alert>}
        <Group justify="flex-end">
          {!dirty && <Text size="xs" c="dimmed">No changes</Text>}
          <Button variant="default" onClick={close}>Cancel</Button>
          <Button loading={saving} onClick={save}>Save</Button>
        </Group>
      </Stack>
    </Modal>
  );
}

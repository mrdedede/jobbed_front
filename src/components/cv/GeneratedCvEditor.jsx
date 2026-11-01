import { useState } from 'react';
import { flushSync } from 'react-dom';
import {
  ActionIcon, Alert, Badge, Button, Group, Modal, Paper, Stack, Text, TextInput, Textarea, Title,
} from '@mantine/core';
import JobDrawer from '../JobDrawer.jsx';
import { t } from '../../l10n.js';

const EXPERIENCE_FIELDS = [
  ['role', t('cv_review_role')], ['company', t('cv_review_company')], ['location', t('cv_review_location')],
  ['start_date', t('cv_review_start')], ['end_date', t('cv_review_end')],
];
const EDUCATION_FIELDS = [
  ['diploma', t('cv_review_diploma')], ['institution', t('cv_review_institution')],
  ['location', t('cv_review_location')], ['period', t('cv_review_period')],
  ['degree', t('cv_review_degree')], ['details', t('cv_review_details')],
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

/** Back to the stored shape; blank bullets and skills, and groups left with no skills, are dropped. */
function fromForm(form) {
  return {
    ...form,
    skills: form.skills.map((g) => ({ ...g, skills: splitOn(g.skills, ',') })).filter((g) => g.skills.length > 0),
    experiences: form.experiences.map((x) => ({ ...x, bullets: splitOn(x.bullets, '\n') })),
  };
}

function RemoveButton({ label, onClick }) {
  return (
    <ActionIcon variant="subtle" color="red" aria-label={label} onClick={onClick}>×</ActionIcon>
  );
}

const moveButtonId = (list, index, direction) => `cv-move-${list}-${index}-${direction}`;

function MoveButtons({ list, index, count, upLabel, downLabel, onMove }) {
  return (
    <>
      <ActionIcon id={moveButtonId(list, index, 'up')} variant="subtle" aria-label={upLabel}
        disabled={index === 0} onClick={() => onMove(list, index, -1)}>↑</ActionIcon>
      <ActionIcon id={moveButtonId(list, index, 'down')} variant="subtle" aria-label={downLabel}
        disabled={index === count - 1} onClick={() => onMove(list, index, 1)}>↓</ActionIcon>
    </>
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
  const [showJob, setShowJob] = useState(false);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const close = () => {
    if (!dirty || window.confirm(t('cv_editor_discard'))) onClose();
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
  const moveItem = (list, index, delta) => {
    const target = index + delta;
    flushSync(() => setForm((f) => {
      const items = [...f[list]];
      [items[index], items[target]] = [items[target], items[index]];
      return { ...f, [list]: items };
    }));
    // Rows are keyed by index, so focus stays put while the item moves: follow
    // the item, or a second key press would move its neighbour back.
    const [same, other] = delta < 0 ? ['up', 'down'] : ['down', 'up'];
    const button = document.getElementById(moveButtonId(list, target, same));
    (button.disabled ? document.getElementById(moveButtonId(list, target, other)) : button).focus();
  };
  const addSkillGroup = () => set('skills', [...form.skills, { competence: '', skills: '' }]);
  const input = (list, index, key, label, item) => (
    <TextInput key={key} label={label} value={item[key]}
      onChange={(event) => setItem(list, index, key, event.currentTarget.value)} />
  );

  return (
    <Modal opened onClose={close} size="xl"
      title={<Group gap="xs">{t('cv_review_title', { company: generated.company, title: generated.title })}<Badge>{generated.locale}</Badge></Group>}>
      <Stack>
        <Alert color="yellow">
          {t('cv_review_ai_warning')}
        </Alert>
        <Group>
          <Button variant="default" size="xs" onClick={() => setShowJob(true)}>{t('cover_letter_job_details')}</Button>
        </Group>

        <TextInput label={t('cv_review_introduction')} value={form.cv_introduction}
          onChange={(event) => set('cv_introduction', event.currentTarget.value)} />
        <Textarea label={t('cv_review_profile')} autosize minRows={3} value={form.profile_text}
          onChange={(event) => set('profile_text', event.currentTarget.value)} />

        <Title order={5}>{t('cv_review_skills')}</Title>
        {form.skills.map((group, i) => (
          <Group key={i} align="flex-end" wrap="nowrap">
            <TextInput label={t('cv_review_competence')} value={group.competence} w="30%"
              onChange={(event) => setItem('skills', i, 'competence', event.currentTarget.value)} />
            <TextInput label={t('cv_review_skills_list')} value={group.skills} style={{ flex: 1 }}
              onChange={(event) => setItem('skills', i, 'skills', event.currentTarget.value)} />
            <MoveButtons list="skills" index={i} count={form.skills.length} onMove={moveItem}
              upLabel={t('cv_review_move_skill_group_up', { n: i + 1 })}
              downLabel={t('cv_review_move_skill_group_down', { n: i + 1 })} />
            <RemoveButton label={t('cv_review_remove_skill_group', { n: i + 1 })} onClick={() => removeItem('skills', i)} />
          </Group>
        ))}
        <Group>
          <Button variant="default" size="xs" onClick={addSkillGroup}>{t('cv_review_add_skill_group')}</Button>
        </Group>

        <Title order={5}>{t('cv_review_experiences')}</Title>
        {form.experiences.map((experience, i) => (
          <Paper key={i} withBorder p="sm">
            <Stack gap="xs">
              <Group justify="flex-end" gap="xs">
                <MoveButtons list="experiences" index={i} count={form.experiences.length} onMove={moveItem}
                  upLabel={t('cv_review_move_experience_up', { n: i + 1 })}
                  downLabel={t('cv_review_move_experience_down', { n: i + 1 })} />
                <RemoveButton label={t('cv_review_remove_experience', { n: i + 1 })} onClick={() => removeItem('experiences', i)} />
              </Group>
              {EXPERIENCE_FIELDS.map(([key, label]) => input('experiences', i, key, label, experience))}
              <Textarea label={t('cv_review_bullets')} autosize minRows={2} value={experience.bullets}
                onChange={(event) => setItem('experiences', i, 'bullets', event.currentTarget.value)} />
            </Stack>
          </Paper>
        ))}

        <Title order={5}>{t('cv_review_education')}</Title>
        {form.education.map((education, i) => (
          <Paper key={i} withBorder p="sm">
            <Stack gap="xs">
              <Group justify="flex-end">
                <RemoveButton label={t('cv_review_remove_education', { n: i + 1 })} onClick={() => removeItem('education', i)} />
              </Group>
              {EDUCATION_FIELDS.map(([key, label]) => input('education', i, key, label, education))}
            </Stack>
          </Paper>
        ))}

        {error && <Alert color="red">{error}</Alert>}
        <Group justify="flex-end">
          {!dirty && <Text size="xs" c="dimmed">{t('cv_review_no_changes')}</Text>}
          <Button variant="default" onClick={close}>{t('common_cancel')}</Button>
          <Button loading={saving} onClick={save}>{t('common_save')}</Button>
        </Group>
      </Stack>
      <JobDrawer job={showJob ? generated : null} onClose={() => setShowJob(false)} />
    </Modal>
  );
}

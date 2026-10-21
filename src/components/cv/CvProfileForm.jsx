import { useEffect, useState } from 'react';
import { Button, FileInput, Group, Image, Paper, Stack, Text, TextInput, Textarea, Title } from '@mantine/core';
import { useCallbackRef } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  downscalePhoto, loadPhoto, loadProfile, saveProfile, savePhoto,
} from '../../cv/profileStore.js';
import { t } from '../../l10n.js';

/**
 * The details only the user knows. Everything here stays in this browser.
 *
 * @param {{onChange: function(Profile, ?Blob): void}} props Called on load and
 *     after every save, with the profile and the photo.
 */
export default function CvProfileForm({ onChange }) {
  const [profile, setProfile] = useState(loadProfile);
  const [photo, setPhoto] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  // Controlled, so "Remove" also clears the file name shown in the input.
  const [file, setFile] = useState(null);

  useEffect(() => {
    loadPhoto().then(setPhoto);
  }, []);

  // An effect, not useMemo: the object URL must be revoked, and StrictMode's
  // double-run would revoke a memoized one while it is still shown.
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- tied to the URL's lifetime
    if (!photo) return setPhotoUrl(null);
    const url = URL.createObjectURL(photo);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  // Only profile and photo changes are news; a new onChange identity is not.
  const latestOnChange = useCallbackRef(onChange);
  useEffect(() => {
    latestOnChange(profile, photo);
  }, [profile, photo, latestOnChange]);

  const update = (patch) => {
    const next = { ...profile, ...patch };
    setProfile(next);
    saveProfile(next);
  };

  const pick = async (picked) => {
    setFile(picked);
    try {
      const small = picked ? await downscalePhoto(picked) : null;
      await savePhoto(small);
      setPhoto(small);
    } catch (error) {
      notifications.show({ color: 'red', message: error.message });
    }
  };

  return (
    <Paper withBorder p="md">
      <Stack>
        <Title order={4}>{t('cv_profile_title')}</Title>
        <Text size="sm" c="dimmed">
          {t('cv_profile_storage_note')}
        </Text>
        <Group align="flex-start" grow>
          <TextInput label={t('cv_profile_name')} value={profile.name}
            onChange={(e) => update({ name: e.currentTarget.value })} />
          <TextInput label={t('cv_profile_contact')} placeholder={t('cv_profile_contact_placeholder')}
            value={profile.contact} onChange={(e) => update({ contact: e.currentTarget.value })} />
        </Group>
        <Textarea label={t('cv_profile_languages')} autosize minRows={2}
          description={t('cv_profile_languages_hint')}
          value={profile.languages.join('\n')}
          onChange={(e) => update({ languages: e.currentTarget.value.split('\n') })} />
        <Group align="flex-end">
          <FileInput label={t('cv_profile_photo')} accept="image/*" clearable w={260}
            value={file} onChange={pick} placeholder={photo ? t('cv_profile_replace_photo') : t('cv_profile_choose_photo')} />
          {photoUrl && <Image src={photoUrl} w={56} h={56} radius="xl" fit="cover" alt={t('cv_profile_photo_alt')} />}
          {photo && <Button variant="subtle" color="red" onClick={() => pick(null)}>{t('cv_profile_remove_photo')}</Button>}
        </Group>
      </Stack>
    </Paper>
  );
}

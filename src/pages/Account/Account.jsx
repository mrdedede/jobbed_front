import { useState } from 'react';
import { Button, Group, Modal, Paper, PasswordInput, Stack, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { logout } from '../../auth/AuthContext.jsx';
import { validatePassword } from '../../auth/validation.js';
import { useOutletContext } from 'react-router-dom';
import { changePassword, deleteMe } from '../../api/endpoints/me.js';
import QueryState from '../../components/QueryState.jsx';
import { useMutation } from '../../hooks/useMutation.js';
import { t } from '../../l10n.js';

export default function Account() {
  const { meQuery } = useOutletContext();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { run: submitPassword, loading: changing, error: changeError } = useMutation(changePassword);
  const { run: removeAccount, loading: deleting } = useMutation(deleteMe);

  const handleChangePassword = async (event) => {
    event.preventDefault();
    const nextErrors = {
      current: currentPassword ? null : t('account_enter_current_password'),
      next: validatePassword(newPassword)
        ?? (newPassword === currentPassword ? t('account_password_must_differ') : null),
      confirm: confirmPassword === newPassword ? null : t('validation_passwords_mismatch'),
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    const result = await submitPassword({
      current_password: currentPassword,
      new_password: newPassword,
    });
    if (result === undefined) return;
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    notifications.show({ color: 'green', message: t('account_password_changed') });
  };

  const handleDelete = async () => {
    const result = await removeAccount();
    if (result !== undefined) logout();
  };

  const wrongCurrent = changeError?.status === 401 ? changeError.detail : null;

  return (
    <Stack maw={480}>
      <Title order={2}>{t('account_title')}</Title>
      <QueryState loading={meQuery.loading} error={meQuery.error} hasData={meQuery.data !== null}
        onRetry={meQuery.refetch} label={t('account_query_label')}>
        <Text>{meQuery.data?.email}</Text>
      </QueryState>

      <Paper withBorder p="md" component="form" noValidate onSubmit={handleChangePassword}>
        <Stack>
          <Title order={4}>{t('account_change_password')}</Title>
          <PasswordInput label={t('account_current_password')} value={currentPassword}
            error={errors.current ?? wrongCurrent}
            onChange={(event) => setCurrentPassword(event.currentTarget.value)} />
          <PasswordInput label={t('account_new_password')} value={newPassword} error={errors.next}
            onChange={(event) => setNewPassword(event.currentTarget.value)} />
          <PasswordInput label={t('account_confirm_new_password')} value={confirmPassword} error={errors.confirm}
            onChange={(event) => setConfirmPassword(event.currentTarget.value)} />
          <Button type="submit" loading={changing}>{t('account_change_password')}</Button>
        </Stack>
      </Paper>

      <Paper withBorder p="md">
        <Stack>
          <Title order={4} c="red">{t('account_delete_title')}</Title>
          <Text size="sm">{t('account_delete_description')}</Text>
          <Button color="red" variant="outline" onClick={() => setConfirmingDelete(true)}>
            {t('account_delete_title')}
          </Button>
        </Stack>
      </Paper>

      <Modal opened={confirmingDelete} onClose={() => setConfirmingDelete(false)}
        title={t('account_delete_confirm_title')} centered>
        <Stack>
          <Text>{t('account_delete_confirm_message')}</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirmingDelete(false)}>{t('common_cancel')}</Button>
            <Button color="red" loading={deleting} onClick={handleDelete}>{t('account_delete_title')}</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

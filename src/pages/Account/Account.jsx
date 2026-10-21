import { useState } from 'react';
import { Button, Group, Modal, Paper, PasswordInput, Stack, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { logout } from '../../auth/AuthContext.jsx';
import { validatePassword } from '../../auth/validation.js';
import { useOutletContext } from 'react-router-dom';
import { changePassword, deleteMe } from '../../api/endpoints/me.js';
import QueryState from '../../components/QueryState.jsx';
import { useMutation } from '../../hooks/useMutation.js';

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
      current: currentPassword ? null : 'Enter your current password',
      next: validatePassword(newPassword)
        ?? (newPassword === currentPassword ? 'New password must differ from the current one' : null),
      confirm: confirmPassword === newPassword ? null : 'Passwords do not match',
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
    notifications.show({ color: 'green', message: 'Password changed' });
  };

  const handleDelete = async () => {
    const result = await removeAccount();
    if (result !== undefined) logout();
  };

  const wrongCurrent = changeError?.status === 401 ? changeError.detail : null;

  return (
    <Stack maw={480}>
      <Title order={2}>Account</Title>
      <QueryState loading={meQuery.loading} error={meQuery.error} hasData={meQuery.data !== null}
        onRetry={meQuery.refetch} label="your account">
        <Text>{meQuery.data?.email}</Text>
      </QueryState>

      <Paper withBorder p="md" component="form" noValidate onSubmit={handleChangePassword}>
        <Stack>
          <Title order={4}>Change password</Title>
          <PasswordInput label="Current password" value={currentPassword}
            error={errors.current ?? wrongCurrent}
            onChange={(event) => setCurrentPassword(event.currentTarget.value)} />
          <PasswordInput label="New password" value={newPassword} error={errors.next}
            onChange={(event) => setNewPassword(event.currentTarget.value)} />
          <PasswordInput label="Confirm new password" value={confirmPassword} error={errors.confirm}
            onChange={(event) => setConfirmPassword(event.currentTarget.value)} />
          <Button type="submit" loading={changing}>Change password</Button>
        </Stack>
      </Paper>

      <Paper withBorder p="md">
        <Stack>
          <Title order={4} c="red">Delete account</Title>
          <Text size="sm">Permanently deletes your account and all of its data.</Text>
          <Button color="red" variant="outline" onClick={() => setConfirmingDelete(true)}>
            Delete account
          </Button>
        </Stack>
      </Paper>

      <Modal opened={confirmingDelete} onClose={() => setConfirmingDelete(false)}
        title="Delete account?" centered>
        <Stack>
          <Text>This cannot be undone. All your data will be erased.</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirmingDelete(false)}>Cancel</Button>
            <Button color="red" loading={deleting} onClick={handleDelete}>Delete account</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

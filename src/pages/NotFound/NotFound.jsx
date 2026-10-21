import { Button, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router-dom';
import { t } from '../../l10n.js';

export default function NotFound() {
  return (
    <Stack align="center" mt="xl">
      <Title order={1}>{t('not_found_title')}</Title>
      <Text c="dimmed">{t('not_found_message')}</Text>
      <Button component={Link} to="/">{t('not_found_back')}</Button>
    </Stack>
  );
}

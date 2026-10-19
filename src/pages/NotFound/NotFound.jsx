import { Button, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <Stack align="center" mt="xl">
      <Title order={1}>404</Title>
      <Text c="dimmed">This page does not exist.</Text>
      <Button component={Link} to="/">Back to dashboard</Button>
    </Stack>
  );
}

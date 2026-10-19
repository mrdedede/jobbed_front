import { Title, Text } from '@mantine/core';

export default function Dashboard() {
  return (
    <>
      <Title order={2}>Dashboard</Title>
      <Text c="dimmed" mt="sm">Summary metrics, discovery-strategy chart, and last-run status will go here.</Text>
    </>
  );
}

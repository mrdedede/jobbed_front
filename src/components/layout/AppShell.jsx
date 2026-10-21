import { AppShell as MantineAppShell, Burger, Group, Menu, Button, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { logout } from '../../auth/AuthContext.jsx';
import { getMe } from '../../api/endpoints/me.js';
import { useFetch } from '../../hooks/useFetch.js';
import ErrorBoundary from '../ErrorBoundary.jsx';
import NavLinks from './NavLinks.jsx';

export default function AppShell() {
  const [opened, { toggle }] = useDisclosure();
  const { pathname } = useLocation();
  const { data: me } = useFetch((signal) => getMe({ signal }));

  return (
    <MantineAppShell
      header={{ height: 60 }}
      navbar={{ width: 240, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <MantineAppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Title order={3}>Joblister</Title>
          </Group>

          <Menu position="bottom-end">
            <Menu.Target>
              <Button variant="subtle">{me?.email ?? 'Account'}</Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item component={Link} to="/account">Account</Menu.Item>
              <Menu.Item color="red" onClick={logout}>Log out</Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </MantineAppShell.Header>

      <MantineAppShell.Navbar p="md">
        <NavLinks />
      </MantineAppShell.Navbar>

      <MantineAppShell.Main>
        <ErrorBoundary key={pathname}>
          <Outlet />
        </ErrorBoundary>
      </MantineAppShell.Main>
    </MantineAppShell>
  );
}

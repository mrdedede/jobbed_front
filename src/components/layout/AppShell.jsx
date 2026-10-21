import { Suspense, useEffect } from 'react';
import { AppShell as MantineAppShell, Burger, Group, Loader, Menu, Button, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { logout } from '../../auth/AuthContext.jsx';
import { getMe } from '../../api/endpoints/me.js';
import { useFetch } from '../../hooks/useFetch.js';
import { navRoutes, otherRoutes } from '../../routes.jsx';
import ErrorBoundary from '../ErrorBoundary.jsx';
import NavLinks from './NavLinks.jsx';

export default function AppShell() {
  const [opened, { toggle, close }] = useDisclosure();
  const { pathname } = useLocation();

  const pageLabel = [...navRoutes, ...otherRoutes].find((route) => route.path === pathname)?.label;
  useEffect(() => {
    document.title = pageLabel ? `${pageLabel} · Joblister` : 'Joblister';
  }, [pageLabel]);
  // Shared with pages through the outlet context (see Account), fetched once.
  const meQuery = useFetch((signal) => getMe({ signal }));
  const me = meQuery.data;

  return (
    <MantineAppShell
      header={{ height: 60 }}
      navbar={{ width: 240, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <MantineAppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm"
              aria-label={opened ? 'Close navigation' : 'Open navigation'} />
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
        <NavLinks onNavigate={close} />
      </MantineAppShell.Navbar>

      <MantineAppShell.Main>
        <ErrorBoundary key={pathname}>
          <Suspense fallback={<Loader aria-label="Loading page" />}>
            <Outlet context={{ meQuery }} />
          </Suspense>
        </ErrorBoundary>
      </MantineAppShell.Main>
    </MantineAppShell>
  );
}

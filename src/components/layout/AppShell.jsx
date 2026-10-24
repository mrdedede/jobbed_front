import { Suspense, useEffect, useRef } from 'react';
import { AppShell as MantineAppShell, Burger, Group, Loader, Menu, Button, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { logout } from '../../auth/AuthContext.jsx';
import { getMe } from '../../api/endpoints/me.js';
import { useFetch } from '../../hooks/useFetch.js';
import { navRoutes, otherRoutes } from '../../routes.jsx';
import ErrorBoundary from '../ErrorBoundary.jsx';
import NavLinks from './NavLinks.jsx';
import { t } from '../../l10n.js';

export default function AppShell() {
  const [opened, { toggle, close }] = useDisclosure();
  const { pathname } = useLocation();

  const pageLabel = [...navRoutes, ...otherRoutes].find((route) => route.path === pathname)?.label;
  useEffect(() => {
    document.title = pageLabel ? t('app_page_title', { page: pageLabel }) : t('app_name');
  }, [pageLabel]);

  // After a navigation, move focus to the new page so screen readers start
  // there; not on the first render (or StrictMode's re-run of it), where it
  // would steal the browser's focus.
  const mainRef = useRef(null);
  const shownPath = useRef(pathname);
  useEffect(() => {
    if (shownPath.current !== pathname) mainRef.current?.focus({ preventScroll: true });
    shownPath.current = pathname;
  }, [pathname]);
  // Shared with pages through the outlet context (see Account), fetched once.
  const meQuery = useFetch((signal) => getMe({ signal }));
  const me = meQuery.data;

  return (
    <MantineAppShell
      header={{ height: 60 }}
      navbar={{ width: 240, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <a href="#main" className="skip-link">{t('shell_skip_to_content')}</a>
      <MantineAppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm"
              aria-label={opened ? t('shell_close_navigation') : t('shell_open_navigation')} />
            <Title order={3}>{t('app_name')}</Title>
          </Group>

          <Menu position="bottom-end">
            <Menu.Target>
              <Button variant="subtle">{me?.email ?? t('shell_account')}</Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item component={Link} to="/account">{t('shell_account')}</Menu.Item>
              <Menu.Item color="red" onClick={logout}>{t('shell_log_out')}</Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </MantineAppShell.Header>

      <MantineAppShell.Navbar p="md">
        <NavLinks onNavigate={close} />
      </MantineAppShell.Navbar>

      <MantineAppShell.Main id="main" ref={mainRef} tabIndex={-1} style={{ outline: 'none' }}>
        <ErrorBoundary key={pathname}>
          <Suspense fallback={<Loader aria-label={t('shell_loading_page')} />}>
            <Outlet context={{ meQuery }} />
          </Suspense>
        </ErrorBoundary>
      </MantineAppShell.Main>
    </MantineAppShell>
  );
}

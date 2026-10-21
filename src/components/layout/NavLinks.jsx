import { NavLink } from '@mantine/core';
import { NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import { navRoutes } from '../../routes.jsx';

/** @param {{onNavigate?: function(): void}} props Called after a link is picked. */
export default function NavLinks({ onNavigate }) {
  const { pathname } = useLocation();

  return (
    <>
      {navRoutes.map((route) => (
        <NavLink
          key={route.path}
          component={RouterNavLink}
          to={route.path}
          label={route.label}
          active={pathname === route.path}
          onClick={onNavigate}
        />
      ))}
    </>
  );
}

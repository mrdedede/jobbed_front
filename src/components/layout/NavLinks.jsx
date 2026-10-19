import { NavLink } from '@mantine/core';
import { NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import { navRoutes } from '../../routes.jsx';

export default function NavLinks() {
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
        />
      ))}
    </>
  );
}

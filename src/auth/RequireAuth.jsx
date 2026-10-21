import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

/**
 * Layout route: renders the nested routes (<Outlet />) only when a token is
 * present, otherwise redirects to /login, remembering where the user was heading.
 *
 * @return {import('react').ReactNode}
 */
export default function RequireAuth() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppShell from './components/layout/AppShell.jsx';
import { navRoutes } from './routes.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          {navRoutes.map((route) => (
            <Route key={route.path} path={route.path} element={route.element} />
          ))}
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}

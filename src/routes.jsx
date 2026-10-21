import { lazy } from 'react';

// One chunk per page: a visit loads only the pages it opens.
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard.jsx'));
const Keywords = lazy(() => import('./pages/Keywords/Keywords.jsx'));
const Blacklist = lazy(() => import('./pages/Blacklist/Blacklist.jsx'));
const Cvs = lazy(() => import('./pages/Cvs/Cvs.jsx'));
const AiAnalysis = lazy(() => import('./pages/AiAnalysis/AiAnalysis.jsx'));
const CvGeneration = lazy(() => import('./pages/CvGeneration/CvGeneration.jsx'));
const Account = lazy(() => import('./pages/Account/Account.jsx'));

export const navRoutes = [
  { path: '/', label: 'Dashboard', element: <Dashboard /> },
  { path: '/keywords', label: 'Keywords', element: <Keywords /> },
  { path: '/blacklist', label: 'Blacklist', element: <Blacklist /> },
  { path: '/cvs', label: 'CVs', element: <Cvs /> },
  { path: '/ai-analysis', label: 'AI analysis', element: <AiAnalysis /> },
  { path: '/cv-generation', label: 'CV generation', element: <CvGeneration /> },
];

/** Routed pages that are not in the sidebar. */
export const otherRoutes = [
  { path: '/account', label: 'Account', element: <Account /> },
];

import { lazy } from 'react';

// One chunk per page: a visit loads only the pages it opens. `Page` is created
// inline (not as a top-level const) so this module exports only data.
export const navRoutes = [
  { path: '/', label: 'Dashboard', Page: lazy(() => import('./pages/Dashboard/Dashboard.jsx')) },
  { path: '/keywords', label: 'Keywords', Page: lazy(() => import('./pages/Keywords/Keywords.jsx')) },
  { path: '/blacklist', label: 'Blacklist', Page: lazy(() => import('./pages/Blacklist/Blacklist.jsx')) },
  { path: '/cvs', label: 'CVs', Page: lazy(() => import('./pages/Cvs/Cvs.jsx')) },
  { path: '/ai-analysis', label: 'AI analysis', Page: lazy(() => import('./pages/AiAnalysis/AiAnalysis.jsx')) },
  { path: '/cv-generation', label: 'CV generation', Page: lazy(() => import('./pages/CvGeneration/CvGeneration.jsx')) },
];

/** Routed pages that are not in the sidebar. */
export const otherRoutes = [
  { path: '/account', label: 'Account', Page: lazy(() => import('./pages/Account/Account.jsx')) },
];

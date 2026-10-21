import { lazy } from 'react';
import { t } from './l10n.js';

// One chunk per page: a visit loads only the pages it opens. `Page` is created
// inline (not as a top-level const) so this module exports only data.
export const navRoutes = [
  { path: '/', label: t('nav_dashboard'), Page: lazy(() => import('./pages/Dashboard/Dashboard.jsx')) },
  { path: '/keywords', label: t('nav_keywords'), Page: lazy(() => import('./pages/Keywords/Keywords.jsx')) },
  { path: '/blacklist', label: t('nav_blacklist'), Page: lazy(() => import('./pages/Blacklist/Blacklist.jsx')) },
  { path: '/cvs', label: t('nav_cvs'), Page: lazy(() => import('./pages/Cvs/Cvs.jsx')) },
  { path: '/ai-analysis', label: t('nav_ai_analysis'), Page: lazy(() => import('./pages/AiAnalysis/AiAnalysis.jsx')) },
  { path: '/cv-generation', label: t('nav_cv_generation'), Page: lazy(() => import('./pages/CvGeneration/CvGeneration.jsx')) },
];

/** Routed pages that are not in the sidebar. */
export const otherRoutes = [
  { path: '/account', label: t('nav_account'), Page: lazy(() => import('./pages/Account/Account.jsx')) },
];

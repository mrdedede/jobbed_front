import Dashboard from './pages/Dashboard/Dashboard.jsx';
import Keywords from './pages/Keywords/Keywords.jsx';
import Blacklist from './pages/Blacklist/Blacklist.jsx';
import Cvs from './pages/Cvs/Cvs.jsx';
import AiAnalysis from './pages/AiAnalysis/AiAnalysis.jsx';
import CvGeneration from './pages/CvGeneration/CvGeneration.jsx';

export const navRoutes = [
  { path: '/', label: 'Dashboard', element: <Dashboard /> },
  { path: '/keywords', label: 'Keywords', element: <Keywords /> },
  { path: '/blacklist', label: 'Blacklist', element: <Blacklist /> },
  { path: '/cvs', label: 'CVs', element: <Cvs /> },
  { path: '/ai-analysis', label: 'AI analysis', element: <AiAnalysis /> },
  { path: '/cv-generation', label: 'CV generation', element: <CvGeneration /> },
];

import Dashboard from './pages/Dashboard/Dashboard.jsx';
import Keywords from './pages/Keywords/Keywords.jsx';
import Blacklist from './pages/Blacklist/Blacklist.jsx';
import BoardsNoJobs from './pages/BoardsNoJobs/BoardsNoJobs.jsx';
import ScrapeBoards from './pages/ScrapeBoards/ScrapeBoards.jsx';
import ScrapeJobs from './pages/ScrapeJobs/ScrapeJobs.jsx';
import AiAnalysis from './pages/AiAnalysis/AiAnalysis.jsx';
import CvGeneration from './pages/CvGeneration/CvGeneration.jsx';

export const navRoutes = [
  { path: '/', label: 'Dashboard', element: <Dashboard /> },
  { path: '/keywords', label: 'Keywords', element: <Keywords /> },
  { path: '/blacklist', label: 'Blacklist', element: <Blacklist /> },
  { path: '/boards-no-jobs', label: 'Boards without jobs', element: <BoardsNoJobs /> },
  { path: '/scrape-boards', label: 'Scrape boards', element: <ScrapeBoards /> },
  { path: '/scrape-jobs', label: 'Scrape jobs', element: <ScrapeJobs /> },
  { path: '/ai-analysis', label: 'AI analysis', element: <AiAnalysis /> },
  { path: '/cv-generation', label: 'CV generation', element: <CvGeneration /> },
];

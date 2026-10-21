import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from './context/auth.jsx';
import { LeadEditorProvider } from './context/leadEditor.jsx';
import { AppShell } from './components/layout/AppShell.jsx';
import Login from './pages/Login.jsx';

const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Pipeline = lazy(() => import('./pages/Pipeline.jsx'));
const Leads = lazy(() => import('./pages/Leads.jsx'));
const LeadDetail = lazy(() => import('./pages/LeadDetail.jsx'));
const Tasks = lazy(() => import('./pages/Tasks.jsx'));
const Reports = lazy(() => import('./pages/Reports.jsx'));
const Team = lazy(() => import('./pages/Team.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));

const Spinner = () => (
  <div className="flex min-h-[50vh] items-center justify-center text-subtle">
    <Loader2 className="size-5 animate-spin" />
  </div>
);

export default function App() {
  const { user, loading, isAdmin } = useAuth();

  if (loading) return <Spinner />;
  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <LeadEditorProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Suspense fallback={<Spinner />}><Dashboard /></Suspense>} />
          <Route path="pipeline" element={<Suspense fallback={<Spinner />}><Pipeline /></Suspense>} />
          <Route path="leads" element={<Suspense fallback={<Spinner />}><Leads /></Suspense>} />
          <Route path="leads/:id" element={<Suspense fallback={<Spinner />}><LeadDetail /></Suspense>} />
          <Route path="tasks" element={<Suspense fallback={<Spinner />}><Tasks /></Suspense>} />
          <Route path="reports" element={<Suspense fallback={<Spinner />}><Reports /></Suspense>} />
          <Route path="team" element={isAdmin ? <Suspense fallback={<Spinner />}><Team /></Suspense> : <Navigate to="/" replace />} />
          <Route path="settings" element={<Suspense fallback={<Spinner />}><Settings /></Suspense>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </LeadEditorProvider>
  );
}

import React, { Suspense, lazy, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { ProjectProvider } from './context/ProjectContext';
import MainLayout from './components/Layout/MainLayout';
import { Loader } from './components/UI';

// Pages are code-split per route.
// Public pages
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));

// Workspace pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CreateProject = lazy(() => import('./pages/CreateProject'));
const Profile = lazy(() => import('./pages/Profile'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Tenders = lazy(() => import('./pages/Tenders'));
const HR = lazy(() => import('./pages/HR'));

// Project pages
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const Epics = lazy(() => import('./pages/Epics'));
const Backlog = lazy(() => import('./pages/Backlog'));
const Kanban = lazy(() => import('./pages/Kanban'));
const Milestones = lazy(() => import('./pages/Milestones'));
const Issues = lazy(() => import('./pages/Issues'));
const Wiki = lazy(() => import('./pages/Wiki'));
const Members = lazy(() => import('./pages/Members'));
const ProjectSettings = lazy(() => import('./pages/ProjectSettings'));
const ProjectActivity = lazy(() => import('./pages/ProjectActivity'));
const ProjectSearch = lazy(() => import('./pages/ProjectSearch'));


// Authenticated shell: sidebar + top bar, shared project context.
const ProtectedLayout = () => {
  const { user, token } = useContext(AuthContext);
  if (!token) return <Navigate to="/login" replace />;
  if (!user) return <Loader label="Loading your workspace…" />;
  return (
    <ProjectProvider>
      <MainLayout>
        <Suspense fallback={<Loader />}>
          <Outlet />
        </Suspense>
      </MainLayout>
    </ProjectProvider>
  );
};

const PublicOnly = ({ children }) => {
  const { token } = useContext(AuthContext);
  return token ? <Navigate to="/" replace /> : children;
};

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <Router>
            <Suspense fallback={<Loader label="Loading…" />}>
            <Routes>
              <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
              <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />

              <Route element={<ProtectedLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/create-project" element={<CreateProject />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/admin" element={<AdminPanel />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/tenders" element={<Tenders />} />
                <Route path="/hr" element={<HR />} />

                <Route path="/project/:id" element={<ProjectDetail />} />
                <Route path="/project/:id/epics" element={<Epics />} />
                <Route path="/project/:id/backlog" element={<Backlog />} />
                <Route path="/project/:id/kanban" element={<Kanban />} />
                <Route path="/project/:id/milestones" element={<Milestones />} />
                <Route path="/project/:id/issues" element={<Issues />} />
                <Route path="/project/:id/wiki" element={<Wiki />} />
                <Route path="/project/:id/members" element={<Members />} />
                <Route path="/project/:id/tenders" element={<Tenders />} />
                <Route path="/project/:id/hr" element={<HR />} />
                <Route path="/project/:id/activity" element={<ProjectActivity />} />
                <Route path="/project/:id/search" element={<ProjectSearch />} />
                <Route path="/project/:id/settings" element={<ProjectSettings />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </Suspense>
          </Router>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;

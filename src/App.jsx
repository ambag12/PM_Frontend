import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import MainLayout from './components/Layout/MainLayout';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProjectDetail from './pages/ProjectDetail';
import CreateProject from './pages/CreateProject';
import ProjectSettings from './pages/ProjectSettings';
import Backlog from './pages/Backlog';
import Kanban from './pages/Kanban';
import Issues from './pages/Issues';
import Members from './pages/Members';
import Wiki from './pages/Wiki';
import Milestones from './pages/Milestones';
import Profile from './pages/Profile';
import AdminPanel from './pages/AdminPanel';

// Private Route component - redirects to login if not authenticated
const PrivateRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ minHeight: '100vh' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
};

// Layout wrapper for authenticated routes
const AuthenticatedLayout = ({ children }) => {
  return (
    <MainLayout>
      {children}
    </MainLayout>
  );
};

// Main App Routes
const AppRoutes = () => {
  const location = useLocation();

  // Pages that don't use the sidebar layout
  const noLayoutPaths = ['/login', '/register'];
  const useLayout = !noLayoutPaths.includes(location.pathname);

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Dashboard */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <AuthenticatedLayout>
              <Dashboard />
            </AuthenticatedLayout>
          </PrivateRoute>
        }
      />

      {/* Create Project */}
      <Route
        path="/create-project"
        element={
          <PrivateRoute>
            <AuthenticatedLayout>
              <CreateProject />
            </AuthenticatedLayout>
          </PrivateRoute>
        }
      />

      {/* User Profile */}
      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <AuthenticatedLayout>
              <Profile />
            </AuthenticatedLayout>
          </PrivateRoute>
        }
      />

      {/* Admin Panel */}
      <Route
        path="/admin"
        element={
          <PrivateRoute>
            <AuthenticatedLayout>
              <AdminPanel />
            </AuthenticatedLayout>
          </PrivateRoute>
        }
      />

      {/* Project Routes */}
      <Route
        path="/project/:id"
        element={
          <PrivateRoute>
            <AuthenticatedLayout>
              <ProjectDetail />
            </AuthenticatedLayout>
          </PrivateRoute>
        }
      />

      <Route
        path="/project/:id/backlog"
        element={
          <PrivateRoute>
            <AuthenticatedLayout>
              <Backlog />
            </AuthenticatedLayout>
          </PrivateRoute>
        }
      />

      <Route
        path="/project/:id/kanban"
        element={
          <PrivateRoute>
            <AuthenticatedLayout>
              <Kanban />
            </AuthenticatedLayout>
          </PrivateRoute>
        }
      />

      <Route
        path="/project/:id/issues"
        element={
          <PrivateRoute>
            <AuthenticatedLayout>
              <Issues />
            </AuthenticatedLayout>
          </PrivateRoute>
        }
      />

      <Route
        path="/project/:id/milestones"
        element={
          <PrivateRoute>
            <AuthenticatedLayout>
              <Milestones />
            </AuthenticatedLayout>
          </PrivateRoute>
        }
      />

      <Route
        path="/project/:id/wiki"
        element={
          <PrivateRoute>
            <AuthenticatedLayout>
              <Wiki />
            </AuthenticatedLayout>
          </PrivateRoute>
        }
      />

      <Route
        path="/project/:id/members"
        element={
          <PrivateRoute>
            <AuthenticatedLayout>
              <Members />
            </AuthenticatedLayout>
          </PrivateRoute>
        }
      />

      <Route
        path="/project/:id/settings"
        element={
          <PrivateRoute>
            <AuthenticatedLayout>
              <ProjectSettings />
            </AuthenticatedLayout>
          </PrivateRoute>
        }
      />

      {/* Fallback - redirect unknown routes to dashboard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;

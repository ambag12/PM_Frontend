import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProjectDetail from './pages/ProjectDetail';
import CreateProject from './pages/CreateProject';
import ProjectSettings from './pages/ProjectSettings';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  
  if (loading) return <div style={{ color: 'white', textAlign: 'center', marginTop: '2rem' }}>Loading...</div>;
  
  return user ? children : <Navigate to="/login" />;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route 
        path="/" 
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        } 
      />
      <Route 
        path="/project/:id" 
        element={
          <PrivateRoute>
            <ProjectDetail />
          </PrivateRoute>
        } 
      />
      <Route 
        path="/create-project" 
        element={
          <PrivateRoute>
            <CreateProject />
          </PrivateRoute>
        } 
      />
      <Route 
        path="/project/:id/settings" 
        element={
          <PrivateRoute>
            <ProjectSettings />
          </PrivateRoute>
        } 
      />
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

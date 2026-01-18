import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError('Invalid credentials. Please try again.');
    }
  };

  return (
    <div>
      <Header title="Project Management System" subtitle="Professional Project Tracking & Management" />

      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 'calc(100vh - 200px)',
        padding: '2rem 1rem'
      }}>
        <div className="card" style={{ width: '100%', maxWidth: '450px', padding: '2.5rem' }}>
          <h2 style={{
            textAlign: 'center',
            fontSize: '1.8rem',
            fontWeight: '700',
            color: 'var(--text-dark)',
            marginBottom: '0.5rem'
          }}>Welcome Back</h2>
          <p style={{
            textAlign: 'center',
            color: 'var(--text-secondary)',
            marginBottom: '2rem',
            fontSize: '0.95rem'
          }}>Sign in to your account to continue</p>

          {error && (
            <div style={{
              background: 'rgba(244, 67, 54, 0.1)',
              color: 'var(--status-pending)',
              padding: '0.875rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.5rem',
              fontSize: '0.9rem',
              border: '1px solid rgba(244, 67, 54, 0.3)'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label">Username</label>
              <input
                type="text"
                className="input-field"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <input
                type="password"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
              Sign In
            </button>
          </form>

          <div style={{ marginTop: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Don't have an account? <Link to="/register" style={{ color: 'var(--action-green)', fontWeight: '600' }}>Register</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    accepted_terms: false
  });
  const [error, setError] = useState('');
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await register(formData);
      navigate('/');
    } catch (err) {
      console.error("Registration error details:", err.response?.data);
      const errorMessage = err.response?.data?._error_message ||
        err.response?.data?.detail ||
        (typeof err.response?.data === 'object' ? JSON.stringify(err.response.data) : 'Registration failed. Please check your inputs.');
      setError(errorMessage);
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
          }}>Create Account</h2>
          <p style={{
            textAlign: 'center',
            color: 'var(--text-secondary)',
            marginBottom: '2rem',
            fontSize: '0.95rem'
          }}>Join us to manage your projects professionally</p>

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
              <label className="input-label">Full Name</label>
              <input
                type="text"
                name="full_name"
                className="input-field"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Username</label>
              <input
                type="text"
                name="username"
                className="input-field"
                value={formData.username}
                onChange={handleChange}
                placeholder="Choose a username"
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Email</label>
              <input
                type="email"
                name="email"
                className="input-field"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email address"
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <input
                type="password"
                name="password"
                className="input-field"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a strong password"
                required
              />
            </div>

            <div className="input-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                name="accepted_terms"
                id="accepted_terms"
                checked={formData.accepted_terms}
                onChange={(e) => setFormData({ ...formData, accepted_terms: e.target.checked })}
                required
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label htmlFor="accepted_terms" className="input-label" style={{ marginBottom: 0, cursor: 'pointer' }}>
                I accept the Terms of Service
              </label>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
              Register
            </button>
          </form>

          <div style={{ marginTop: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--action-green)', fontWeight: '600' }}>Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;


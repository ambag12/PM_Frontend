import React, { useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import client from '../api/client';

const CreateTenderModal = ({ projectId, onClose, onCreated }) => {
  const [formData, setFormData] = useState({
    name_of_tenders: 'NHSP',
    status: 'not_started',
    tech_opeining: '',
    financial_opening: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await client.post('projects/create_tenders', {
        ...formData,
        project: parseInt(projectId)
      });
      onCreated();
      onClose();
    } catch (err) {
      console.error('Error creating tender:', err);
      setError('Failed to create tender. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(5px)'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-primary)',
        padding: '2rem',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '500px',
        border: '1px solid var(--border-color)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>Create New Tender</h2>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}
          >
            <FaTimes />
          </button>
        </div>

        {error && (
          <div style={{ 
            backgroundColor: 'rgba(255, 59, 48, 0.1)', 
            color: '#ff3b30', 
            padding: '1rem', 
            borderRadius: '8px', 
            marginBottom: '1.5rem' 
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Name of Tender</label>
            <select
              className="input-field"
              value={formData.name_of_tenders}
              onChange={(e) => setFormData({ ...formData, name_of_tenders: e.target.value })}
              style={{ width: '100%' }}
            >
              <option value="NHSP">NHSP</option>
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Status</label>
            <select
              className="input-field"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              style={{ width: '100%' }}
            >
              <option value="not_started">Not Started</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Tech Opening Date</label>
            <input
              type="date"
              className="input-field"
              value={formData.tech_opeining}
              onChange={(e) => setFormData({ ...formData, tech_opeining: e.target.value })}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Financial Opening Date</label>
            <input
              type="date"
              className="input-field"
              value={formData.financial_opening}
              onChange={(e) => setFormData({ ...formData, financial_opening: e.target.value })}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'transparent',
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--primary)',
                color: 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Creating...' : 'Create Tender'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTenderModal;

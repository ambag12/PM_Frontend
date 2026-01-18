import React, { useState } from 'react';
import { FaTimes, FaUpload } from 'react-icons/fa';
import client from '../api/client';

const CreateHRModal = ({ projectId, onClose, onCreated }) => {
  const [formData, setFormData] = useState({
    hr_name: '',
    position: '',
    ppps: 0,
    no_of_posts: 0,
    vacancy: 0,
    finish_date: ''
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = new FormData();
      data.append('project', projectId);
      data.append('hr_name', formData.hr_name);
      data.append('position', formData.position);
      data.append('ppps', formData.ppps);
      data.append('no_of_posts', formData.no_of_posts);
      data.append('vacancy', formData.vacancy);
      if (formData.finish_date) {
        data.append('finish_date', formData.finish_date);
      }
      if (file) {
        data.append('file', file);
      }

      await client.post('projects/post_hr_func', data, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      onCreated();
      onClose();
    } catch (err) {
      console.error('Error creating HR record:', err);
      setError('Failed to create HR record. Please try again.');
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
        maxWidth: '600px',
        maxHeight: '90vh',
        overflowY: 'auto',
        border: '1px solid var(--border-color)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>Add HR Record</h2>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ marginBottom: '1rem', gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Name</label>
              <input
                type="text"
                className="input-field"
                value={formData.hr_name}
                onChange={(e) => setFormData({ ...formData, hr_name: e.target.value })}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '1rem', gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Position</label>
              <input
                type="text"
                className="input-field"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>PPPS</label>
              <input
                type="number"
                className="input-field"
                value={formData.ppps}
                onChange={(e) => setFormData({ ...formData, ppps: parseInt(e.target.value) || 0 })}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>No. of Posts</label>
              <input
                type="number"
                className="input-field"
                value={formData.no_of_posts}
                onChange={(e) => setFormData({ ...formData, no_of_posts: parseInt(e.target.value) || 0 })}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Vacancy</label>
              <input
                type="number"
                className="input-field"
                value={formData.vacancy}
                onChange={(e) => setFormData({ ...formData, vacancy: parseInt(e.target.value) || 0 })}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Finish Date</label>
              <input
                type="date"
                className="input-field"
                value={formData.finish_date}
                onChange={(e) => setFormData({ ...formData, finish_date: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem', gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Document</label>
              <div style={{
                border: '2px dashed var(--border-color)',
                borderRadius: '8px',
                padding: '2rem',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: 'var(--bg-secondary)'
              }} onClick={() => document.getElementById('hr-file-upload').click()}>
                <FaUpload style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }} />
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                  {file ? file.name : 'Click to upload document'}
                </p>
                <input
                  id="hr-file-upload"
                  type="file"
                  onChange={(e) => setFile(e.target.files[0])}
                  style={{ display: 'none' }}
                />
              </div>
            </div>
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
              {loading ? 'Creating...' : 'Create Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateHRModal;

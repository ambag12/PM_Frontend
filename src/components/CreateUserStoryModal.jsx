import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { FaTimes } from 'react-icons/fa';

const CreateUserStoryModal = ({ projectId, onClose, onStoryCreated }) => {
  const [statuses, setStatuses] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    tags: '',
    status: '',
    milestone: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch statuses
        const statusRes = await client.get(`userstory-statuses?project=${projectId}`);
        setStatuses(statusRes.data);
        if (statusRes.data.length > 0) {
          setFormData(prev => ({ ...prev, status: statusRes.data[0].id }));
        }

        // Fetch milestones
        const milestonesRes = await client.get(`milestones?project=${projectId}`);
        setMilestones(milestonesRes.data);
      } catch (err) {
        console.error("Failed to fetch data", err);
      }
    };

    fetchData();
  }, [projectId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        project: parseInt(projectId),
        subject: formData.subject,
        description: formData.description,
      };

      if (formData.status) {
        payload.status = parseInt(formData.status);
      }

      if (formData.milestone) {
        payload.milestone = parseInt(formData.milestone);
      }

      if (formData.tags) {
        payload.tags = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      }

      await client.post('userstories', payload);
      onStoryCreated();
      onClose();
    } catch (err) {
      console.error("Failed to create user story", err);
      setError(err.response?.data?._error_message || "Failed to create user story.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem',
      overflowY: 'auto'
    }}>
      <div className="card" style={{ maxWidth: '600px', width: '100%', position: 'relative', margin: '2rem auto' }}>
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '1.2rem'
          }}
        >
          <FaTimes />
        </button>

        <h3 style={{ marginBottom: '1.5rem' }}>Create New User Story</h3>

        {error && (
          <div style={{ 
            background: 'rgba(255, 59, 48, 0.1)', 
            border: '1px solid var(--error)', 
            color: 'var(--error)', 
            padding: '1rem', 
            borderRadius: '8px',
            marginBottom: '1.5rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Story Title *</label>
            <input
              type="text"
              className="input-field"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="As a user, I want to..."
              required
              autoFocus
            />
          </div>

          <div className="input-group">
            <label className="input-label">Description</label>
            <textarea
              className="input-field"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the user story in detail..."
              rows="4"
            />
          </div>

          <div className="input-group">
            <label className="input-label">Status</label>
            <select
              className="input-field"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              style={{ width: '100%', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            >
              <option value="">Select status</option>
              {statuses.map(status => (
                <option key={status.id} value={status.id}>
                  {status.name}
                </option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Milestone (Optional)</label>
            <select
              className="input-field"
              value={formData.milestone}
              onChange={(e) => setFormData({ ...formData, milestone: e.target.value })}
              style={{ width: '100%', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            >
              <option value="">No milestone</option>
              {milestones.map(milestone => (
                <option key={milestone.id} value={milestone.id}>
                  {milestone.name}
                </option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Tags (comma-separated)</label>
            <input
              type="text"
              className="input-field"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="e.g., frontend, api, urgent"
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ flex: 1 }}
              disabled={submitting}
            >
              {submitting ? 'Creating...' : 'Create User Story'}
            </button>
            <button 
              type="button" 
              onClick={onClose}
              className="btn"
              style={{ flex: 1, background: 'var(--bg-secondary)' }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateUserStoryModal;

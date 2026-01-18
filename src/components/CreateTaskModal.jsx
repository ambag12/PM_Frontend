import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { FaTimes } from 'react-icons/fa';

const CreateTaskModal = ({ projectId, onClose, onTaskCreated }) => {
  const [milestones, setMilestones] = useState([]);
  const [members, setMembers] = useState([]);
  const [formData, setFormData] = useState({
    subject: '',
    milestone: '',
    description: '',
    assigned_to: '',
    tags: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await client.get(`milestones?project=${projectId}`);
        setMilestones(response.data);

        const membersRes = await client.get(`memberships?project=${projectId}`);
        setMembers(membersRes.data);
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
      };

      if (formData.milestone) {
        payload.milestone = parseInt(formData.milestone);
      }

      if (formData.description) {
        payload.description = formData.description;
      }

      if (formData.assigned_to) {
        payload.assigned_to = parseInt(formData.assigned_to);
      }

      if (formData.tags) {
        payload.tags = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      }

      await client.post('tasks', payload);
      onTaskCreated();
      onClose();
    } catch (err) {
      console.error("Failed to create task", err);
      setError(err.response?.data?._error_message || "Failed to create task.");
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
      padding: '1rem'
    }}>
      <div className="card" style={{ maxWidth: '500px', width: '100%', position: 'relative' }}>
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

        <h3 style={{ marginBottom: '1.5rem' }}>Create New Task</h3>

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
            <label className="input-label">Task Title</label>
            <input
              type="text"
              className="input-field"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="e.g., Implement login page"
              required
              autoFocus
            />
          </div>

          <div className="input-group">
            <label className="input-label">Description (Optional)</label>
            <textarea
              className="input-field"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add task details..."
              rows="3"
            />
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
            <label className="input-label">Assign To (Optional)</label>
            <select
              className="input-field"
              value={formData.assigned_to}
              onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
              style={{ width: '100%', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            >
              <option value="">Unassigned</option>
              {members.map(member => (
                <option key={member.id} value={member.user}>
                  {member.full_name || member.user_email}
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
              placeholder="e.g., bug, urgent, backend"
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ flex: 1 }}
              disabled={submitting}
            >
              {submitting ? 'Creating...' : 'Create Task'}
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

export default CreateTaskModal;

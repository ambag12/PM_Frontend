import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { FaTimes } from 'react-icons/fa';

const CreateIssueModal = ({ projectId, onClose, onIssueCreated }) => {
  const [types, setTypes] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [severities, setSeverities] = useState([]);
  const [members, setMembers] = useState([]);
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    type: '',
    status: '',
    priority: '',
    severity: '',
    assigned_to: '',
    tags: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [typesRes, statusesRes, prioritiesRes, severitiesRes, membersRes] = await Promise.all([
          client.get(`issue-types?project=${projectId}`),
          client.get(`issue-statuses?project=${projectId}`),
          client.get(`priorities?project=${projectId}`),
          client.get(`severities?project=${projectId}`),
          client.get(`memberships?project=${projectId}`)
        ]);

        setTypes(typesRes.data);
        setStatuses(statusesRes.data);
        setPriorities(prioritiesRes.data);
        setSeverities(severitiesRes.data);
        setMembers(membersRes.data);

        // Set defaults
        if (typesRes.data.length > 0) {
          setFormData(prev => ({ ...prev, type: typesRes.data[0].id }));
        }
        if (statusesRes.data.length > 0) {
          setFormData(prev => ({ ...prev, status: statusesRes.data[0].id }));
        }
        if (prioritiesRes.data.length > 0) {
          setFormData(prev => ({ ...prev, priority: prioritiesRes.data[0].id }));
        }
        if (severitiesRes.data.length > 0) {
          setFormData(prev => ({ ...prev, severity: severitiesRes.data[0].id }));
        }
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
        type: parseInt(formData.type),
        status: parseInt(formData.status),
        priority: parseInt(formData.priority),
        severity: parseInt(formData.severity),
      };

      if (formData.assigned_to) {
        payload.assigned_to = parseInt(formData.assigned_to);
      }

      if (formData.tags) {
        payload.tags = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      }

      await client.post('issues', payload);
      onIssueCreated();
      onClose();
    } catch (err) {
      console.error("Failed to create issue", err);
      setError(err.response?.data?._error_message || "Failed to create issue.");
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

        <h3 style={{ marginBottom: '1.5rem' }}>Create New Issue</h3>

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
            <label className="input-label">Issue Title *</label>
            <input
              type="text"
              className="input-field"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="e.g., Login button not working"
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
              placeholder="Describe the issue in detail..."
              rows="4"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="input-group">
              <label className="input-label">Type *</label>
              <select
                className="input-field"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                style={{ width: '100%', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                required
              >
                {types.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Status *</label>
              <select
                className="input-field"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                style={{ width: '100%', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                required
              >
                {statuses.map(status => (
                  <option key={status.id} value={status.id}>
                    {status.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="input-group">
              <label className="input-label">Priority *</label>
              <select
                className="input-field"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                style={{ width: '100%', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                required
              >
                {priorities.map(priority => (
                  <option key={priority.id} value={priority.id}>
                    {priority.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Severity *</label>
              <select
                className="input-field"
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                style={{ width: '100%', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                required
              >
                {severities.map(severity => (
                  <option key={severity.id} value={severity.id}>
                    {severity.name}
                  </option>
                ))}
              </select>
            </div>
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
              placeholder="e.g., bug, critical, frontend"
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ flex: 1 }}
              disabled={submitting}
            >
              {submitting ? 'Creating...' : 'Create Issue'}
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

export default CreateIssueModal;

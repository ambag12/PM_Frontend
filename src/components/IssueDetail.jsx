import React, { useState, useEffect } from 'react';
import client from '../api/client';
import WatchButton from './WatchButton';
import VoteButtons from './VoteButtons';
import { FaTimes, FaEdit, FaTrash, FaSave, FaTags, FaClock, FaUser, FaExclamationCircle } from 'react-icons/fa';

const IssueDetail = ({ issueId, onClose, onUpdate, onDelete }) => {
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [statuses, setStatuses] = useState([]);
  const [types, setTypes] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [severities, setSeverities] = useState([]);
  const [members, setMembers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchIssueDetails();
  }, [issueId]);

  const fetchIssueDetails = async () => {
    try {
      const response = await client.get(`issues/${issueId}`);
      setIssue(response.data);
      setFormData({
        subject: response.data.subject,
        description: response.data.description || '',
        status: response.data.status,
        type: response.data.type,
        priority: response.data.priority,
        severity: response.data.severity,
        assigned_to: response.data.assigned_to || '',
        tags: response.data.tags ? response.data.tags.join(', ') : '',
      });
      
      // Fetch related data
      fetchStatuses(response.data.project);
      fetchTypes(response.data.project);
      fetchPriorities(response.data.project);
      fetchSeverities(response.data.project);
      fetchMembers(response.data.project);
    } catch (err) {
      console.error("Failed to fetch issue", err);
      setError("Could not load issue.");
    } finally {
      setLoading(false);
    }
  };

  const fetchStatuses = async (projectId) => {
    try {
      const response = await client.get(`issue-statuses?project=${projectId}`);
      setStatuses(response.data);
    } catch (err) {
      console.error("Failed to fetch statuses", err);
    }
  };

  const fetchTypes = async (projectId) => {
    try {
      const response = await client.get(`issue-types?project=${projectId}`);
      setTypes(response.data);
    } catch (err) {
      console.error("Failed to fetch types", err);
    }
  };

  const fetchPriorities = async (projectId) => {
    try {
      const response = await client.get(`priorities?project=${projectId}`);
      setPriorities(response.data);
    } catch (err) {
      console.error("Failed to fetch priorities", err);
    }
  };

  const fetchSeverities = async (projectId) => {
    try {
      const response = await client.get(`severities?project=${projectId}`);
      setSeverities(response.data);
    } catch (err) {
      console.error("Failed to fetch severities", err);
    }
  };

  const fetchMembers = async (projectId) => {
    try {
      const response = await client.get(`memberships?project=${projectId}`);
      setMembers(response.data);
    } catch (err) {
      console.error("Failed to fetch members", err);
    }
  };

  const handleUpdate = async () => {
    setError('');
    try {
      const payload = {
        subject: formData.subject,
        description: formData.description,
        status: parseInt(formData.status),
        type: parseInt(formData.type),
        priority: parseInt(formData.priority),
        severity: parseInt(formData.severity),
        version: issue.version,
      };

      if (formData.assigned_to) {
        payload.assigned_to = parseInt(formData.assigned_to);
      }

      if (formData.tags) {
        payload.tags = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      }

      const response = await client.patch(`issues/${issueId}`, payload);
      setIssue(response.data);
      setEditing(false);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error("Failed to update issue", err);
      setError(err.response?.data?._error_message || "Failed to update issue.");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this issue?")) return;

    try {
      await client.delete(`issues/${issueId}`);
      if (onDelete) onDelete();
      onClose();
    } catch (err) {
      console.error("Failed to delete issue", err);
      setError("Failed to delete issue.");
    }
  };

  const handleWatch = async () => {
    try {
      await client.post(`issues/${issueId}/watch`);
      fetchIssueDetails();
    } catch (err) {
      console.error("Failed to watch issue", err);
    }
  };

  const handleUnwatch = async () => {
    try {
      await client.post(`issues/${issueId}/unwatch`);
      fetchIssueDetails();
    } catch (err) {
      console.error("Failed to unwatch issue", err);
    }
  };

  const handleUpvote = async () => {
    try {
      await client.post(`issues/${issueId}/upvote`);
      fetchIssueDetails();
    } catch (err) {
      console.error("Failed to upvote", err);
    }
  };

  const handleDownvote = async () => {
    try {
      await client.post(`issues/${issueId}/downvote`);
      fetchIssueDetails();
    } catch (err) {
      console.error("Failed to downvote", err);
    }
  };

  if (loading) return (
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
    }}>
      <div className="card">Loading...</div>
    </div>
  );

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
      <div className="card" style={{ maxWidth: '800px', width: '100%', position: 'relative', margin: '2rem auto' }}>
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
            fontSize: '1.2rem',
            zIndex: 1001
          }}
        >
          <FaTimes />
        </button>

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

        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <FaExclamationCircle style={{ color: 'var(--error)' }} />
            <span style={{ color: 'var(--text-secondary)', fontWeight: 'bold' }}>#{issue?.ref}</span>
            <span style={{ 
              background: 'rgba(255,255,255,0.1)', 
              padding: '0.25rem 0.75rem', 
              borderRadius: '1rem', 
              fontSize: '0.8rem' 
            }}>
              {issue?.status_extra_info?.name || 'Status'}
            </span>
            <span style={{ 
              background: 'rgba(255, 59, 48, 0.1)', 
              color: 'var(--error)',
              padding: '0.25rem 0.75rem', 
              borderRadius: '1rem', 
              fontSize: '0.8rem' 
            }}>
              {issue?.type_extra_info?.name || 'Type'}
            </span>
          </div>

          {editing ? (
            <input
              type="text"
              className="input-field"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}
            />
          ) : (
            <h2 style={{ marginBottom: '1rem' }}>{issue?.subject}</h2>
          )}

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <FaClock style={{ color: 'var(--text-secondary)' }} />
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Created: {issue?.created_date ? new Date(issue.created_date).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            {issue?.assigned_to_extra_info && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <FaUser style={{ color: 'var(--text-secondary)' }} />
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  {issue.assigned_to_extra_info.full_name_display}
                </span>
              </div>
            )}
            <span style={{ 
              background: 'rgba(255, 149, 0, 0.1)', 
              color: '#FF9500',
              padding: '0.25rem 0.75rem', 
              borderRadius: '1rem', 
              fontSize: '0.85rem' 
            }}>
              Priority: {issue?.priority_extra_info?.name}
            </span>
            <span style={{ 
              background: 'rgba(255, 59, 48, 0.1)', 
              color: 'var(--error)',
              padding: '0.25rem 0.75rem', 
              borderRadius: '1rem', 
              fontSize: '0.85rem' 
            }}>
              Severity: {issue?.severity_extra_info?.name}
            </span>
          </div>

          {issue?.tags && issue.tags.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
              <FaTags style={{ color: 'var(--text-secondary)' }} />
              {issue.tags.map((tag, index) => (
                <span key={index} style={{ 
                  background: 'rgba(255, 255, 255, 0.05)', 
                  padding: '0.25rem 0.75rem', 
                  borderRadius: '1rem', 
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)'
                }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h4 style={{ marginBottom: '0.75rem' }}>Description</h4>
          {editing ? (
            <textarea
              className="input-field"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows="6"
            />
          ) : (
            <p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
              {issue?.description || 'No description provided.'}
            </p>
          )}
        </div>

        {editing && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label">Status</label>
                <select
                  className="input-field"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  style={{ width: '100%', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                >
                  {statuses.map(status => (
                    <option key={status.id} value={status.id}>
                      {status.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Type</label>
                <select
                  className="input-field"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  style={{ width: '100%', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                >
                  {types.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label">Priority</label>
                <select
                  className="input-field"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  style={{ width: '100%', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                >
                  {priorities.map(priority => (
                    <option key={priority.id} value={priority.id}>
                      {priority.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Severity</label>
                <select
                  className="input-field"
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  style={{ width: '100%', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
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
              <label className="input-label">Assign To</label>
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
              />
            </div>
          </>
        )}

        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          paddingTop: '1.5rem',
          borderTop: '1px solid var(--border-color)',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <WatchButton
              isWatching={issue?.is_watcher}
              watchersCount={issue?.total_watchers}
              onWatch={handleWatch}
              onUnwatch={handleUnwatch}
              resourceType="issue"
            />
            <VoteButtons
              isUpvoted={issue?.is_voter}
              isDownvoted={false}
              upvotesCount={issue?.total_voters}
              onUpvote={handleUpvote}
              onDownvote={handleDownvote}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {editing ? (
              <>
                <button onClick={handleUpdate} className="btn btn-primary">
                  <FaSave /> Save
                </button>
                <button onClick={() => setEditing(false)} className="btn" style={{ background: 'var(--bg-secondary)' }}>
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setEditing(true)} className="btn">
                  <FaEdit /> Edit
                </button>
                <button onClick={handleDelete} className="btn" style={{ background: 'rgba(255, 59, 48, 0.1)', color: 'var(--error)' }}>
                  <FaTrash /> Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IssueDetail;

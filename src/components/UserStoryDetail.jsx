import React, { useState, useEffect } from 'react';
import client from '../api/client';
import WatchButton from './WatchButton';
import VoteButtons from './VoteButtons';
import { FaTimes, FaEdit, FaTrash, FaSave, FaTags, FaClock } from 'react-icons/fa';

const UserStoryDetail = ({ storyId, onClose, onUpdate, onDelete }) => {
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [statuses, setStatuses] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStoryDetails();
    fetchStatuses();
  }, [storyId]);

  const fetchStoryDetails = async () => {
    try {
      const response = await client.get(`userstories/${storyId}`);
      setStory(response.data);
      setFormData({
        subject: response.data.subject,
        description: response.data.description || '',
        status: response.data.status,
        tags: response.data.tags ? response.data.tags.join(', ') : '',
      });
    } catch (err) {
      console.error("Failed to fetch story", err);
      setError("Could not load user story.");
    } finally {
      setLoading(false);
    }
  };

  const fetchStatuses = async () => {
    if (!story) return;
    try {
      const response = await client.get(`userstory-statuses?project=${story.project}`);
      setStatuses(response.data);
    } catch (err) {
      console.error("Failed to fetch statuses", err);
    }
  };

  const handleUpdate = async () => {
    setError('');
    try {
      const payload = {
        subject: formData.subject,
        description: formData.description,
        status: parseInt(formData.status),
        version: story.version,
      };

      if (formData.tags) {
        payload.tags = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      }

      const response = await client.patch(`userstories/${storyId}`, payload);
      setStory(response.data);
      setEditing(false);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error("Failed to update story", err);
      setError(err.response?.data?._error_message || "Failed to update user story.");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this user story?")) return;

    try {
      await client.delete(`userstories/${storyId}`);
      if (onDelete) onDelete();
      onClose();
    } catch (err) {
      console.error("Failed to delete story", err);
      setError("Failed to delete user story.");
    }
  };

  const handleWatch = async () => {
    try {
      await client.post(`userstories/${storyId}/watch`);
      fetchStoryDetails();
    } catch (err) {
      console.error("Failed to watch story", err);
    }
  };

  const handleUnwatch = async () => {
    try {
      await client.post(`userstories/${storyId}/unwatch`);
      fetchStoryDetails();
    } catch (err) {
      console.error("Failed to unwatch story", err);
    }
  };

  const handleUpvote = async () => {
    try {
      await client.post(`userstories/${storyId}/upvote`);
      fetchStoryDetails();
    } catch (err) {
      console.error("Failed to upvote", err);
    }
  };

  const handleDownvote = async () => {
    try {
      await client.post(`userstories/${storyId}/downvote`);
      fetchStoryDetails();
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>#{story?.ref}</span>
            <span style={{ 
              background: 'rgba(255,255,255,0.1)', 
              padding: '0.25rem 0.75rem', 
              borderRadius: '1rem', 
              fontSize: '0.8rem' 
            }}>
              {story?.status_extra_info?.name || 'Status'}
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
            <h2 style={{ marginBottom: '1rem' }}>{story?.subject}</h2>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <FaClock style={{ color: 'var(--text-secondary)' }} />
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Created: {story?.created_date ? new Date(story.created_date).toLocaleDateString() : 'N/A'}
            </span>
          </div>

          {story?.tags && story.tags.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
              <FaTags style={{ color: 'var(--text-secondary)' }} />
              {story.tags.map((tag, index) => (
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
              {story?.description || 'No description provided.'}
            </p>
          )}
        </div>

        {editing && (
          <>
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
              isWatching={story?.is_watcher}
              watchersCount={story?.total_watchers}
              onWatch={handleWatch}
              onUnwatch={handleUnwatch}
              resourceType="user story"
            />
            <VoteButtons
              isUpvoted={story?.is_voter}
              isDownvoted={false}
              upvotesCount={story?.total_voters}
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

export default UserStoryDetail;

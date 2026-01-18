import React, { useState, useEffect } from 'react';
import client from '../api/client';
import WatchButton from './WatchButton';
import { FaTimes, FaEdit, FaTrash, FaSave, FaChartLine, FaTasks, FaList } from 'react-icons/fa';

const MilestoneDetail = ({ milestoneId, onClose, onUpdate, onDelete }) => {
  const [milestone, setMilestone] = useState(null);
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [userStories, setUserStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMilestoneDetails();
    fetchMilestoneStats();
    fetchMilestoneItems();
  }, [milestoneId]);

  const fetchMilestoneDetails = async () => {
    try {
      const response = await client.get(`milestones/${milestoneId}`);
      setMilestone(response.data);
      setFormData({
        name: response.data.name,
        estimated_start: response.data.estimated_start || '',
        estimated_finish: response.data.estimated_finish || '',
      });
    } catch (err) {
      console.error("Failed to fetch milestone", err);
      setError("Could not load milestone.");
    } finally {
      setLoading(false);
    }
  };

  const fetchMilestoneStats = async () => {
    try {
      const response = await client.get(`milestones/${milestoneId}/stats`);
      setStats(response.data);
    } catch (err) {
      console.error("Failed to fetch milestone stats", err);
    }
  };

  const fetchMilestoneItems = async () => {
    try {
      const tasksRes = await client.get(`tasks?milestone=${milestoneId}`);
      setTasks(tasksRes.data);

      const storiesRes = await client.get(`userstories?milestone=${milestoneId}`);
      setUserStories(storiesRes.data);
    } catch (err) {
      console.error("Failed to fetch milestone items", err);
    }
  };

  const handleUpdate = async () => {
    setError('');
    try {
      const payload = {
        name: formData.name,
        estimated_start: formData.estimated_start,
        estimated_finish: formData.estimated_finish,
        version: milestone.version,
      };

      const response = await client.patch(`milestones/${milestoneId}`, payload);
      setMilestone(response.data);
      setEditing(false);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error("Failed to update milestone", err);
      setError(err.response?.data?._error_message || "Failed to update milestone.");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this milestone?")) return;

    try {
      await client.delete(`milestones/${milestoneId}`);
      if (onDelete) onDelete();
      onClose();
    } catch (err) {
      console.error("Failed to delete milestone", err);
      setError("Failed to delete milestone.");
    }
  };

  const handleWatch = async () => {
    try {
      await client.post(`milestones/${milestoneId}/watch`);
      fetchMilestoneDetails();
    } catch (err) {
      console.error("Failed to watch milestone", err);
    }
  };

  const handleUnwatch = async () => {
    try {
      await client.post(`milestones/${milestoneId}/unwatch`);
      fetchMilestoneDetails();
    } catch (err) {
      console.error("Failed to unwatch milestone", err);
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

  const completionPercentage = stats ? Math.round((stats.completed_points / stats.total_points) * 100) || 0 : 0;

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
      <div className="card" style={{ maxWidth: '900px', width: '100%', position: 'relative', margin: '2rem auto' }}>
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

        <div style={{ marginBottom: '2rem' }}>
          {editing ? (
            <input
              type="text"
              className="input-field"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}
            />
          ) : (
            <h2 style={{ marginBottom: '1rem' }}>{milestone?.name}</h2>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {milestone?.slug && (
              <span style={{ 
                background: 'rgba(10, 132, 255, 0.1)',
                color: 'var(--primary)',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                fontSize: '0.85rem'
              }}>
                {milestone.slug}
              </span>
            )}
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
              📅 {milestone?.estimated_start} → {milestone?.estimated_finish}
            </span>
          </div>
        </div>

        {/* Stats Section */}
        {stats && (
          <div style={{ marginBottom: '2rem' }}>
            <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FaChartLine /> Sprint Progress
            </h4>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Total Tasks</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.total_tasks || 0}</div>
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Completed</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)' }}>{stats.completed_tasks || 0}</div>
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>User Stories</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.total_userstories || 0}</div>
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Completion</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>{completionPercentage}%</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div style={{ 
              background: 'var(--bg-secondary)', 
              borderRadius: '10px', 
              height: '20px', 
              overflow: 'hidden',
              marginBottom: '1rem'
            }}>
              <div style={{ 
                background: 'linear-gradient(90deg, var(--primary), var(--success))', 
                height: '100%', 
                width: `${completionPercentage}%`,
                transition: 'width 0.3s ease'
              }}></div>
            </div>
          </div>
        )}

        {editing && (
          <>
            <div className="input-group">
              <label className="input-label">Estimated Start Date</label>
              <input
                type="date"
                className="input-field"
                value={formData.estimated_start}
                onChange={(e) => setFormData({ ...formData, estimated_start: e.target.value })}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Estimated Finish Date</label>
              <input
                type="date"
                className="input-field"
                value={formData.estimated_finish}
                onChange={(e) => setFormData({ ...formData, estimated_finish: e.target.value })}
              />
            </div>
          </>
        )}

        {/* User Stories Section */}
        <div style={{ marginBottom: '2rem' }}>
          <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaList /> User Stories ({userStories.length})
          </h4>
          {userStories.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No user stories in this milestone.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {userStories.slice(0, 5).map(story => (
                <div key={story.id} style={{ 
                  background: 'var(--bg-secondary)', 
                  padding: '0.75rem', 
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--primary)', fontWeight: 'bold', marginRight: '0.5rem' }}>#{story.ref}</span>
                    {story.subject}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {story.status_extra_info?.name}
                  </span>
                </div>
              ))}
              {userStories.length > 5 && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                  +{userStories.length - 5} more
                </p>
              )}
            </div>
          )}
        </div>

        {/* Tasks Section */}
        <div style={{ marginBottom: '2rem' }}>
          <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaTasks /> Tasks ({tasks.length})
          </h4>
          {tasks.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No tasks in this milestone.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {tasks.slice(0, 5).map(task => (
                <div key={task.id} style={{ 
                  background: 'var(--bg-secondary)', 
                  padding: '0.75rem', 
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--secondary)', fontWeight: 'bold', marginRight: '0.5rem' }}>#{task.ref}</span>
                    {task.subject}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {task.status_extra_info?.name}
                  </span>
                </div>
              ))}
              {tasks.length > 5 && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                  +{tasks.length - 5} more
                </p>
              )}
            </div>
          )}
        </div>

        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          paddingTop: '1.5rem',
          borderTop: '1px solid var(--border-color)',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <WatchButton
            isWatching={milestone?.is_watcher}
            watchersCount={milestone?.total_watchers}
            onWatch={handleWatch}
            onUnwatch={handleUnwatch}
            resourceType="milestone"
          />

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

export default MilestoneDetail;

import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { FaPlus, FaCalendarAlt } from 'react-icons/fa';
import MilestoneDetail from './MilestoneDetail';

const Milestones = ({ projectId }) => {
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    estimated_start: '',
    estimated_finish: '',
  });
  const [error, setError] = useState('');
  const [selectedMilestone, setSelectedMilestone] = useState(null);

  useEffect(() => {
    fetchMilestones();
  }, [projectId]);

  const fetchMilestones = async () => {
    try {
      const response = await client.get(`milestones?project=${projectId}`);
      setMilestones(response.data);
    } catch (err) {
      console.error("Failed to fetch milestones", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await client.post('milestones', {
        project: parseInt(projectId),
        name: formData.name,
        estimated_start: formData.estimated_start,
        estimated_finish: formData.estimated_finish,
      });

      // Refresh milestones list
      await fetchMilestones();
      
      // Reset form
      setFormData({ name: '', estimated_start: '', estimated_finish: '' });
      setShowForm(false);
    } catch (err) {
      console.error("Failed to create milestone", err);
      setError(err.response?.data?._error_message || "Failed to create milestone.");
    }
  };

  if (loading) return <div style={{textAlign: 'center', padding: '2rem'}}>Loading milestones...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3>Milestones / Sprints</h3>
        <button 
          onClick={() => setShowForm(!showForm)} 
          className="btn btn-primary"
          style={{ fontSize: '0.9rem' }}
        >
          <FaPlus /> {showForm ? 'Cancel' : 'New Milestone'}
        </button>
      </div>

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

      {showForm && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h4 style={{ marginBottom: '1rem' }}>Create New Milestone</h4>
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label">Milestone Name</label>
              <input
                type="text"
                className="input-field"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Sprint 1"
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Estimated Start Date</label>
              <input
                type="date"
                className="input-field"
                value={formData.estimated_start}
                onChange={(e) => setFormData({ ...formData, estimated_start: e.target.value })}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Estimated Finish Date</label>
              <input
                type="date"
                className="input-field"
                value={formData.estimated_finish}
                onChange={(e) => setFormData({ ...formData, estimated_finish: e.target.value })}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary">Create Milestone</button>
          </form>
        </div>
      )}

      {milestones.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <FaCalendarAlt style={{ fontSize: '3rem', opacity: 0.3, marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-secondary)' }}>No milestones yet. Create your first sprint!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {milestones.map(milestone => (
            <div 
              key={milestone.id} 
              className="card"
              onClick={() => setSelectedMilestone(milestone.id)}
              style={{ 
                padding: '1.5rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <h4 style={{ marginBottom: '0.5rem' }}>{milestone.name}</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {milestone.estimated_start} → {milestone.estimated_finish}
                  </p>
                </div>
                <div style={{ 
                  padding: '0.5rem 1rem', 
                  borderRadius: '20px', 
                  background: 'rgba(10, 132, 255, 0.1)',
                  color: 'var(--primary)',
                  fontSize: '0.85rem'
                }}>
                  {milestone.slug || 'Milestone'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedMilestone && (
        <MilestoneDetail 
          milestoneId={selectedMilestone}
          onClose={() => setSelectedMilestone(null)}
          onUpdate={fetchMilestones}
          onDelete={fetchMilestones}
        />
      )}
    </div>
  );
};

export default Milestones;

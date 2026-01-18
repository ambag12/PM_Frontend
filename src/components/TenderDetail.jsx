import React, { useState, useEffect } from 'react';
import { FaTimes, FaEdit, FaTrash, FaComment } from 'react-icons/fa';
import client from '../api/client';

const TenderDetail = ({ tender, projectId, onClose, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ ...tender });
  const [remarks, setRemarks] = useState(tender.tender_remarks || []);
  const [newRemark, setNewRemark] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setEditData({ ...tender });
    setRemarks(tender.tender_remarks || []);
  }, [tender]);

  const handleUpdate = async () => {
    try {
      const response = await client.patch('projects/update_tenders', {
        tender_id: tender.id,
        ...editData
      });
      onUpdate(response.data.data); // Update parent list
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating tender:', err);
    }
  };

  const handleAddRemark = async (e) => {
    e.preventDefault();
    if (!newRemark.trim()) return;

    try {
      const response = await client.post('projects/create_remarks', {
        project: parseInt(projectId),
        tenders: tender.id,
        remarks: newRemark
      });
      
      // Refresh tender data to get updated remarks
      // Since the create_remarks response returns the created remark, we can append it
      // But ideally we should re-fetch the tender to be sure, or just append if structure matches
      setRemarks([...remarks, response.data.data]);
      setNewRemark('');
    } catch (err) {
      console.error('Error adding remark:', err);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      completed: '#34C759',
      in_progress: '#0A84FF',
      pending: '#FF9F0A',
      on_hold: '#FF453A',
      not_started: '#8E8E93'
    };
    return colors[status] || colors.not_started;
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
        width: '90%',
        maxWidth: '800px',
        maxHeight: '90vh',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        boxShadow: '0 24px 48px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--bg-secondary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>
              {isEditing ? 'Edit Tender' : tender.name_of_tenders}
            </h2>
            {!isEditing && (
              <span style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '20px',
                fontSize: '0.85rem',
                backgroundColor: `${getStatusColor(tender.status)}20`,
                color: getStatusColor(tender.status),
                border: `1px solid ${getStatusColor(tender.status)}40`
              }}>
                {tender.status.replace('_', ' ').toUpperCase()}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <FaEdit />
              </button>
            )}
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>
          {isEditing ? (
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Status</label>
                <select
                  className="input-field"
                  value={editData.status}
                  onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                  style={{ width: '100%' }}
                >
                  <option value="not_started">Not Started</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Tech Opening</label>
                <input
                  type="date"
                  className="input-field"
                  value={editData.tech_opeining || ''}
                  onChange={(e) => setEditData({ ...editData, tech_opeining: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Financial Opening</label>
                <input
                  type="date"
                  className="input-field"
                  value={editData.financial_opening || ''}
                  onChange={(e) => setEditData({ ...editData, financial_opening: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button
                  onClick={() => setIsEditing(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  className="btn btn-primary"
                >
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div>
                  <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Tech Opening</h4>
                  <p style={{ margin: 0, fontSize: '1.1rem' }}>{tender.tech_opeining || 'Not set'}</p>
                </div>
                <div>
                  <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Financial Opening</h4>
                  <p style={{ margin: 0, fontSize: '1.1rem' }}>{tender.financial_opening || 'Not set'}</p>
                </div>
              </div>

              {/* Remarks Section */}
              <div>
                <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                  Remarks
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                  {remarks.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No remarks yet.</p>
                  ) : (
                    remarks.map((remark, index) => (
                      <div key={index} style={{ 
                        backgroundColor: 'var(--bg-secondary)', 
                        padding: '1rem', 
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)'
                      }}>
                        <p style={{ margin: 0 }}>{remark.remarks}</p>
                        <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '0.5rem' }}>
                          {remark.created_at ? new Date(remark.created_at).toLocaleString() : 'Just now'}
                        </small>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddRemark} style={{ display: 'flex', gap: '1rem' }}>
                  <input
                    type="text"
                    className="input-field"
                    value={newRemark}
                    onChange={(e) => setNewRemark(e.target.value)}
                    placeholder="Add a remark..."
                    style={{ flex: 1 }}
                  />
                  <button type="submit" className="btn btn-primary" disabled={!newRemark.trim()}>
                    <FaComment /> Add
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TenderDetail;

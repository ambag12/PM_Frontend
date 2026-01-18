import React, { useState, useEffect } from 'react';
import { FaTimes, FaComment, FaFileDownload } from 'react-icons/fa';
import client from '../api/client';

const HRDetail = ({ hr, projectId, onClose }) => {
  const [remarks, setRemarks] = useState(hr.hr_remarks || []);
  const [newRemark, setNewRemark] = useState('');

  useEffect(() => {
    setRemarks(hr.hr_remarks || []);
  }, [hr]);

  const handleAddRemark = async (e) => {
    e.preventDefault();
    if (!newRemark.trim()) return;

    try {
      const response = await client.post('projects/create_remarks', {
        project: parseInt(projectId),
        hr: hr.id,
        remarks: newRemark
      });
      
      setRemarks([...remarks, response.data.data]);
      setNewRemark('');
    } catch (err) {
      console.error('Error adding remark:', err);
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
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{hr.hr_name}</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <FaTimes />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'grid', gap: '2rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
              <div>
                <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Position</h4>
                <p style={{ margin: 0, fontSize: '1.1rem' }}>{hr.position || '-'}</p>
              </div>
              <div>
                <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>PPPS</h4>
                <p style={{ margin: 0, fontSize: '1.1rem' }}>{hr.ppps}</p>
              </div>
              <div>
                <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>No. of Posts</h4>
                <p style={{ margin: 0, fontSize: '1.1rem' }}>{hr.no_of_posts}</p>
              </div>
              <div>
                <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Vacancy</h4>
                <p style={{ margin: 0, fontSize: '1.1rem' }}>{hr.vacancy}</p>
              </div>
              <div>
                <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Finish Date</h4>
                <p style={{ margin: 0, fontSize: '1.1rem' }}>
                  {hr.finish_date ? new Date(hr.finish_date).toLocaleDateString() : '-'}
                </p>
              </div>
              <div>
                <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Document</h4>
                {hr.file_url ? (
                  <a 
                    href={hr.file_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', textDecoration: 'none' }}
                  >
                    <FaFileDownload /> Download
                  </a>
                ) : (
                  <span style={{ color: 'var(--text-secondary)' }}>No document</span>
                )}
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
        </div>
      </div>
    </div>
  );
};

export default HRDetail;

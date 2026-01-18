import React, { useState, useEffect } from 'react';
import { FaPlus, FaSearch, FaUserTie } from 'react-icons/fa';
import client from '../api/client';
import CreateHRModal from './CreateHRModal';
import HRDetail from './HRDetail';

const HR = ({ projectId }) => {
  const [hrRecords, setHrRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedHR, setSelectedHR] = useState(null);

  const fetchHR = async () => {
    try {
      setLoading(true);
      const response = await client.get('projects/get_hr_func');
      // Filter by project ID since API returns all
      const projectHR = response.data.data.filter(
        h => h.project === parseInt(projectId)
      );
      setHrRecords(projectHR);
    } catch (error) {
      console.error('Error fetching HR records:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchHR();
    }
  }, [projectId]);

  const filteredHR = hrRecords.filter(hr => 
    hr.hr_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    hr.position?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading HR records...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <FaSearch style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            className="input-field"
            placeholder="Search HR records..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', paddingLeft: '2.5rem' }}
          />
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <FaPlus /> Add HR Record
        </button>
      </div>

      {filteredHR.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '4rem 2rem', 
          backgroundColor: 'var(--bg-secondary)', 
          borderRadius: '12px',
          border: '1px dashed var(--border-color)'
        }}>
          <FaUserTie style={{ fontSize: '3rem', color: 'var(--text-secondary)', marginBottom: '1rem', opacity: 0.5 }} />
          <h3 style={{ margin: '0 0 0.5rem 0' }}>No HR Records Found</h3>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            {searchTerm ? 'Try adjusting your search terms' : 'Add a new HR record to get started'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {filteredHR.map(hr => (
            <div
              key={hr.id}
              onClick={() => setSelectedHR(hr)}
              style={{
                backgroundColor: 'var(--bg-secondary)',
                padding: '1.5rem',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr',
                alignItems: 'center',
                gap: '1rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(10, 132, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary)'
                }}>
                  <FaUserTie />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{hr.hr_name}</h4>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{hr.position}</span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Vacancy</div>
                <div>{hr.vacancy}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Finish Date</div>
                <div>{hr.finish_date ? new Date(hr.finish_date).toLocaleDateString() : '-'}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Remarks</div>
                <div>{hr.hr_remarks?.length || 0}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateHRModal
          projectId={projectId}
          onClose={() => setShowCreateModal(false)}
          onCreated={fetchHR}
        />
      )}

      {selectedHR && (
        <HRDetail
          hr={selectedHR}
          projectId={projectId}
          onClose={() => setSelectedHR(null)}
        />
      )}
    </div>
  );
};

export default HR;

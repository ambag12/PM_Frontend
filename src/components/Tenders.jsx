import React, { useState, useEffect } from 'react';
import { FaPlus, FaSearch, FaFileContract } from 'react-icons/fa';
import client from '../api/client';
import CreateTenderModal from './CreateTenderModal';
import TenderDetail from './TenderDetail';

const Tenders = ({ projectId }) => {
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTender, setSelectedTender] = useState(null);

  const fetchTenders = async () => {
    try {
      setLoading(true);
      const response = await client.get('projects/get_tenders');
      // Filter tenders by project ID since API returns all
      const projectTenders = response.data.data.filter(
        t => t.project === parseInt(projectId)
      );
      setTenders(projectTenders);
    } catch (error) {
      console.error('Error fetching tenders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchTenders();
    }
  }, [projectId]);

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

  const filteredTenders = tenders.filter(tender => 
    tender.name_of_tenders?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tender.status?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading tenders...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <FaSearch style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            className="input-field"
            placeholder="Search tenders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', paddingLeft: '2.5rem' }}
          />
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <FaPlus /> Create Tender
        </button>
      </div>

      {filteredTenders.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '4rem 2rem', 
          backgroundColor: 'var(--bg-secondary)', 
          borderRadius: '12px',
          border: '1px dashed var(--border-color)'
        }}>
          <FaFileContract style={{ fontSize: '3rem', color: 'var(--text-secondary)', marginBottom: '1rem', opacity: 0.5 }} />
          <h3 style={{ margin: '0 0 0.5rem 0' }}>No Tenders Found</h3>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            {searchTerm ? 'Try adjusting your search terms' : 'Create a new tender to get started'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {filteredTenders.map(tender => (
            <div
              key={tender.id}
              onClick={() => setSelectedTender(tender)}
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
                  <FaFileContract />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{tender.name_of_tenders}</h4>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>ID: #{tender.id}</span>
                </div>
              </div>

              <div>
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
              </div>

              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Tech Opening</div>
                <div>{tender.tech_opeining || '-'}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Financial Opening</div>
                <div>{tender.financial_opening || '-'}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateTenderModal
          projectId={projectId}
          onClose={() => setShowCreateModal(false)}
          onCreated={fetchTenders}
        />
      )}

      {selectedTender && (
        <TenderDetail
          tender={selectedTender}
          projectId={projectId}
          onClose={() => setSelectedTender(null)}
          onUpdate={(updatedTender) => {
            setTenders(tenders.map(t => t.id === updatedTender.id ? updatedTender : t));
            setSelectedTender(updatedTender);
          }}
        />
      )}
    </div>
  );
};

export default Tenders;

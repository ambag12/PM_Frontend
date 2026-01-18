import React, { useEffect, useState, useContext } from 'react';
import client from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { FaPlus, FaFolder, FaSearch, FaSignOutAlt } from 'react-icons/fa';
import Header from '../components/Header';
import ActionBar from '../components/ActionBar';

const Dashboard = () => {
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { user, logout } = useContext(AuthContext);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await client.get('projects/list_project_for_user');
        setProjects(response.data);
      } catch (error) {
        console.error("Error fetching projects", error);
      }
    };

    if (user) {
      fetchProjects();
    }
  }, [user]);

  const filteredProjects = projects.filter(project =>
    !searchTerm ||
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <Header title="Project Management System" subtitle="Professional Project Tracking & Management" />

      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
        {/* Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 className="page-title">My Projects</h1>
            <p className="page-subtitle">Welcome back, {user?.full_name || 'User'}</p>
          </div>
          <button onClick={logout} className="btn btn-secondary">
            <FaSignOutAlt /> Logout
          </button>
        </div>

        {/* Statistics Overview */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{projects.length}</div>
            <div className="stat-label">Total Projects</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--status-completed)' }}>
              {projects.filter(p => p.is_private === false).length}
            </div>
            <div className="stat-label">Public Projects</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--status-progress)' }}>
              {projects.filter(p => p.is_private === true).length}
            </div>
            <div className="stat-label">Private Projects</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--action-green)' }}>
              {filteredProjects.length}
            </div>
            <div className="stat-label">Filtered Results</div>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: '2rem', position: 'relative', maxWidth: '600px' }}>
          <FaSearch style={{
            position: 'absolute',
            left: '1rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
            fontSize: '1rem'
          }} />
          <input
            type="text"
            className="input-field"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search projects by name, description, or slug..."
            style={{ paddingLeft: '3rem' }}
          />
        </div>

        {/* Projects Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {/* Create New Project Card */}
          <Link to="/create-project" className="card" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            borderStyle: 'dashed',
            borderColor: 'var(--action-green)',
            borderWidth: '2px',
            cursor: 'pointer',
            minHeight: '220px',
            background: 'var(--bg-white)',
            textDecoration: 'none',
            color: 'inherit',
            transition: 'all 0.3s ease'
          }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--accent-cream)';
              e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg-white)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'var(--action-green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              boxShadow: 'var(--shadow-md)'
            }}>
              <FaPlus color="white" size={24} />
            </div>
            <span style={{ fontWeight: '600', fontSize: '1.1rem', color: 'var(--text-dark)' }}>Create New Project</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Start a new project</span>
          </Link>

          {/* Project Cards */}
          {filteredProjects.map((project) => (
            <Link to={`/project/${project.id}`} key={project.id} style={{ textDecoration: 'none' }}>
              <div className="card" style={{
                minHeight: '220px',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column'
              }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: 'var(--radius-lg)',
                    background: 'linear-gradient(135deg, var(--primary-green), var(--action-green))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '1rem',
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    <FaFolder color="white" size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>
                      {project.name}
                    </h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{project.slug}</span>
                  </div>
                </div>

                <p style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.9rem',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  flex: 1,
                  marginBottom: '1rem'
                }}>
                  {project.description || "No description provided."}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {project.is_private ? '🔒 Private' : '🌐 Public'}
                  </span>
                  <span style={{
                    background: 'var(--accent-cream)',
                    padding: '0.25rem 0.75rem',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: 'var(--text-dark)'
                  }}>
                    View Details →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filteredProjects.length === 0 && searchTerm && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '1.1rem' }}>No projects found matching "{searchTerm}"</p>
            <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Try adjusting your search terms</p>
          </div>
        )}
      </div>

      <ActionBar
        onNotesClick={() => console.log('Notes')}
        onRemarksClick={() => console.log('Remarks')}
        onPicturesClick={() => console.log('Pictures')}
        onReportClick={() => console.log('Report')}
        onEmailsClick={() => console.log('Emails')}
      />
    </div>
  );
};

export default Dashboard;


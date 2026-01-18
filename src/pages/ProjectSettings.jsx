import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { FaArrowLeft, FaUserPlus, FaTrash, FaCalendarAlt, FaFileUpload, FaFileDownload } from 'react-icons/fa';

const ProjectSettings = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    role: '',
  });
  const [dueDate, setDueDate] = useState('');
  const [pc1File, setPc1File] = useState(null);
  const [uploadingPc1, setUploadingPc1] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch project details
        const projectRes = await client.get(`projects/${id}`);
        setProject(projectRes.data);
        if (projectRes.data.due_date) {
          setDueDate(projectRes.data.due_date);
        }

        // Fetch members
        const membersRes = await client.get(`memberships?project=${id}`);
        setMembers(membersRes.data);

        // Fetch roles
        const rolesRes = await client.get(`roles?project=${id}`);
        setRoles(rolesRes.data);
        
        if (rolesRes.data.length > 0) {
          setFormData(prev => ({ ...prev, role: rolesRes.data[0].id }));
        }
      } catch (err) {
        console.error("Failed to fetch data", err);
        setError("Could not load project settings.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleAddMember = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await client.post('memberships', {
        project: parseInt(id),
        role: parseInt(formData.role),
        username: formData.username,
      });

      // Refresh members list
      const membersRes = await client.get(`memberships?project=${id}`);
      setMembers(membersRes.data);

      // Reset form
      setFormData({ username: '', role: roles[0]?.id || '' });
    } catch (err) {
      console.error("Failed to add member", err);
      setError(err.response?.data?._error_message || "Failed to add member. Please check the username.");
    }
  };

  const handleRemoveMember = async (membershipId) => {
    if (!window.confirm("Are you sure you want to remove this member?")) return;

    try {
      await client.delete(`memberships/${membershipId}`);
      setMembers(members.filter(m => m.id !== membershipId));
    } catch (err) {
      console.error("Failed to remove member", err);
      setError("Failed to remove member.");
    }
  };

  const handleUpdateDueDate = async () => {
    try {
      // Format date to match backend expectation: YYYY-MM-DD HH:MM:SS.ssssss±HHMM
      // Creating a dummy time and timezone for simplicity as the input is just date
      const dateObj = new Date(dueDate);
      const formattedDate = dateObj.toISOString().replace('T', ' ').replace('Z', '.000000+0000');

      await client.patch(`projects/${id}/change_due_date`, {
        due_date: formattedDate
      });
      alert('Due date updated successfully!');
    } catch (err) {
      console.error("Failed to update due date", err);
      setError("Failed to update due date. Please check the format.");
    }
  };

  const handleUploadPC1 = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingPc1(true);
    try {
      const data = new FormData();
      data.append('pc1', file);
      data.append('project_id', id);

      const response = await client.post('projects/upload_pc1', data, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Update project with new PC1 URL
      setProject(prev => ({ ...prev, pc1_url: response.data }));
      alert('PC1 uploaded successfully!');
    } catch (err) {
      console.error("Failed to upload PC1", err);
      setError("Failed to upload PC1 document.");
    } finally {
      setUploadingPc1(false);
    }
  };

  if (loading) return <div className="container" style={{textAlign: 'center', marginTop: '2rem'}}>Loading...</div>;

  return (
    <div className="container">
      <button onClick={() => navigate(`/project/${id}`)} className="btn" style={{ marginBottom: '1rem', background: 'transparent', paddingLeft: 0 }}>
        <FaArrowLeft /> Back to Project
      </button>

      <h2>Project Settings</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>{project?.name}</p>

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

      {/* Project Details Section */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1.5rem' }}>Project Details</h3>
        
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
            <FaCalendarAlt style={{ marginRight: '0.5rem' }} /> Due Date
          </label>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <input
              type="date"
              className="input-field"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            <button onClick={handleUpdateDueDate} className="btn btn-primary">
              Update
            </button>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
            <FaFileUpload style={{ marginRight: '0.5rem' }} /> PC1 Document
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <input
              type="file"
              id="pc1-upload"
              onChange={handleUploadPC1}
              style={{ display: 'none' }}
            />
            <button 
              onClick={() => document.getElementById('pc1-upload').click()} 
              className="btn btn-secondary"
              disabled={uploadingPc1}
            >
              {uploadingPc1 ? 'Uploading...' : 'Upload PC1'}
            </button>
            
            {project?.pc1_url && (
              <a 
                href={project.pc1_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn"
                style={{ background: 'rgba(10, 132, 255, 0.1)', color: 'var(--primary)' }}
              >
                <FaFileDownload /> View PC1
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Add Member Section */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1.5rem' }}><FaUserPlus /> Add Member</h3>
        <form onSubmit={handleAddMember}>
          <div className="input-group">
            <label className="input-label">Username or Email</label>
            <input
              type="text"
              className="input-field"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="Enter username or email"
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Role</label>
            <select
              className="input-field"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              style={{ width: '100%', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            >
              {roles.map(role => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn btn-primary">Add Member</button>
        </form>
      </div>

      {/* Members List */}
      <div className="card">
        <h3 style={{ marginBottom: '1.5rem' }}>Project Members</h3>
        {members.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No members yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {members.map(member => (
              <div 
                key={member.id} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '1rem',
                  background: 'var(--bg-secondary)',
                  borderRadius: '8px'
                }}
              >
                <div>
                  <strong>{member.full_name || member.user?.username || member.email}</strong>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
                    Role: {member.role_name}
                  </p>
                </div>
                <button 
                  onClick={() => handleRemoveMember(member.id)}
                  className="btn"
                  style={{ background: 'rgba(255, 59, 48, 0.1)', color: 'var(--error)' }}
                >
                  <FaTrash />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectSettings;

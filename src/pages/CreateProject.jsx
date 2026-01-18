import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { FaProjectDiagram, FaCheck, FaArrowLeft } from 'react-icons/fa';

const CreateProject = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    creation_template: '',
    is_private: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await client.get('project-templates');
        setTemplates(response.data);
        if (response.data.length > 0) {
          setFormData(prev => ({ ...prev, creation_template: response.data[0].id }));
        }
      } catch (err) {
        console.error("Failed to fetch templates", err);
        setError("Could not load project templates.");
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('creation_template', formData.creation_template);
      formDataToSend.append('is_private', formData.is_private);

      const response = await client.post('projects', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      navigate(`/project/${response.data.id}`);
    } catch (err) {
      console.error("Create project failed", err);
      setError(err.response?.data?._error_message || "Failed to create project. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="container" style={{textAlign: 'center', marginTop: '2rem'}}>Loading templates...</div>;

  return (
    <div className="container">
      <button onClick={() => navigate('/')} className="btn" style={{ marginBottom: '1rem', background: 'transparent', paddingLeft: 0 }}>
        <FaArrowLeft /> Back to Dashboard
      </button>
      
      <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ 
            width: '60px', 
            height: '60px', 
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            margin: '0 auto 1rem'
          }}>
            <FaProjectDiagram />
          </div>
          <h2>Create New Project</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Start a new journey with your team</p>
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

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Project Name</label>
            <input
              type="text"
              className="input-field"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Website Redesign"
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Description</label>
            <textarea
              className="input-field"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What is this project about?"
              rows="3"
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Template</label>
            <select
              className="input-field"
              value={formData.creation_template}
              onChange={(e) => setFormData({ ...formData, creation_template: e.target.value })}
              style={{ width: '100%', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            >
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              {templates.find(t => t.id == formData.creation_template)?.description}
            </p>
          </div>

          <div className="input-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0' }}>
            <input
              type="checkbox"
              id="is_private"
              checked={formData.is_private}
              onChange={(e) => setFormData({ ...formData, is_private: e.target.checked })}
              style={{ width: '18px', height: '18px' }}
            />
            <label htmlFor="is_private" style={{ margin: 0, cursor: 'pointer' }}>
              Make this project private
            </label>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '1rem' }}
            disabled={submitting}
          >
            {submitting ? 'Creating...' : 'Create Project'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateProject;

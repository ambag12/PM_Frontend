import React, { useState, useEffect } from 'react';
import { FaTimes, FaComment, FaBuilding, FaUserTie } from 'react-icons/fa';
import client from '../api/client';

const CreateRemarksModal = ({ onClose, onCreated }) => {
    const [projects, setProjects] = useState([]);
    const [allHrRecords, setAllHrRecords] = useState([]);
    const [filteredHrRecords, setFilteredHrRecords] = useState([]);

    const [selectedProject, setSelectedProject] = useState('');
    const [selectedHR, setSelectedHR] = useState('');
    const [remarks, setRemarks] = useState('');

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                // Fetch projects
                const projectsRes = await client.get('projects');
                setProjects(projectsRes.data || []);

                // Fetch all HR records
                const hrRes = await client.get('projects/get_hr_func');
                setAllHrRecords(hrRes.data.data || []);

            } catch (err) {
                console.error('Error fetching data:', err);
                setError('Failed to load data. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Filter HR records when project changes
    useEffect(() => {
        if (selectedProject) {
            const filtered = allHrRecords.filter(
                hr => hr.project === parseInt(selectedProject)
            );
            setFilteredHrRecords(filtered);
            setSelectedHR(''); // Reset HR selection when project changes
        } else {
            setFilteredHrRecords([]);
            setSelectedHR('');
        }
    }, [selectedProject, allHrRecords]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedProject || !selectedHR || !remarks.trim()) {
            setError('Please fill in all fields.');
            return;
        }

        try {
            setSubmitting(true);
            setError('');

            await client.post('projects/create_remarks', {
                project: parseInt(selectedProject),
                hr: parseInt(selectedHR),
                remarks: remarks.trim()
            });

            if (onCreated) onCreated();
            onClose();
        } catch (err) {
            console.error('Error creating remark:', err);
            setError(err.response?.data?.message || 'Failed to create remark. Please try again.');
        } finally {
            setSubmitting(false);
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
                maxWidth: '500px',
                borderRadius: '16px',
                border: '1px solid var(--border-light)',
                boxShadow: 'var(--shadow-xl)',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid var(--border-light)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: 'var(--bg-secondary)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: 'var(--radius-md)',
                            background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white'
                        }}>
                            <FaComment />
                        </div>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-heading)' }}>Add Remark</h2>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            padding: '0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            transition: 'background var(--transition-fast)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--neutral-100)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    >
                        <FaTimes size={18} />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                            Loading...
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {error && (
                                <div style={{
                                    padding: '0.75rem 1rem',
                                    backgroundColor: 'var(--error-light)',
                                    color: 'var(--error)',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: '0.875rem'
                                }}>
                                    {error}
                                </div>
                            )}

                            {/* Project Dropdown */}
                            <div>
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    marginBottom: '0.5rem',
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    color: 'var(--text-primary)'
                                }}>
                                    <FaBuilding style={{ color: 'var(--primary-500)' }} />
                                    Project
                                </label>
                                <select
                                    value={selectedProject}
                                    onChange={(e) => setSelectedProject(e.target.value)}
                                    className="form-input"
                                    style={{ width: '100%' }}
                                    required
                                >
                                    <option value="">Select a project...</option>
                                    {projects.map(project => (
                                        <option key={project.id} value={project.id}>
                                            {project.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* HR Dropdown */}
                            <div>
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    marginBottom: '0.5rem',
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    color: 'var(--text-primary)'
                                }}>
                                    <FaUserTie style={{ color: 'var(--primary-500)' }} />
                                    HR Linked to Project
                                </label>
                                <select
                                    value={selectedHR}
                                    onChange={(e) => setSelectedHR(e.target.value)}
                                    className="form-input"
                                    style={{ width: '100%' }}
                                    disabled={!selectedProject}
                                    required
                                >
                                    <option value="">
                                        {!selectedProject
                                            ? 'Select a project first...'
                                            : filteredHrRecords.length === 0
                                                ? 'No HR linked to this project'
                                                : 'Select an HR...'}
                                    </option>
                                    {filteredHrRecords.map(hr => (
                                        <option key={hr.id} value={hr.id}>
                                            {hr.hr_name} - {hr.position || 'No Position'}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Remarks Text */}
                            <div>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '0.5rem',
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    color: 'var(--text-primary)'
                                }}>
                                    Remark
                                </label>
                                <textarea
                                    value={remarks}
                                    onChange={(e) => setRemarks(e.target.value)}
                                    className="form-input"
                                    placeholder="Enter your remark..."
                                    rows={4}
                                    style={{ width: '100%', resize: 'vertical' }}
                                    required
                                />
                            </div>

                            {/* Submit Button */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={onClose}
                                    disabled={submitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={submitting || !selectedProject || !selectedHR || !remarks.trim()}
                                >
                                    {submitting ? 'Submitting...' : 'Add Remark'}
                                </button>
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default CreateRemarksModal;

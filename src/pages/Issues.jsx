import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaPlus, FaFilter, FaSearch, FaExclamationTriangle, FaExclamationCircle, FaBug } from 'react-icons/fa';
import { issueService, projectService } from '../api/services';
import { PermissionProvider, PermissionGate } from '../context/PermissionContext';
import { Card, Button, Badge, Modal, Avatar, Tabs } from '../components/UI';

const Issues = () => {
    const { id: projectId } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newIssue, setNewIssue] = useState({ subject: '', description: '', priority: 3, severity: 3, type: null });
    const [activeTab, setActiveTab] = useState('all');

    useEffect(() => {
        fetchData();
    }, [projectId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [projectRes, issuesRes] = await Promise.all([
                projectService.get(projectId),
                issueService.list({ project: projectId })
            ]);
            setProject(projectRes.data);
            setIssues(issuesRes.data);
        } catch (error) {
            console.error('Error fetching issues data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateIssue = async () => {
        try {
            await issueService.create({
                project: projectId,
                subject: newIssue.subject,
                description: newIssue.description,
                priority: newIssue.priority,
                severity: newIssue.severity,
            });
            setShowCreateModal(false);
            setNewIssue({ subject: '', description: '', priority: 3, severity: 3 });
            fetchData();
        } catch (error) {
            console.error('Error creating issue:', error);
        }
    };

    const tabs = [
        { id: 'all', label: 'All Issues', badge: issues.length },
        { id: 'open', label: 'Open', badge: issues.filter(i => !i.is_closed).length },
        { id: 'closed', label: 'Closed', badge: issues.filter(i => i.is_closed).length },
    ];

    const filteredIssues = issues.filter(issue => {
        const matchesSearch = issue.subject.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTab = activeTab === 'all' ||
            (activeTab === 'open' && !issue.is_closed) ||
            (activeTab === 'closed' && issue.is_closed);
        return matchesSearch && matchesTab;
    });

    const getPriorityIcon = (priority) => {
        if (priority >= 4) return <FaExclamationTriangle style={{ color: 'var(--priority-high)' }} />;
        if (priority >= 3) return <FaExclamationCircle style={{ color: 'var(--priority-normal)' }} />;
        return <FaBug style={{ color: 'var(--priority-low)' }} />;
    };

    const getPriorityLabel = (priority) => {
        if (priority >= 4) return 'High';
        if (priority >= 3) return 'Normal';
        return 'Low';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center" style={{ minHeight: '400px' }}>
                <div className="spinner spinner-lg" />
            </div>
        );
    }

    return (
        <PermissionProvider project={project}>
            <div className="page-header">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="page-title">Issues</h1>
                        <p className="page-subtitle">{project?.name} • {issues.length} total issues</p>
                    </div>
                    <PermissionGate resourceType="issue" action="add">
                        <Button
                            variant="primary"
                            icon={<FaPlus />}
                            onClick={() => setShowCreateModal(true)}
                        >
                            Report Issue
                        </Button>
                    </PermissionGate>
                </div>
            </div>

            {/* Tabs */}
            <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

            {/* Search */}
            <div className="mb-6">
                <div className="form-input-icon" style={{ maxWidth: '400px' }}>
                    <FaSearch className="icon" />
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Search issues..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ paddingLeft: '2.75rem' }}
                    />
                </div>
            </div>

            {/* Issues List */}
            <Card>
                {filteredIssues.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🐛</div>
                        <h3 className="empty-state-title">No Issues Found</h3>
                        <p className="empty-state-description">
                            {searchTerm ? 'No issues match your search.' : 'No issues have been reported yet.'}
                        </p>
                        {!searchTerm && (
                            <PermissionGate resourceType="issue" action="add">
                                <Button
                                    variant="primary"
                                    icon={<FaPlus />}
                                    onClick={() => setShowCreateModal(true)}
                                >
                                    Report First Issue
                                </Button>
                            </PermissionGate>
                        )}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                        {filteredIssues.map((issue) => (
                            <div
                                key={issue.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    padding: '1rem',
                                    borderBottom: '1px solid var(--border-light)',
                                    cursor: 'pointer',
                                    transition: 'background var(--transition-fast)',
                                }}
                                className="hover-bg"
                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--neutral-50)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                onClick={() => navigate(`/project/${projectId}/issue/${issue.ref}`)}
                            >
                                {/* Priority Icon */}
                                <div style={{ flexShrink: 0 }}>
                                    {getPriorityIcon(issue.priority)}
                                </div>

                                {/* Issue Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                                            #{issue.ref}
                                        </span>
                                        <span className="font-medium truncate">{issue.subject}</span>
                                    </div>
                                    <div className="flex items-center gap-3" style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                        <Badge variant={issue.is_closed ? 'success' : 'info'}>
                                            {issue.status_extra_info?.name || (issue.is_closed ? 'Closed' : 'Open')}
                                        </Badge>
                                        {issue.type_extra_info && (
                                            <span>{issue.type_extra_info.name}</span>
                                        )}
                                        {issue.severity_extra_info && (
                                            <span>Severity: {issue.severity_extra_info.name}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Assigned To */}
                                <div style={{ flexShrink: 0 }}>
                                    {issue.assigned_to_extra_info ? (
                                        <Avatar
                                            name={issue.assigned_to_extra_info.full_name_display}
                                            size="sm"
                                        />
                                    ) : (
                                        <span className="text-muted text-sm">Unassigned</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Create Issue Modal */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title="Report Issue"
                size="lg"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleCreateIssue}
                            disabled={!newIssue.subject.trim()}
                        >
                            Create Issue
                        </Button>
                    </>
                }
            >
                <div className="form-group">
                    <label className="form-label">Subject *</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Brief description of the issue..."
                        value={newIssue.subject}
                        onChange={(e) => setNewIssue({ ...newIssue, subject: e.target.value })}
                        autoFocus
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea
                        className="form-input"
                        placeholder="Detailed description, steps to reproduce..."
                        value={newIssue.description}
                        onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
                        rows={5}
                    />
                </div>
                <div className="flex gap-4">
                    <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">Priority</label>
                        <select
                            className="form-input"
                            value={newIssue.priority}
                            onChange={(e) => setNewIssue({ ...newIssue, priority: parseInt(e.target.value) })}
                        >
                            <option value={1}>Low</option>
                            <option value={3}>Normal</option>
                            <option value={5}>High</option>
                        </select>
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">Severity</label>
                        <select
                            className="form-input"
                            value={newIssue.severity}
                            onChange={(e) => setNewIssue({ ...newIssue, severity: parseInt(e.target.value) })}
                        >
                            <option value={1}>Wishlist</option>
                            <option value={2}>Minor</option>
                            <option value={3}>Normal</option>
                            <option value={4}>Important</option>
                            <option value={5}>Critical</option>
                        </select>
                    </div>
                </div>
            </Modal>
        </PermissionProvider>
    );
};

export default Issues;

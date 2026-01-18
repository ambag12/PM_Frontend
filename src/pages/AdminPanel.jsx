import React, { useState, useEffect } from 'react';
import { FaUsers, FaFolder, FaFileAlt, FaCog, FaSearch, FaPlus, FaEdit, FaTrash, FaEye } from 'react-icons/fa';
import { userService, projectTemplateService, projectService } from '../api/services';
import { Card, Button, Badge, Modal, Tabs, Avatar } from '../components/UI';

const AdminPanel = () => {
    const [activeTab, setActiveTab] = useState('users');
    const [users, setUsers] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        try {
            setLoading(true);

            if (activeTab === 'users') {
                const response = await userService.list();
                setUsers(response.data);
            } else if (activeTab === 'templates') {
                const response = await projectTemplateService.list();
                setTemplates(response.data);
            } else if (activeTab === 'projects') {
                const response = await projectService.list();
                setProjects(response.data);
            }
        } catch (error) {
            console.error('Error fetching admin data:', error);
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'users', label: 'Users', icon: <FaUsers />, badge: users.length || undefined },
        { id: 'templates', label: 'Templates', icon: <FaFileAlt /> },
        { id: 'projects', label: 'All Projects', icon: <FaFolder /> },
        { id: 'settings', label: 'Settings', icon: <FaCog /> },
    ];

    const filteredUsers = users.filter(user =>
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredProjects = projects.filter(project =>
        project.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center" style={{ minHeight: '400px' }}>
                <div className="spinner spinner-lg" />
            </div>
        );
    }

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Admin Panel</h1>
                <p className="page-subtitle">Manage users, templates, and system settings</p>
            </div>

            {/* Stats Overview */}
            <div className="stats-grid mb-6">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'var(--primary-50)', color: 'var(--primary-600)' }}>
                        <FaUsers />
                    </div>
                    <div className="stat-value">{users.length}</div>
                    <div className="stat-label">Total Users</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'var(--info-light)', color: 'var(--info)' }}>
                        <FaFolder />
                    </div>
                    <div className="stat-value">{projects.length}</div>
                    <div className="stat-label">Total Projects</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}>
                        <FaFileAlt />
                    </div>
                    <div className="stat-value">{templates.length}</div>
                    <div className="stat-label">Templates</div>
                </div>
            </div>

            {/* Tabs */}
            <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

            {/* Search Bar */}
            {(activeTab === 'users' || activeTab === 'projects') && (
                <div className="mb-6">
                    <div className="form-input-icon" style={{ maxWidth: '400px' }}>
                        <FaSearch className="icon" />
                        <input
                            type="text"
                            className="form-input"
                            placeholder={`Search ${activeTab}...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ paddingLeft: '2.75rem' }}
                        />
                    </div>
                </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
                <Card>
                    {filteredUsers.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">👥</div>
                            <h3 className="empty-state-title">No Users Found</h3>
                            <p className="empty-state-description">
                                {searchTerm ? 'No users match your search.' : 'No users in the system.'}
                            </p>
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Username</th>
                                    <th>Email</th>
                                    <th>Status</th>
                                    <th>Joined</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((user) => (
                                    <tr key={user.id}>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <Avatar name={user.full_name} src={user.photo} size="md" />
                                                <span className="font-medium">{user.full_name}</span>
                                            </div>
                                        </td>
                                        <td>@{user.username}</td>
                                        <td>{user.email}</td>
                                        <td>
                                            <Badge variant={user.is_active ? 'success' : 'error'}>
                                                {user.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </td>
                                        <td className="text-muted">
                                            {new Date(user.date_joined).toLocaleDateString()}
                                        </td>
                                        <td>
                                            <div className="flex gap-2">
                                                <button className="btn btn-ghost btn-icon" title="View">
                                                    <FaEye />
                                                </button>
                                                <button className="btn btn-ghost btn-icon" title="Edit">
                                                    <FaEdit />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </Card>
            )}

            {/* Templates Tab */}
            {activeTab === 'templates' && (
                <div>
                    <div className="flex justify-end mb-4">
                        <Button variant="primary" icon={<FaPlus />}>
                            Create Template
                        </Button>
                    </div>
                    {templates.length === 0 ? (
                        <Card>
                            <div className="empty-state">
                                <div className="empty-state-icon">📋</div>
                                <h3 className="empty-state-title">No Templates</h3>
                                <p className="empty-state-description">
                                    Create project templates to speed up project creation.
                                </p>
                                <Button variant="primary" icon={<FaPlus />}>
                                    Create First Template
                                </Button>
                            </div>
                        </Card>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                            gap: '1.5rem'
                        }}>
                            {templates.map((template) => (
                                <Card key={template.id} clickable>
                                    <h3 className="font-semibold mb-2">{template.name}</h3>
                                    <p className="text-sm text-muted mb-4">{template.description || 'No description'}</p>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted">
                                            Created: {new Date(template.created_date).toLocaleDateString()}
                                        </span>
                                        <div className="flex gap-2">
                                            <button className="btn btn-ghost btn-icon btn-sm">
                                                <FaEdit />
                                            </button>
                                            <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--error)' }}>
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Projects Tab */}
            {activeTab === 'projects' && (
                <Card>
                    {filteredProjects.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">📁</div>
                            <h3 className="empty-state-title">No Projects Found</h3>
                            <p className="empty-state-description">
                                {searchTerm ? 'No projects match your search.' : 'No projects in the system.'}
                            </p>
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Project</th>
                                    <th>Owner</th>
                                    <th>Members</th>
                                    <th>Created</th>
                                    <th>Status</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProjects.map((project) => (
                                    <tr key={project.id}>
                                        <td>
                                            <div>
                                                <span className="font-medium">{project.name}</span>
                                                {project.is_private && (
                                                    <Badge variant="info" style={{ marginLeft: '0.5rem', fontSize: '0.625rem' }}>
                                                        Private
                                                    </Badge>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <Avatar
                                                    name={project.owner?.full_name_display}
                                                    size="sm"
                                                />
                                                <span className="text-sm">{project.owner?.full_name_display}</span>
                                            </div>
                                        </td>
                                        <td>{project.total_memberships || 0}</td>
                                        <td className="text-muted text-sm">
                                            {new Date(project.created_date).toLocaleDateString()}
                                        </td>
                                        <td>
                                            <Badge variant={project.is_backlog_activated ? 'success' : 'info'}>
                                                Active
                                            </Badge>
                                        </td>
                                        <td>
                                            <button className="btn btn-ghost btn-icon" title="View">
                                                <FaEye />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </Card>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
                <Card>
                    <h3 className="text-lg font-semibold mb-4">System Settings</h3>
                    <p className="text-muted">
                        System configuration options will be available here.
                    </p>
                    <div className="mt-6">
                        <div
                            style={{
                                padding: '1rem',
                                background: 'var(--warning-light)',
                                borderRadius: 'var(--radius-md)',
                                color: 'var(--warning)',
                            }}
                        >
                            ⚠️ Settings management requires SuperAdmin privileges.
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default AdminPanel;

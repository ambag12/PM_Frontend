import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaPlus, FaFilter, FaSearch, FaEllipsisH, FaGripVertical, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import { userStoryService, projectService } from '../api/services';
import { PermissionProvider, PermissionGate } from '../context/PermissionContext';
import { Card, Button, Badge, Modal, Avatar, Dropdown, DropdownItem, Tabs } from '../components/UI';

const Backlog = () => {
    const { id: projectId } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [userStories, setUserStories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newStory, setNewStory] = useState({ subject: '', description: '' });

    useEffect(() => {
        fetchData();
    }, [projectId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [projectRes, storiesRes] = await Promise.all([
                projectService.get(projectId),
                userStoryService.list({ project: projectId })
            ]);
            setProject(projectRes.data);
            setUserStories(storiesRes.data);
        } catch (error) {
            console.error('Error fetching backlog data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateStory = async () => {
        try {
            await userStoryService.create({
                project: projectId,
                subject: newStory.subject,
                description: newStory.description,
            });
            setShowCreateModal(false);
            setNewStory({ subject: '', description: '' });
            fetchData();
        } catch (error) {
            console.error('Error creating user story:', error);
        }
    };

    const filteredStories = userStories.filter(story => {
        const matchesSearch = story.subject.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterStatus === 'all' || story.status_extra_info?.name?.toLowerCase() === filterStatus;
        return matchesSearch && matchesFilter;
    });

    const getStatusColor = (statusName) => {
        const colors = {
            'new': 'var(--status-new)',
            'ready': 'var(--status-ready)',
            'in progress': 'var(--status-progress)',
            'ready for test': 'var(--status-testing)',
            'done': 'var(--status-done)',
            'archived': 'var(--status-archived)',
        };
        return colors[statusName?.toLowerCase()] || 'var(--neutral-500)';
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
                        <h1 className="page-title">Backlog</h1>
                        <p className="page-subtitle">{project?.name} • {userStories.length} user stories</p>
                    </div>
                    <PermissionGate resourceType="us" action="add">
                        <Button
                            variant="primary"
                            icon={<FaPlus />}
                            onClick={() => setShowCreateModal(true)}
                        >
                            New User Story
                        </Button>
                    </PermissionGate>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="flex gap-4 mb-6" style={{ flexWrap: 'wrap' }}>
                <div className="form-input-icon" style={{ flex: '1', minWidth: '250px' }}>
                    <FaSearch className="icon" />
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Search user stories..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ paddingLeft: '2.75rem' }}
                    />
                </div>
                <select
                    className="form-input"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={{ width: 'auto', minWidth: '150px' }}
                >
                    <option value="all">All Statuses</option>
                    <option value="new">New</option>
                    <option value="ready">Ready</option>
                    <option value="in progress">In Progress</option>
                    <option value="ready for test">Ready for Test</option>
                    <option value="done">Done</option>
                </select>
            </div>

            {/* Backlog Table */}
            <Card>
                {filteredStories.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📋</div>
                        <h3 className="empty-state-title">No User Stories Found</h3>
                        <p className="empty-state-description">
                            {searchTerm ? 'No stories match your search criteria.' : 'Start by creating your first user story.'}
                        </p>
                        {!searchTerm && (
                            <PermissionGate resourceType="us" action="add">
                                <Button
                                    variant="primary"
                                    icon={<FaPlus />}
                                    onClick={() => setShowCreateModal(true)}
                                >
                                    Create User Story
                                </Button>
                            </PermissionGate>
                        )}
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ width: '50px' }}>#</th>
                                <th>Subject</th>
                                <th style={{ width: '120px' }}>Status</th>
                                <th style={{ width: '100px' }}>Points</th>
                                <th style={{ width: '150px' }}>Assigned</th>
                                <th style={{ width: '50px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStories.map((story, index) => (
                                <tr
                                    key={story.id}
                                    onClick={() => navigate(`/project/${projectId}/story/${story.ref}`)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <td>
                                        <span style={{ color: 'var(--text-tertiary)', fontWeight: 500 }}>
                                            #{story.ref}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="font-medium">{story.subject}</div>
                                        {story.tags?.length > 0 && (
                                            <div className="flex gap-1 mt-1">
                                                {story.tags.slice(0, 3).map((tag, i) => (
                                                    <span
                                                        key={i}
                                                        className="badge"
                                                        style={{
                                                            fontSize: '0.625rem',
                                                            background: tag[1] || 'var(--neutral-200)',
                                                            color: 'white',
                                                        }}
                                                    >
                                                        {tag[0]}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <Badge>{story.status_extra_info?.name || 'New'}</Badge>
                                    </td>
                                    <td>
                                        <span className="font-semibold" style={{ color: 'var(--primary-700)' }}>
                                            {story.total_points || '-'}
                                        </span>
                                    </td>
                                    <td>
                                        {story.assigned_to_extra_info ? (
                                            <div className="flex items-center gap-2">
                                                <Avatar
                                                    name={story.assigned_to_extra_info.full_name_display}
                                                    size="sm"
                                                />
                                                <span className="text-sm truncate" style={{ maxWidth: '100px' }}>
                                                    {story.assigned_to_extra_info.full_name_display}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-muted text-sm">Unassigned</span>
                                        )}
                                    </td>
                                    <td onClick={(e) => e.stopPropagation()}>
                                        <Dropdown
                                            trigger={
                                                <button className="btn btn-ghost btn-icon">
                                                    <FaEllipsisH />
                                                </button>
                                            }
                                        >
                                            <DropdownItem onClick={() => navigate(`/project/${projectId}/story/${story.ref}`)}>
                                                View Details
                                            </DropdownItem>
                                            <PermissionGate resourceType="us" action="modify">
                                                <DropdownItem>Edit</DropdownItem>
                                            </PermissionGate>
                                            <PermissionGate resourceType="us" action="delete">
                                                <DropdownItem danger>Delete</DropdownItem>
                                            </PermissionGate>
                                        </Dropdown>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </Card>

            {/* Create Story Modal */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title="Create User Story"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleCreateStory}
                            disabled={!newStory.subject.trim()}
                        >
                            Create Story
                        </Button>
                    </>
                }
            >
                <div className="form-group">
                    <label className="form-label">Subject *</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="As a user, I want to..."
                        value={newStory.subject}
                        onChange={(e) => setNewStory({ ...newStory, subject: e.target.value })}
                        autoFocus
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea
                        className="form-input"
                        placeholder="Provide additional details..."
                        value={newStory.description}
                        onChange={(e) => setNewStory({ ...newStory, description: e.target.value })}
                        rows={4}
                    />
                </div>
            </Modal>
        </PermissionProvider>
    );
};

export default Backlog;

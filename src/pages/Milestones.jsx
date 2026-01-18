import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FaPlus, FaFlag, FaCalendarAlt, FaCheckCircle, FaCircle, FaEdit, FaTrash } from 'react-icons/fa';
import { milestoneService, projectService } from '../api/services';
import { PermissionProvider, PermissionGate } from '../context/PermissionContext';
import { Card, Button, Badge, Modal, Dropdown, DropdownItem } from '../components/UI';

const Milestones = () => {
    const { id: projectId } = useParams();
    const [project, setProject] = useState(null);
    const [milestones, setMilestones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newMilestone, setNewMilestone] = useState({
        name: '',
        estimated_start: '',
        estimated_finish: ''
    });

    useEffect(() => {
        fetchData();
    }, [projectId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [projectRes, milestonesRes] = await Promise.all([
                projectService.get(projectId),
                milestoneService.list({ project: projectId })
            ]);
            setProject(projectRes.data);
            setMilestones(milestonesRes.data);
        } catch (error) {
            console.error('Error fetching milestones:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateMilestone = async () => {
        try {
            await milestoneService.create({
                project: projectId,
                name: newMilestone.name,
                estimated_start: newMilestone.estimated_start,
                estimated_finish: newMilestone.estimated_finish,
            });
            setShowCreateModal(false);
            setNewMilestone({ name: '', estimated_start: '', estimated_finish: '' });
            fetchData();
        } catch (error) {
            console.error('Error creating milestone:', error);
        }
    };

    const handleDeleteMilestone = async (milestoneId) => {
        if (!window.confirm('Are you sure you want to delete this milestone?')) return;

        try {
            await milestoneService.delete(milestoneId);
            fetchData();
        } catch (error) {
            console.error('Error deleting milestone:', error);
        }
    };

    const getProgress = (milestone) => {
        if (!milestone.total_points || milestone.total_points === 0) return 0;
        return Math.round((milestone.closed_points / milestone.total_points) * 100);
    };

    const getDaysRemaining = (estimatedFinish) => {
        if (!estimatedFinish) return null;
        const finish = new Date(estimatedFinish);
        const today = new Date();
        const diff = Math.ceil((finish - today) / (1000 * 60 * 60 * 24));
        return diff;
    };

    const getStatusBadge = (milestone) => {
        if (milestone.closed) {
            return <Badge variant="success">Completed</Badge>;
        }
        const days = getDaysRemaining(milestone.estimated_finish);
        if (days !== null && days < 0) {
            return <Badge variant="error">Overdue</Badge>;
        }
        if (days !== null && days <= 7) {
            return <Badge variant="warning">Due Soon</Badge>;
        }
        return <Badge variant="info">Active</Badge>;
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
                        <h1 className="page-title">Milestones</h1>
                        <p className="page-subtitle">{project?.name} • {milestones.length} milestones</p>
                    </div>
                    <PermissionGate resourceType="milestone" action="add">
                        <Button
                            variant="primary"
                            icon={<FaPlus />}
                            onClick={() => setShowCreateModal(true)}
                        >
                            New Milestone
                        </Button>
                    </PermissionGate>
                </div>
            </div>

            {/* Milestones List */}
            {milestones.length === 0 ? (
                <Card>
                    <div className="empty-state">
                        <div className="empty-state-icon">🏁</div>
                        <h3 className="empty-state-title">No Milestones</h3>
                        <p className="empty-state-description">
                            Create milestones to organize your project timeline.
                        </p>
                        <PermissionGate resourceType="milestone" action="add">
                            <Button
                                variant="primary"
                                icon={<FaPlus />}
                                onClick={() => setShowCreateModal(true)}
                            >
                                Create First Milestone
                            </Button>
                        </PermissionGate>
                    </div>
                </Card>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {milestones.map((milestone) => {
                        const progress = getProgress(milestone);
                        const daysRemaining = getDaysRemaining(milestone.estimated_finish);

                        return (
                            <Card key={milestone.id}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div
                                            style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: 'var(--radius-lg)',
                                                background: milestone.closed ? 'var(--success-light)' : 'var(--primary-50)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: milestone.closed ? 'var(--success)' : 'var(--primary-600)',
                                            }}
                                        >
                                            {milestone.closed ? <FaCheckCircle /> : <FaFlag />}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">{milestone.name}</h3>
                                            <div className="flex items-center gap-3 text-sm text-muted mt-1">
                                                <span className="flex items-center gap-1">
                                                    <FaCalendarAlt size={10} />
                                                    {milestone.estimated_start} — {milestone.estimated_finish}
                                                </span>
                                                {daysRemaining !== null && !milestone.closed && (
                                                    <span style={{ color: daysRemaining < 0 ? 'var(--error)' : 'inherit' }}>
                                                        {daysRemaining < 0 ? `${Math.abs(daysRemaining)} days overdue` : `${daysRemaining} days left`}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {getStatusBadge(milestone)}
                                        <PermissionGate resourceType="milestone" action="modify">
                                            <Dropdown
                                                trigger={
                                                    <button className="btn btn-ghost btn-icon">
                                                        <FaEdit />
                                                    </button>
                                                }
                                            >
                                                <DropdownItem icon={<FaEdit />}>Edit Milestone</DropdownItem>
                                                <PermissionGate resourceType="milestone" action="delete">
                                                    <DropdownItem
                                                        icon={<FaTrash />}
                                                        danger
                                                        onClick={() => handleDeleteMilestone(milestone.id)}
                                                    >
                                                        Delete Milestone
                                                    </DropdownItem>
                                                </PermissionGate>
                                            </Dropdown>
                                        </PermissionGate>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-muted">Progress</span>
                                        <span className="font-medium">{progress}%</span>
                                    </div>
                                    <div className="progress">
                                        <div
                                            className="progress-bar"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-sm mt-2 text-muted">
                                        <span>{milestone.closed_points || 0} / {milestone.total_points || 0} points</span>
                                        <span>{milestone.user_stories?.length || 0} user stories</span>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Create Milestone Modal */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title="Create Milestone"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleCreateMilestone}
                            disabled={!newMilestone.name.trim() || !newMilestone.estimated_start || !newMilestone.estimated_finish}
                        >
                            Create Milestone
                        </Button>
                    </>
                }
            >
                <div className="form-group">
                    <label className="form-label">Milestone Name *</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Sprint 1, Release v1.0, etc..."
                        value={newMilestone.name}
                        onChange={(e) => setNewMilestone({ ...newMilestone, name: e.target.value })}
                        autoFocus
                    />
                </div>
                <div className="flex gap-4">
                    <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">Start Date *</label>
                        <input
                            type="date"
                            className="form-input"
                            value={newMilestone.estimated_start}
                            onChange={(e) => setNewMilestone({ ...newMilestone, estimated_start: e.target.value })}
                        />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">End Date *</label>
                        <input
                            type="date"
                            className="form-input"
                            value={newMilestone.estimated_finish}
                            onChange={(e) => setNewMilestone({ ...newMilestone, estimated_finish: e.target.value })}
                        />
                    </div>
                </div>
            </Modal>
        </PermissionProvider>
    );
};

export default Milestones;

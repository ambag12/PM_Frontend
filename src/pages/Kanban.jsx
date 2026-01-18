import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FaPlus, FaEllipsisV, FaUser, FaComment } from 'react-icons/fa';
import { taskService, projectService, taskStatusService } from '../api/services';
import { PermissionProvider, PermissionGate } from '../context/PermissionContext';
import { Button, Badge, Modal, Avatar } from '../components/UI';

const Kanban = () => {
    const { id: projectId } = useParams();
    const [project, setProject] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [statuses, setStatuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedColumn, setSelectedColumn] = useState(null);
    const [newTask, setNewTask] = useState({ subject: '', description: '' });
    const [draggedTask, setDraggedTask] = useState(null);

    useEffect(() => {
        fetchData();
    }, [projectId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [projectRes, tasksRes, statusesRes] = await Promise.all([
                projectService.get(projectId),
                taskService.list({ project: projectId }),
                taskStatusService.list({ project: projectId })
            ]);
            setProject(projectRes.data);
            setTasks(tasksRes.data);
            setStatuses(statusesRes.data.sort((a, b) => a.order - b.order));
        } catch (error) {
            console.error('Error fetching kanban data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDragStart = (e, task) => {
        setDraggedTask(task);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e, statusId) => {
        e.preventDefault();
        if (!draggedTask || draggedTask.status === statusId) {
            setDraggedTask(null);
            return;
        }

        try {
            await taskService.update(draggedTask.id, { status: statusId });

            // Optimistically update the UI
            setTasks(prev => prev.map(task =>
                task.id === draggedTask.id ? { ...task, status: statusId } : task
            ));
        } catch (error) {
            console.error('Error updating task status:', error);
        }

        setDraggedTask(null);
    };

    const handleCreateTask = async () => {
        try {
            await taskService.create({
                project: projectId,
                subject: newTask.subject,
                description: newTask.description,
                status: selectedColumn,
            });
            setShowCreateModal(false);
            setNewTask({ subject: '', description: '' });
            setSelectedColumn(null);
            fetchData();
        } catch (error) {
            console.error('Error creating task:', error);
        }
    };

    const openCreateModal = (statusId) => {
        setSelectedColumn(statusId);
        setShowCreateModal(true);
    };

    const getTasksByStatus = (statusId) => {
        return tasks.filter(task => task.status === statusId);
    };

    const getStatusColor = (color) => {
        if (!color) return 'var(--neutral-500)';
        return color.startsWith('#') ? color : `#${color}`;
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
                        <h1 className="page-title">Kanban Board</h1>
                        <p className="page-subtitle">{project?.name} • {tasks.length} tasks</p>
                    </div>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="kanban-board">
                {statuses.map((status) => {
                    const columnTasks = getTasksByStatus(status.id);

                    return (
                        <div
                            key={status.id}
                            className="kanban-column"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, status.id)}
                        >
                            <div className="kanban-column-header">
                                <div className="kanban-column-title">
                                    <span
                                        style={{
                                            width: '12px',
                                            height: '12px',
                                            borderRadius: '3px',
                                            background: getStatusColor(status.color),
                                        }}
                                    />
                                    <span>{status.name}</span>
                                    <span className="kanban-column-count">{columnTasks.length}</span>
                                </div>
                                <PermissionGate resourceType="task" action="add">
                                    <button
                                        className="btn btn-ghost btn-icon"
                                        onClick={() => openCreateModal(status.id)}
                                    >
                                        <FaPlus size={12} />
                                    </button>
                                </PermissionGate>
                            </div>

                            <div className="kanban-column-body">
                                {columnTasks.map((task) => (
                                    <div
                                        key={task.id}
                                        className="kanban-card"
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, task)}
                                        style={{
                                            opacity: draggedTask?.id === task.id ? 0.5 : 1,
                                        }}
                                    >
                                        <div className="kanban-card-title">{task.subject}</div>

                                        {/* Tags */}
                                        {task.tags?.length > 0 && (
                                            <div className="flex gap-1 mb-2">
                                                {task.tags.slice(0, 2).map((tag, i) => (
                                                    <span
                                                        key={i}
                                                        style={{
                                                            fontSize: '0.625rem',
                                                            padding: '0.125rem 0.375rem',
                                                            borderRadius: 'var(--radius-sm)',
                                                            background: tag[1] || 'var(--neutral-200)',
                                                            color: 'white',
                                                        }}
                                                    >
                                                        {tag[0]}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        <div className="kanban-card-meta">
                                            <span>#{task.ref}</span>
                                            <div className="flex items-center gap-2">
                                                {task.total_comments > 0 && (
                                                    <span className="flex items-center gap-1">
                                                        <FaComment size={10} />
                                                        {task.total_comments}
                                                    </span>
                                                )}
                                                {task.assigned_to_extra_info ? (
                                                    <Avatar
                                                        name={task.assigned_to_extra_info.full_name_display}
                                                        size="sm"
                                                    />
                                                ) : (
                                                    <div
                                                        className="avatar avatar-sm"
                                                        style={{ background: 'var(--neutral-200)', color: 'var(--neutral-500)' }}
                                                    >
                                                        <FaUser size={10} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Empty state for column */}
                                {columnTasks.length === 0 && (
                                    <div
                                        style={{
                                            padding: '2rem 1rem',
                                            textAlign: 'center',
                                            color: 'var(--text-tertiary)',
                                            fontSize: '0.875rem',
                                        }}
                                    >
                                        No tasks
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Create Task Modal */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => {
                    setShowCreateModal(false);
                    setSelectedColumn(null);
                }}
                title="Create Task"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleCreateTask}
                            disabled={!newTask.subject.trim()}
                        >
                            Create Task
                        </Button>
                    </>
                }
            >
                <div className="form-group">
                    <label className="form-label">Subject *</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Task subject..."
                        value={newTask.subject}
                        onChange={(e) => setNewTask({ ...newTask, subject: e.target.value })}
                        autoFocus
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea
                        className="form-input"
                        placeholder="Task description..."
                        value={newTask.description}
                        onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                        rows={4}
                    />
                </div>
            </Modal>
        </PermissionProvider>
    );
};

export default Kanban;

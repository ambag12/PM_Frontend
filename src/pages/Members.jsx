import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FaPlus, FaUserPlus, FaEnvelope, FaTrash, FaEdit, FaCrown, FaUserShield } from 'react-icons/fa';
import { membershipService, roleService, projectService } from '../api/services';
import { PermissionProvider, PermissionGate, usePermissions } from '../context/PermissionContext';
import { Card, Button, Badge, Modal, Avatar, Dropdown, DropdownItem, DropdownDivider } from '../components/UI';

const Members = () => {
    const { id: projectId } = useParams();
    const [project, setProject] = useState(null);
    const [members, setMembers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('');
    const [inviting, setInviting] = useState(false);

    useEffect(() => {
        fetchData();
    }, [projectId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [projectRes, membersRes, rolesRes] = await Promise.all([
                projectService.get(projectId),
                membershipService.list({ project: projectId }),
                roleService.list({ project: projectId })
            ]);
            setProject(projectRes.data);
            setMembers(membersRes.data);
            setRoles(rolesRes.data);
            if (rolesRes.data.length > 0) {
                setInviteRole(rolesRes.data[0].id);
            }
        } catch (error) {
            console.error('Error fetching members data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async () => {
        if (!inviteEmail.trim() || !inviteRole) return;

        try {
            setInviting(true);
            await membershipService.create({
                project: projectId,
                role: inviteRole,
                username: inviteEmail,
            });
            setShowInviteModal(false);
            setInviteEmail('');
            fetchData();
        } catch (error) {
            console.error('Error inviting member:', error);
            alert(error.response?.data?.message || 'Failed to invite member');
        } finally {
            setInviting(false);
        }
    };

    const handleRemoveMember = async (memberId) => {
        if (!window.confirm('Are you sure you want to remove this member?')) return;

        try {
            await membershipService.delete(memberId);
            fetchData();
        } catch (error) {
            console.error('Error removing member:', error);
        }
    };

    const handleResendInvitation = async (memberId) => {
        try {
            await membershipService.resendInvitation(memberId);
            alert('Invitation resent successfully');
        } catch (error) {
            console.error('Error resending invitation:', error);
        }
    };

    const getRoleBadge = (member) => {
        if (member.is_owner) {
            return (
                <Badge variant="warning">
                    <FaCrown style={{ marginRight: '0.25rem' }} />
                    Owner
                </Badge>
            );
        }
        if (member.is_admin) {
            return (
                <Badge variant="info">
                    <FaUserShield style={{ marginRight: '0.25rem' }} />
                    Admin
                </Badge>
            );
        }
        return <Badge>{member.role_name}</Badge>;
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
                        <h1 className="page-title">Team Members</h1>
                        <p className="page-subtitle">{project?.name} • {members.length} members</p>
                    </div>
                    <PermissionGate permission="add_member">
                        <Button
                            variant="primary"
                            icon={<FaUserPlus />}
                            onClick={() => setShowInviteModal(true)}
                        >
                            Invite Member
                        </Button>
                    </PermissionGate>
                </div>
            </div>

            {/* Members Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1.5rem'
            }}>
                {members.map((member) => (
                    <Card key={member.id}>
                        <div className="flex items-center gap-4">
                            <Avatar
                                name={member.full_name}
                                src={member.photo}
                                size="xl"
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div className="font-semibold truncate">{member.full_name}</div>
                                <div className="text-sm text-muted truncate">{member.email}</div>
                                <div className="mt-2">
                                    {getRoleBadge(member)}
                                    {!member.is_user_active && (
                                        <Badge variant="warning" style={{ marginLeft: '0.5rem' }}>
                                            Pending
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            <PermissionGate permission="remove_member">
                                {!member.is_owner && (
                                    <Dropdown
                                        trigger={
                                            <button className="btn btn-ghost btn-icon">
                                                <FaEdit />
                                            </button>
                                        }
                                    >
                                        {!member.is_user_active && (
                                            <DropdownItem
                                                icon={<FaEnvelope />}
                                                onClick={() => handleResendInvitation(member.id)}
                                            >
                                                Resend Invitation
                                            </DropdownItem>
                                        )}
                                        <DropdownDivider />
                                        <DropdownItem
                                            icon={<FaTrash />}
                                            danger
                                            onClick={() => handleRemoveMember(member.id)}
                                        >
                                            Remove Member
                                        </DropdownItem>
                                    </Dropdown>
                                )}
                            </PermissionGate>
                        </div>
                    </Card>
                ))}
            </div>

            {members.length === 0 && (
                <div className="empty-state">
                    <div className="empty-state-icon">👥</div>
                    <h3 className="empty-state-title">No Team Members</h3>
                    <p className="empty-state-description">
                        Start building your team by inviting members.
                    </p>
                    <PermissionGate permission="add_member">
                        <Button
                            variant="primary"
                            icon={<FaUserPlus />}
                            onClick={() => setShowInviteModal(true)}
                        >
                            Invite First Member
                        </Button>
                    </PermissionGate>
                </div>
            )}

            {/* Roles Section */}
            <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">Project Roles</h2>
                <Card>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Role Name</th>
                                <th>Members</th>
                                <th>Permissions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {roles.map((role) => {
                                const roleMembers = members.filter(m => m.role === role.id);
                                return (
                                    <tr key={role.id}>
                                        <td className="font-medium">{role.name}</td>
                                        <td>{roleMembers.length} members</td>
                                        <td>
                                            <span className="text-sm text-muted">
                                                {role.permissions?.length || 0} permissions
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </Card>
            </div>

            {/* Invite Modal */}
            <Modal
                isOpen={showInviteModal}
                onClose={() => setShowInviteModal(false)}
                title="Invite Team Member"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setShowInviteModal(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleInvite}
                            disabled={!inviteEmail.trim() || inviting}
                            loading={inviting}
                        >
                            Send Invitation
                        </Button>
                    </>
                }
            >
                <div className="form-group">
                    <label className="form-label">Email or Username *</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Enter email or username..."
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        autoFocus
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">Role</label>
                    <select
                        className="form-input"
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                    >
                        {roles.map((role) => (
                            <option key={role.id} value={role.id}>
                                {role.name}
                            </option>
                        ))}
                    </select>
                </div>
            </Modal>
        </PermissionProvider>
    );
};

export default Members;

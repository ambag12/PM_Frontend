import React, { useState, useEffect, useContext } from 'react';
import { FaUser, FaEnvelope, FaLock, FaSave, FaCamera, FaHistory } from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext';
import { userService, timelineService } from '../api/services';
import { Card, Button, Tabs, Avatar } from '../components/UI';

const Profile = () => {
    const { user, token } = useContext(AuthContext);
    const [profile, setProfile] = useState(null);
    const [timeline, setTimeline] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('profile');
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        bio: '',
        username: '',
    });
    const [passwordData, setPasswordData] = useState({
        current_password: '',
        new_password: '',
        confirm_password: '',
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const [profileRes, timelineRes] = await Promise.all([
                userService.getMe(),
                timelineService.getProfile(user?.id).catch(() => ({ data: [] }))
            ]);
            setProfile(profileRes.data);
            setTimeline(timelineRes.data || []);
            setFormData({
                full_name: profileRes.data.full_name || '',
                email: profileRes.data.email || '',
                bio: profileRes.data.bio || '',
                username: profileRes.data.username || '',
            });
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();

        try {
            setSaving(true);
            await userService.updateMe({
                full_name: formData.full_name,
                bio: formData.bio,
            });
            alert('Profile updated successfully!');
            fetchProfile();
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();

        if (passwordData.new_password !== passwordData.confirm_password) {
            alert('New passwords do not match');
            return;
        }

        try {
            setSaving(true);
            await userService.changePassword(
                passwordData.current_password,
                passwordData.new_password
            );
            alert('Password changed successfully!');
            setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
        } catch (error) {
            console.error('Error changing password:', error);
            alert(error.response?.data?.message || 'Failed to change password');
        } finally {
            setSaving(false);
        }
    };

    const tabs = [
        { id: 'profile', label: 'Profile', icon: <FaUser /> },
        { id: 'security', label: 'Security', icon: <FaLock /> },
        { id: 'activity', label: 'Activity', icon: <FaHistory /> },
    ];

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
                <h1 className="page-title">My Profile</h1>
                <p className="page-subtitle">Manage your account settings and preferences</p>
            </div>

            {/* Profile Header */}
            <Card className="mb-6">
                <div className="flex items-center gap-6">
                    <div style={{ position: 'relative' }}>
                        <Avatar
                            name={profile?.full_name}
                            src={profile?.photo}
                            size="xl"
                            style={{ width: '80px', height: '80px', fontSize: '1.5rem' }}
                        />
                        <button
                            style={{
                                position: 'absolute',
                                bottom: 0,
                                right: 0,
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                background: 'var(--primary-600)',
                                color: 'white',
                                border: '2px solid white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                            }}
                        >
                            <FaCamera size={10} />
                        </button>
                    </div>
                    <div>
                        <h2 className="text-2xl font-semibold">{profile?.full_name}</h2>
                        <p className="text-muted">@{profile?.username}</p>
                        <p className="text-sm text-muted mt-1">{profile?.email}</p>
                    </div>
                </div>
            </Card>

            {/* Tabs */}
            <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

            {/* Tab Content */}
            {activeTab === 'profile' && (
                <Card>
                    <form onSubmit={handleUpdateProfile}>
                        <div className="form-group">
                            <label className="form-label">Full Name</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Username</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.username}
                                disabled
                                style={{ background: 'var(--neutral-100)' }}
                            />
                            <p className="text-sm text-muted mt-1">Username cannot be changed</p>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input
                                type="email"
                                className="form-input"
                                value={formData.email}
                                disabled
                                style={{ background: 'var(--neutral-100)' }}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Bio</label>
                            <textarea
                                className="form-input"
                                value={formData.bio}
                                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                rows={4}
                                placeholder="Tell us about yourself..."
                            />
                        </div>
                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                variant="primary"
                                icon={<FaSave />}
                                loading={saving}
                            >
                                Save Changes
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            {activeTab === 'security' && (
                <Card>
                    <h3 className="text-lg font-semibold mb-4">Change Password</h3>
                    <form onSubmit={handleChangePassword}>
                        <div className="form-group">
                            <label className="form-label">Current Password</label>
                            <input
                                type="password"
                                className="form-input"
                                value={passwordData.current_password}
                                onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">New Password</label>
                            <input
                                type="password"
                                className="form-input"
                                value={passwordData.new_password}
                                onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                                required
                                minLength={6}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Confirm New Password</label>
                            <input
                                type="password"
                                className="form-input"
                                value={passwordData.confirm_password}
                                onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                                required
                            />
                        </div>
                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                variant="primary"
                                icon={<FaLock />}
                                loading={saving}
                            >
                                Update Password
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            {activeTab === 'activity' && (
                <Card>
                    <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                    {timeline.length === 0 ? (
                        <div className="text-center py-8">
                            <FaHistory size={48} style={{ color: 'var(--neutral-300)', marginBottom: '1rem' }} />
                            <p className="text-muted">No recent activity</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {timeline.slice(0, 20).map((item, index) => (
                                <div
                                    key={index}
                                    style={{
                                        display: 'flex',
                                        gap: '1rem',
                                        paddingBottom: '1rem',
                                        borderBottom: '1px solid var(--border-light)',
                                    }}
                                >
                                    <div
                                        style={{
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            background: 'var(--primary-500)',
                                            marginTop: '0.5rem',
                                            flexShrink: 0,
                                        }}
                                    />
                                    <div>
                                        <p className="text-sm">{item.data?.comment || item.event_type || 'Activity'}</p>
                                        <p className="text-xs text-muted mt-1">
                                            {new Date(item.created).toLocaleDateString()} at {new Date(item.created).toLocaleTimeString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            )}
        </div>
    );
};

export default Profile;

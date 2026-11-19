import React, { useContext, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FaCamera, FaTrash, FaAt, FaEnvelope, FaCalendarAlt, FaChartPie, FaHistory, FaEye, FaHeart, FaThumbsUp, FaCog, FaShieldAlt, FaUser } from 'react-icons/fa';
import { userService } from '../api/services';
import { AuthContext } from '../context/AuthContext';
import { useToast, useConfirm } from '../context/ToastContext';
import { Tabs, Loader, EmptyState } from '../components/UI';
import { useAsyncData } from '../components/settings/hooks';
import ProfileOverview from '../components/settings/ProfileOverview';
import ProfileActivity from '../components/settings/ProfileActivity';
import ProfileItems from '../components/settings/ProfileItems';
import ProfileSettingsForm from '../components/settings/ProfileSettingsForm';
import ProfileSecurity from '../components/settings/ProfileSecurity';
import { formatDate, initials } from '../utils/format';
import '../styles/settings.css';

const TABS = [
    { id: 'overview', label: 'Overview', icon: <FaChartPie /> },
    { id: 'activity', label: 'Activity', icon: <FaHistory /> },
    { id: 'watching', label: 'Watching', icon: <FaEye /> },
    { id: 'liked', label: 'Liked', icon: <FaHeart /> },
    { id: 'voted', label: 'Voted', icon: <FaThumbsUp /> },
    { id: 'settings', label: 'Settings', icon: <FaCog /> },
    { id: 'security', label: 'Security', icon: <FaShieldAlt /> },
];

const Profile = () => {
    const { user, updateUser } = useContext(AuthContext);
    const toast = useToast();
    const confirm = useConfirm();
    const fileRef = useRef(null);
    const [params, setParams] = useSearchParams();
    const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'overview';
    const [uploading, setUploading] = useState(false);

    const meQ = useAsyncData(() => userService.getMe().then((r) => r.data), [user?.id]);
    const me = meQ.data || user;

    const applyUser = (data) => {
        meQ.setData((m) => ({ ...(m || {}), ...data }));
        updateUser({ photo: data.photo, big_photo: data.big_photo, full_name: data.full_name, full_name_display: data.full_name_display, bio: data.bio, lang: data.lang, timezone: data.timezone });
    };

    const onAvatar = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error('Please choose an image file');
            return;
        }
        setUploading(true);
        try {
            const res = await userService.changeAvatar(file);
            applyUser(res.data);
            toast.success('Profile photo updated');
        } catch (err) {
            toast.error(err);
        } finally {
            setUploading(false);
        }
    };

    const removeAvatar = async () => {
        if (!(await confirm({ title: 'Remove profile photo?', message: 'Your initials will be shown instead.', confirmText: 'Remove', danger: true }))) return;
        setUploading(true);
        try {
            const res = await userService.removeAvatar();
            applyUser(res.data || { photo: null, big_photo: null });
            toast.success('Profile photo removed');
        } catch (err) {
            toast.error(err);
        } finally {
            setUploading(false);
        }
    };

    if (!me) return <Loader label="Loading your profile…" />;
    if (meQ.error && !user) return <EmptyState icon={<FaUser />} title="Profile unavailable" description="We could not load your profile. Try again in a moment." />;

    const name = me.full_name_display || me.full_name || me.username;
    const photo = me.big_photo || me.photo;

    return (
        <div>
            <section className="card profile-hero" aria-label="Profile">
                <div className="profile-cover" />
                <div className="profile-hero-body">
                    <div className="profile-avatar-wrap">
                        <div className="profile-avatar">{photo ? <img src={photo} alt={name} /> : initials(name)}</div>
                        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onAvatar} />
                        <button className="profile-avatar-btn" onClick={() => fileRef.current?.click()} disabled={uploading} aria-label="Change profile photo" title="Change photo">
                            {uploading ? <span className="spinner spinner-sm" /> : <FaCamera size={13} />}
                        </button>
                    </div>
                    <div className="profile-identity">
                        <div className="row flex-wrap">
                            <h1 className="profile-name">{name}</h1>
                            {me.is_superuser && <span className="badge badge-accent">Superuser</span>}
                        </div>
                        <div className="profile-meta">
                            <span><FaAt /> {me.username}</span>
                            {me.email && <span><FaEnvelope /> {me.email}</span>}
                            {me.date_joined && <span><FaCalendarAlt /> Member since {formatDate(me.date_joined, { month: 'long', year: 'numeric' })}</span>}
                        </div>
                        {me.bio ? <p className="profile-bio">{me.bio}</p> : <p className="profile-bio text-muted">No bio yet — add one in Settings.</p>}
                    </div>
                    <div className="row">
                        {photo && <button className="btn btn-ghost btn-sm" onClick={removeAvatar} disabled={uploading}><FaTrash /> Remove photo</button>}
                        <button className="btn btn-secondary btn-sm" onClick={() => setParams({ tab: 'settings' })}><FaCog /> Edit profile</button>
                    </div>
                </div>
            </section>

            <Tabs tabs={TABS} activeTab={tab} onChange={(id) => setParams(id === 'overview' ? {} : { tab: id }, { replace: true })} />

            {tab === 'overview' && <ProfileOverview userId={me.id} />}
            {tab === 'activity' && <ProfileActivity userId={me.id} />}
            {tab === 'watching' && <ProfileItems key="watched" userId={me.id} kind="watched" />}
            {tab === 'liked' && <ProfileItems key="liked" userId={me.id} kind="liked" />}
            {tab === 'voted' && <ProfileItems key="voted" userId={me.id} kind="voted" />}
            {tab === 'settings' && (meQ.data ? <ProfileSettingsForm key={meQ.data.id} me={meQ.data} onSaved={(data) => data && applyUser(data)} /> : <Loader />)}
            {tab === 'security' && (meQ.data ? <ProfileSecurity me={meQ.data} /> : <Loader />)}
        </div>
    );
};

export default Profile;

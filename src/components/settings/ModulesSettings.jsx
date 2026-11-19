import React, { useState } from 'react';
import { FaPuzzlePiece, FaLayerGroup, FaListUl, FaColumns, FaBug, FaBook, FaVideo, FaPlug, FaCode } from 'react-icons/fa';
import { projectService } from '../../api/services';
import { useToast } from '../../context/ToastContext';
import { Switch, Loader } from '../UI';
import { SettingsSection, CopyField } from './shared';
import { useAsyncData } from './hooks';

const MODULES = [
    { key: 'is_epics_activated', label: 'Epics', desc: 'Group related user stories into large deliverables.', icon: <FaLayerGroup /> },
    { key: 'is_backlog_activated', label: 'Scrum backlog & sprints', desc: 'Plan work in sprints from a prioritised backlog.', icon: <FaListUl /> },
    { key: 'is_kanban_activated', label: 'Kanban board', desc: 'Visualise flow with status columns and swimlanes.', icon: <FaColumns /> },
    { key: 'is_issues_activated', label: 'Issues', desc: 'Track bugs, questions and enhancement requests.', icon: <FaBug /> },
    { key: 'is_wiki_activated', label: 'Wiki', desc: 'Project documentation and meeting notes.', icon: <FaBook /> },
];

const VIDEO = [
    { value: '', label: 'None' },
    { value: 'whereby-com', label: 'Whereby' },
    { value: 'jitsi', label: 'Jitsi Meet' },
    { value: 'talky', label: 'Talky' },
    { value: 'custom', label: 'Custom URL' },
];

const IntegrationConfig = ({ projectId, canEdit }) => {
    const toast = useToast();
    const { data, loading, error, reload } = useAsyncData(() => projectService.getModules(projectId).then((r) => r.data), [projectId]);
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);

    const save = async () => {
        let parsed;
        try {
            parsed = JSON.parse(editing);
        } catch {
            toast.error('That is not valid JSON');
            return;
        }
        setSaving(true);
        try {
            await projectService.updateModules(projectId, parsed);
            toast.success('Integration settings saved');
            setEditing(null);
            reload();
        } catch (err) {
            toast.error(err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Loader label="Loading integrations…" />;
    if (error) return <div className="alert alert-error">Could not load integration settings.</div>;
    const entries = Object.entries(data || {});

    if (editing !== null) {
        return (
            <div>
                <textarea className="form-input mono" rows={14} value={editing} onChange={(e) => setEditing(e.target.value)} aria-label="Integrations JSON" />
                <div className="form-actions">
                    <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
                    <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <span className="spinner spinner-sm" /> : 'Save JSON'}</button>
                </div>
            </div>
        );
    }

    return (
        <div className="stack">
            {entries.length === 0 && <p className="text-sm text-muted">No integrations configured.</p>}
            {entries.map(([name, cfg]) => (
                <div key={name} className="surface-muted">
                    <div className="row mb-2">
                        <FaPlug className="icon-muted" />
                        <strong className="text-heading" style={{ textTransform: 'capitalize' }}>{name}</strong>
                    </div>
                    {cfg?.webhooks_url && (
                        <div className="mb-2">
                            <div className="form-label">Webhook URL</div>
                            <CopyField value={cfg.webhooks_url} label={`${name} webhook URL`} />
                        </div>
                    )}
                    <dl className="json-kv">
                        {Object.entries(cfg || {}).filter(([k]) => k !== 'webhooks_url').map(([k, v]) => (
                            <React.Fragment key={k}>
                                <dt>{k}</dt>
                                <dd className="mono">{k === 'secret' ? `${String(v).slice(0, 4)}••••••••` : Array.isArray(v) ? (v.length ? v.join(', ') : '—') : String(v)}</dd>
                            </React.Fragment>
                        ))}
                    </dl>
                </div>
            ))}
            {canEdit && (
                <div>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditing(JSON.stringify(data || {}, null, 2))}>
                        <FaCode /> Edit as JSON
                    </button>
                </div>
            )}
        </div>
    );
};

const ModulesSettings = ({ project, canEdit, onSaved, patchLocal }) => {
    const toast = useToast();
    const [pending, setPending] = useState('');
    const [video, setVideo] = useState(project.videoconferences || '');
    const [videoExtra, setVideoExtra] = useState(project.videoconferences_extra_data || '');
    const [savingVideo, setSavingVideo] = useState(false);

    const toggle = async (key, value, label) => {
        setPending(key);
        patchLocal?.({ [key]: value });
        try {
            await projectService.update(project.id, { [key]: value });
            toast.success(`${label} ${value ? 'enabled' : 'disabled'}`);
            onSaved?.();
        } catch (err) {
            patchLocal?.({ [key]: !value });
            toast.error(err);
        } finally {
            setPending('');
        }
    };

    const saveVideo = async () => {
        setSavingVideo(true);
        try {
            await projectService.update(project.id, {
                videoconferences: video || null,
                videoconferences_extra_data: video ? videoExtra : '',
            });
            toast.success('Video conference settings saved');
            onSaved?.();
        } catch (err) {
            toast.error(err);
        } finally {
            setSavingVideo(false);
        }
    };

    const videoDirty = (video || '') !== (project.videoconferences || '') || (videoExtra || '') !== (project.videoconferences_extra_data || '');

    return (
        <>
            <SettingsSection icon={<FaPuzzlePiece />} title="Modules" description="Turn project areas on or off. Disabled modules disappear from the sidebar; their data is kept.">
                {MODULES.map((m) => (
                    <div key={m.key} className="settings-row">
                        <div className="settings-row-main">
                            <div className="settings-row-title">{m.icon} {m.label}</div>
                            <div className="settings-row-desc">{m.desc}</div>
                        </div>
                        {pending === m.key && <span className="spinner spinner-sm" />}
                        <Switch
                            checked={project[m.key]}
                            onChange={(v) => toggle(m.key, v, m.label)}
                            disabled={!canEdit || pending === m.key}
                            label={<span className="sr-only">{m.label}</span>}
                        />
                    </div>
                ))}
            </SettingsSection>

            <SettingsSection icon={<FaVideo />} title="Video conferences" description="Adds a meeting link to sprints and stand-ups.">
                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label" htmlFor="video-provider">Provider</label>
                        <select id="video-provider" className="form-input" value={video} onChange={(e) => setVideo(e.target.value)} disabled={!canEdit}>
                            {VIDEO.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
                        </select>
                    </div>
                    {video && (
                        <div className="form-group">
                            <label className="form-label" htmlFor="video-extra">{video === 'custom' ? 'Meeting URL' : 'Room name / prefix'}</label>
                            <input
                                id="video-extra"
                                className="form-input"
                                value={videoExtra}
                                onChange={(e) => setVideoExtra(e.target.value)}
                                disabled={!canEdit}
                                placeholder={video === 'custom' ? 'https://meet.example.com/room' : 'e.g. hospital-standup'}
                            />
                        </div>
                    )}
                </div>
                {canEdit && (
                    <div className="form-actions">
                        <button className="btn btn-primary" onClick={saveVideo} disabled={!videoDirty || savingVideo}>
                            {savingVideo ? <span className="spinner spinner-sm" /> : 'Save'}
                        </button>
                    </div>
                )}
            </SettingsSection>

            <SettingsSection icon={<FaPlug />} title="Repository integrations" description="Incoming webhook endpoints for GitHub, GitLab, Bitbucket and Gogs. Point your repository’s webhook at these URLs.">
                <IntegrationConfig projectId={project.id} canEdit={canEdit} />
            </SettingsSection>
        </>
    );
};

export default ModulesSettings;

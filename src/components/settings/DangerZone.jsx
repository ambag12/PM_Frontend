import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaExclamationTriangle, FaClone, FaFileAlt, FaExchangeAlt, FaSignOutAlt, FaTrash } from 'react-icons/fa';
import { projectService } from '../../api/services';
import { AuthContext } from '../../context/AuthContext';
import { useToast, useConfirm } from '../../context/ToastContext';
import { Modal, Field, Switch, UserAvatar } from '../UI';
import { SettingsSection } from './shared';

const DuplicateModal = ({ project, me, onClose }) => {
    const toast = useToast();
    const navigate = useNavigate();
    const others = (project.members || []).filter((m) => m.id !== me?.id && m.is_active !== false);
    const [form, setForm] = useState({ name: `${project.name} (copy)`, description: project.description || '', is_private: !!project.is_private });
    const [keep, setKeep] = useState(() => others.map((m) => m.id));
    const [busy, setBusy] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            const res = await projectService.duplicate(project.id, { ...form, users: keep.map((id) => ({ id })) });
            toast.success(`Created “${res.data?.name || form.name}”`);
            onClose();
            if (res.data?.id) navigate(`/project/${res.data.id}`);
        } catch (err) {
            toast.error(err);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            isOpen
            onClose={onClose}
            title="Duplicate project"
            size="lg"
            footer={(
                <>
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" type="submit" form="dup-form" disabled={busy || !form.name.trim()}>{busy ? <span className="spinner spinner-sm" /> : 'Duplicate'}</button>
                </>
            )}
        >
            <form id="dup-form" onSubmit={submit}>
                <p className="text-sm text-secondary mb-4">Copies the configuration (statuses, roles, custom fields, tags, wiki) — not the stories, tasks or issues.</p>
                <Field label="New project name"><input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus /></Field>
                <Field label="Description"><textarea className="form-input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
                <div className="form-group"><Switch checked={form.is_private} onChange={(v) => setForm({ ...form, is_private: v })} label="Private project" /></div>
                <div className="form-label">Members to keep <span className="optional">({keep.length} of {others.length})</span></div>
                {others.length === 0 ? <p className="text-sm text-muted">You are the only member.</p> : (
                    <div className="member-pick">
                        {others.map((m) => (
                            <label key={m.id}>
                                <input type="checkbox" checked={keep.includes(m.id)} onChange={() => setKeep((k) => (k.includes(m.id) ? k.filter((x) => x !== m.id) : [...k, m.id]))} />
                                <UserAvatar user={m} size="xs" />
                                <span className="truncate">{m.full_name_display || m.username}</span>
                            </label>
                        ))}
                    </div>
                )}
            </form>
        </Modal>
    );
};

const TemplateModal = ({ project, onClose }) => {
    const toast = useToast();
    const [name, setName] = useState(`${project.name} template`);
    const [desc, setDesc] = useState(project.description || '');
    const [busy, setBusy] = useState(false);
    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            await projectService.createTemplate(project.id, { template_name: name.trim(), template_description: desc.trim() });
            toast.success(`Template “${name}” created — manage it in the Admin panel`);
            onClose();
        } catch (err) {
            toast.error(err);
        } finally {
            setBusy(false);
        }
    };
    return (
        <Modal isOpen onClose={onClose} title="Create template from project" footer={(
            <>
                <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                <button className="btn btn-primary" type="submit" form="tpl-form" disabled={busy || !name.trim() || !desc.trim()}>{busy ? <span className="spinner spinner-sm" /> : 'Create template'}</button>
            </>
        )}>
            <form id="tpl-form" onSubmit={submit}>
                <Field label="Template name"><input className="form-input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus /></Field>
                <Field label="Description" hint="Required by the server."><textarea className="form-input" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} required /></Field>
            </form>
        </Modal>
    );
};

const TransferModal = ({ project, me, onClose }) => {
    const toast = useToast();
    const candidates = (project.members || []).filter((m) => m.id !== me?.id && m.is_active !== false);
    const [userId, setUserId] = useState(String(candidates[0]?.id ?? ''));
    const [busy, setBusy] = useState(false);
    const submit = async () => {
        setBusy(true);
        try {
            await projectService.transferStart(project.id, Number(userId));
            toast.success('Transfer request sent — the new owner must accept it by email');
            onClose();
        } catch (err) {
            toast.error(err);
        } finally {
            setBusy(false);
        }
    };
    return (
        <Modal isOpen onClose={onClose} title="Transfer ownership" size="sm" footer={(
            <>
                <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                <button className="btn btn-danger" onClick={submit} disabled={busy || !userId}>{busy ? <span className="spinner spinner-sm" /> : 'Send transfer request'}</button>
            </>
        )}>
            {candidates.length === 0 ? (
                <div className="alert alert-warning">Invite at least one other member before transferring ownership.</div>
            ) : (
                <>
                    <p className="text-sm text-secondary mb-3">The chosen member receives an email to accept. You stay owner until they do.</p>
                    <label className="form-label" htmlFor="transfer-user">New owner</label>
                    <select id="transfer-user" className="form-input" value={userId} onChange={(e) => setUserId(e.target.value)}>
                        {candidates.map((m) => <option key={m.id} value={m.id}>{m.full_name_display || m.username} — {m.role_name}</option>)}
                    </select>
                </>
            )}
        </Modal>
    );
};

const DeleteModal = ({ project, onClose }) => {
    const toast = useToast();
    const navigate = useNavigate();
    const [typed, setTyped] = useState('');
    const [busy, setBusy] = useState(false);
    const match = typed.trim() === project.name;
    const submit = async () => {
        setBusy(true);
        try {
            await projectService.delete(project.id);
            toast.success(`Project “${project.name}” deleted`);
            onClose();
            navigate('/');
        } catch (err) {
            toast.error(err);
            setBusy(false);
        }
    };
    return (
        <Modal isOpen onClose={onClose} title="Delete project" size="sm" footer={(
            <>
                <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                <button className="btn btn-danger" onClick={submit} disabled={!match || busy}>{busy ? <span className="spinner spinner-sm" /> : 'Delete forever'}</button>
            </>
        )}>
            <div className="alert alert-error mb-3"><FaExclamationTriangle style={{ marginTop: 3 }} /><div>This permanently deletes every story, task, issue, sprint, wiki page, tender and HR record in this project.</div></div>
            <label className="form-label" htmlFor="delete-confirm">Type <strong>{project.name}</strong> to confirm</label>
            <input id="delete-confirm" className="form-input" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
        </Modal>
    );
};

const DangerZone = ({ project, canEdit }) => {
    const { user } = useContext(AuthContext);
    const toast = useToast();
    const confirm = useConfirm();
    const navigate = useNavigate();
    const [modal, setModal] = useState(null);
    const isOwner = !!project.i_am_owner;

    const requestOwnership = async () => {
        if (!(await confirm({ title: 'Request ownership?', message: 'The current owner gets an email asking to transfer the project to you.', confirmText: 'Send request' }))) return;
        try {
            await projectService.transferRequest(project.id);
            toast.success('Ownership request sent to the project owner');
        } catch (err) {
            toast.error(err);
        }
    };

    const leave = async () => {
        if (!(await confirm({ title: `Leave “${project.name}”?`, message: 'You will lose access unless someone invites you again.', confirmText: 'Leave project', danger: true }))) return;
        try {
            await projectService.leave(project.id);
            toast.success(`You left “${project.name}”`);
            navigate('/');
        } catch (err) {
            toast.error(err);
        }
    };

    const rows = [
        canEdit && { icon: <FaClone />, title: 'Duplicate project', desc: 'Start a new project with the same configuration and team.', action: <button className="btn btn-secondary btn-sm" onClick={() => setModal('dup')}>Duplicate</button> },
        canEdit && user?.is_superuser && { icon: <FaFileAlt />, title: 'Create template', desc: 'Save this configuration as a template for new projects (superuser).', action: <button className="btn btn-secondary btn-sm" onClick={() => setModal('tpl')}>Create template</button> },
        canEdit && isOwner && { icon: <FaExchangeAlt />, title: 'Transfer ownership', desc: 'Hand the project over to another member.', action: <button className="btn btn-secondary btn-sm" onClick={() => setModal('transfer')}>Transfer</button> },
        canEdit && !isOwner && { icon: <FaExchangeAlt />, title: 'Request ownership', desc: `Ask ${project.owner?.full_name_display || 'the owner'} to transfer this project to you.`, action: <button className="btn btn-secondary btn-sm" onClick={requestOwnership}>Request</button> },
        { icon: <FaSignOutAlt />, title: 'Leave project', desc: isOwner ? 'Owners must transfer ownership before leaving.' : 'Remove yourself from this project.', action: <button className="btn btn-danger-ghost btn-sm" onClick={leave} disabled={isOwner}>Leave</button> },
        canEdit && { icon: <FaTrash />, title: 'Delete project', desc: 'Permanently delete the project and all of its data.', action: <button className="btn btn-danger btn-sm" onClick={() => setModal('delete')}>Delete project</button> },
    ].filter(Boolean);

    return (
        <SettingsSection icon={<FaExclamationTriangle />} title="Danger zone" description="Actions that change who owns this project or remove it." tone="danger">
            {rows.map((r) => (
                <div key={r.title} className="danger-row">
                    <div className="settings-row-main">
                        <div className="settings-row-title">{r.icon} {r.title}</div>
                        <div className="settings-row-desc">{r.desc}</div>
                    </div>
                    {r.action}
                </div>
            ))}
            {modal === 'dup' && <DuplicateModal project={project} me={user} onClose={() => setModal(null)} />}
            {modal === 'tpl' && <TemplateModal project={project} onClose={() => setModal(null)} />}
            {modal === 'transfer' && <TransferModal project={project} me={user} onClose={() => setModal(null)} />}
            {modal === 'delete' && <DeleteModal project={project} onClose={() => setModal(null)} />}
        </SettingsSection>
    );
};

export default DangerZone;

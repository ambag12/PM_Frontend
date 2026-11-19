import React, { useState } from 'react';
import { FaTimes, FaUserPlus } from 'react-icons/fa';
import { membershipService } from '../../api/services';
import { getErrorMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Modal, Field } from '../UI';
import '../../styles/settings.css';

const splitEntries = (text) => text.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean);

/* Invite several people (emails or usernames) with one role and an optional message. */
const InviteMembersModal = ({ project, roles, onClose, onInvited }) => {
    const toast = useToast();
    const [entries, setEntries] = useState([]);
    const [draft, setDraft] = useState('');
    const [roleId, setRoleId] = useState(String(roles[0]?.id ?? ''));
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const commit = (text = draft) => {
        const parts = splitEntries(text);
        if (!parts.length) return;
        setEntries((list) => [...new Set([...list, ...parts])]);
        setDraft('');
    };

    const submit = async (e) => {
        e.preventDefault();
        const all = [...new Set([...entries, ...splitEntries(draft)])];
        if (!all.length || !roleId) return;
        setBusy(true);
        setError('');
        try {
            await membershipService.bulkCreate({
                project_id: project.id,
                bulk_memberships: all.map((username) => ({ role_id: Number(roleId), username })),
                ...(message.trim() ? { invitation_extra_text: message.trim() } : {}),
            });
            toast.success(`${all.length} invitation${all.length > 1 ? 's' : ''} sent`);
            onInvited?.();
            onClose();
        } catch (err) {
            const msg = getErrorMessage(err, 'Could not send invitations');
            setError(msg);
            toast.error(msg);
        } finally {
            setBusy(false);
        }
    };

    const count = entries.length + splitEntries(draft).length;

    return (
        <Modal
            isOpen
            onClose={onClose}
            title="Invite people"
            footer={(
                <>
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" type="submit" form="invite-form" disabled={busy || count === 0 || !roleId}>
                        {busy ? <span className="spinner spinner-sm" /> : <><FaUserPlus /> Send {count > 1 ? `${count} invitations` : 'invitation'}</>}
                    </button>
                </>
            )}
        >
            <form id="invite-form" onSubmit={submit}>
                <Field label="Emails or usernames" hint="Separate with commas, spaces or Enter. Existing users are added straight away; others get an email invitation.">
                    <div className="chip-input">
                        {entries.map((x) => (
                            <span key={x} className="chip">
                                {x}
                                <button type="button" aria-label={`Remove ${x}`} onClick={() => setEntries((l) => l.filter((y) => y !== x))}><FaTimes size={9} /></button>
                            </span>
                        ))}
                        <input
                            value={draft}
                            onChange={(e) => {
                                const v = e.target.value;
                                if (/[,;\s]$/.test(v)) commit(v);
                                else setDraft(v);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') { e.preventDefault(); commit(); }
                                if (e.key === 'Backspace' && !draft && entries.length) setEntries((l) => l.slice(0, -1));
                            }}
                            onPaste={(e) => { e.preventDefault(); commit(draft + e.clipboardData.getData('text')); }}
                            onBlur={() => commit()}
                            placeholder={entries.length ? '' : 'name@example.com, username…'}
                            aria-label="Add email or username"
                            autoFocus
                        />
                    </div>
                </Field>
                <Field label="Role">
                    <select className="form-input" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
                        {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                </Field>
                <Field label="Personal message" optional hint={`${message.length}/255`}>
                    <textarea className="form-input" rows={3} maxLength={255} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Welcome to the team — here’s what we’re working on…" />
                </Field>
                {error && <div className="alert alert-error" role="alert">{error}</div>}
            </form>
        </Modal>
    );
};

export default InviteMembersModal;

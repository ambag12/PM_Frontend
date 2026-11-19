import React, { useState } from 'react';
import { FaKey, FaEye, FaEyeSlash, FaEnvelopeOpenText, FaCheckCircle } from 'react-icons/fa';
import { userService } from '../../api/services';
import { useToast } from '../../context/ToastContext';
import { Field } from '../UI';
import { SettingsSection } from './shared';

const LEVELS = [
    { label: '', tone: 'tone-neutral' },
    { label: 'Weak', tone: 'tone-danger' },
    { label: 'Fair', tone: 'tone-warning' },
    { label: 'Good', tone: 'tone-info' },
    { label: 'Strong', tone: 'tone-success' },
];

const strength = (pw) => {
    if (!pw) return { level: 0, ...LEVELS[0] };
    let score = 0;
    if (pw.length >= 8) score += 1;
    if (pw.length >= 12) score += 1;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
    if (/\d/.test(pw)) score += 1;
    if (/[^A-Za-z0-9]/.test(pw)) score += 1;
    if (pw.length < 8) score = Math.min(score, 1);
    const level = Math.max(1, Math.min(4, score));
    return { level, ...LEVELS[level] };
};

const ProfileSecurity = ({ me }) => {
    const toast = useToast();
    const [form, setForm] = useState({ current: '', next: '', confirm: '' });
    const [show, setShow] = useState(false);
    const [busy, setBusy] = useState(false);
    const [sending, setSending] = useState(false);
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const s = strength(form.next);
    const mismatch = form.confirm && form.next !== form.confirm;
    const tooShort = form.next && form.next.length < 6;
    const valid = form.current && form.next && !mismatch && !tooShort && form.next === form.confirm;

    const submit = async (e) => {
        e.preventDefault();
        if (!valid) return;
        setBusy(true);
        try {
            await userService.changePassword(form.current, form.next);
            toast.success('Password changed');
            setForm({ current: '', next: '', confirm: '' });
        } catch (err) {
            toast.error(err);
        } finally {
            setBusy(false);
        }
    };

    const sendVerification = async () => {
        setSending(true);
        try {
            await userService.sendVerificationEmail();
            toast.success(`Verification email sent to ${me.email}`);
        } catch (err) {
            toast.error(err);
        } finally {
            setSending(false);
        }
    };

    const type = show ? 'text' : 'password';

    return (
        <div className="stack">
            <SettingsSection icon={<FaKey />} title="Change password" description="Use at least 8 characters with a mix of letters, numbers and symbols.">
                <form onSubmit={submit} style={{ maxWidth: 460 }}>
                    <Field label="Current password">
                        <input className="form-input" type={type} value={form.current} onChange={set('current')} autoComplete="current-password" required />
                    </Field>
                    <Field label="New password" error={tooShort ? 'Must be at least 6 characters.' : undefined}>
                        <input className="form-input" type={type} value={form.next} onChange={set('next')} autoComplete="new-password" required />
                        {form.next && (
                            <>
                                <div className={`pw-meter ${s.tone}`} aria-hidden="true">
                                    {[1, 2, 3, 4].map((i) => <span key={i} className={i <= s.level ? 'on' : ''} />)}
                                </div>
                                <div className="form-hint">Strength: <strong>{s.label}</strong></div>
                            </>
                        )}
                    </Field>
                    <Field label="Confirm new password" error={mismatch ? 'Passwords do not match.' : undefined}>
                        <input className="form-input" type={type} value={form.confirm} onChange={set('confirm')} autoComplete="new-password" required />
                    </Field>
                    <div className="row justify-between flex-wrap">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShow((v) => !v)} aria-pressed={show}>
                            {show ? <><FaEyeSlash /> Hide passwords</> : <><FaEye /> Show passwords</>}
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={!valid || busy}>{busy ? <span className="spinner spinner-sm" /> : 'Update password'}</button>
                    </div>
                </form>
            </SettingsSection>

            <SettingsSection icon={<FaEnvelopeOpenText />} title="Email verification" description="A verified email is required to invite people to projects.">
                {me.verified_email ? (
                    <div className="alert alert-success"><FaCheckCircle style={{ marginTop: 3 }} /><div><strong>{me.email}</strong> is verified.</div></div>
                ) : (
                    <div className="row flex-wrap justify-between gap-3">
                        <div className="alert alert-warning flex-1" style={{ minWidth: 240 }}><div><strong>{me.email}</strong> has not been verified yet.</div></div>
                        <button className="btn btn-secondary" onClick={sendVerification} disabled={sending}>{sending ? <span className="spinner spinner-sm" /> : 'Send verification email'}</button>
                    </div>
                )}
            </SettingsSection>
        </div>
    );
};

export default ProfileSecurity;

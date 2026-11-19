import React, { useMemo, useState } from 'react';
import { FaUserEdit, FaPalette, FaSun, FaMoon, FaDesktop } from 'react-icons/fa';
import { userService } from '../../api/services';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { Field } from '../UI';
import { SettingsSection } from './shared';

const LANGS = [
    ['', 'Server default'], ['en', 'English'], ['ar', 'العربية'], ['de', 'Deutsch'], ['es', 'Español'], ['fa', 'فارسی'],
    ['fr', 'Français'], ['it', 'Italiano'], ['ja', '日本語'], ['ko', '한국어'], ['nl', 'Nederlands'], ['pl', 'Polski'],
    ['pt-br', 'Português (Brasil)'], ['ru', 'Русский'], ['sv', 'Svenska'], ['tr', 'Türkçe'], ['uk', 'Українська'],
    ['vi', 'Tiếng Việt'], ['zh-hans', '简体中文'], ['zh-hant', '繁體中文'],
];

const THEMES = [
    { id: 'light', label: 'Light', icon: <FaSun /> },
    { id: 'dark', label: 'Dark', icon: <FaMoon /> },
    { id: 'system', label: 'System', icon: <FaDesktop /> },
];

const pick = (me) => ({
    full_name: me.full_name || '',
    email: me.email || '',
    bio: me.bio || '',
    lang: me.lang || '',
    timezone: me.timezone || '',
});

/* onSaved(userData) lets the page refresh its copy and AuthContext.updateUser(). */
const ProfileSettingsForm = ({ me, onSaved }) => {
    const { preference, setPreference } = useTheme();
    const toast = useToast();
    const [form, setForm] = useState(() => pick(me));
    const [saving, setSaving] = useState(false);
    const zones = useMemo(() => {
        try { return Intl.supportedValuesOf('timeZone'); } catch { return ['UTC', 'Asia/Karachi', 'Europe/London', 'America/New_York']; }
    }, []);

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
    const original = pick(me);
    const changed = Object.keys(form).filter((k) => form[k] !== original[k]);

    const save = async (e) => {
        e.preventDefault();
        if (!form.full_name.trim()) {
            toast.error('Full name is required');
            return;
        }
        const payload = Object.fromEntries(changed.map((k) => [k, k === 'full_name' ? form.full_name.trim() : form[k]]));
        setSaving(true);
        try {
            const res = await userService.update(me.id, payload);
            const { email } = payload;
            if (email) toast.info(`We sent a confirmation link to ${email}. Your email changes once you confirm it.`, 8000);
            toast.success('Profile updated');
            onSaved?.(res.data);
            if (email) setForm((f) => ({ ...f, email: me.email }));
        } catch (err) {
            toast.error(err);
        } finally {
            setSaving(false);
        }
    };

    const pickTheme = (id) => {
        setPreference(id);
        toast.success(`Theme set to ${THEMES.find((t) => t.id === id)?.label}`);
    };

    return (
        <div className="stack">
            <SettingsSection icon={<FaUserEdit />} title="Personal details" description="How you appear to teammates across every project.">
                <form onSubmit={save}>
                    <div className="form-grid">
                        <Field label="Full name"><input className="form-input" value={form.full_name} onChange={set('full_name')} required maxLength={256} /></Field>
                        <Field label="Email" hint="Changing it sends a confirmation link to the new address.">
                            <input className="form-input" type="email" value={form.email} onChange={set('email')} required />
                        </Field>
                        <Field label="Bio" optional className="span-2" hint={`${form.bio.length}/210`}>
                            <textarea className="form-input" rows={3} maxLength={210} value={form.bio} onChange={set('bio')} placeholder="Role, responsibilities, areas of expertise…" />
                        </Field>
                        <Field label="Language">
                            <select className="form-input" value={form.lang} onChange={set('lang')}>
                                {LANGS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                            </select>
                        </Field>
                        <Field label="Time zone">
                            <select className="form-input" value={form.timezone} onChange={set('timezone')}>
                                <option value="">Server default</option>
                                {zones.map((z) => <option key={z} value={z}>{z.replace(/_/g, ' ')}</option>)}
                            </select>
                        </Field>
                    </div>
                    <div className="form-actions">
                        <button type="button" className="btn btn-ghost" onClick={() => setForm(pick(me))} disabled={!changed.length || saving}>Reset</button>
                        <button type="submit" className="btn btn-primary" disabled={!changed.length || saving}>{saving ? <span className="spinner spinner-sm" /> : 'Save profile'}</button>
                    </div>
                </form>
            </SettingsSection>

            <SettingsSection icon={<FaPalette />} title="Appearance" description="Saved on this device.">
                <div className="theme-options" role="radiogroup" aria-label="Theme">
                    {THEMES.map((t) => (
                        <button key={t.id} type="button" role="radio" aria-checked={preference === t.id} className={`theme-option ${preference === t.id ? 'active' : ''}`} onClick={() => pickTheme(t.id)}>
                            {t.icon}
                            {t.label}
                        </button>
                    ))}
                </div>
            </SettingsSection>
        </div>
    );
};

export default ProfileSettingsForm;

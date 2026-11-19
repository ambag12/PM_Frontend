import React, { useState } from 'react';
import { FaInfoCircle, FaCalendarAlt, FaGlobeAsia, FaLock, FaUserFriends } from 'react-icons/fa';
import { projectService } from '../../api/services';
import { useToast } from '../../context/ToastContext';
import { Field, Switch } from '../UI';
import { SettingsSection } from './shared';
import { formatCompact, daysUntil, formatDate } from '../../utils/format';
import ProjectAssets from './ProjectAssets';

const pick = (p) => ({
    name: p.name || '',
    description: p.description || '',
    is_private: !!p.is_private,
    is_looking_for_people: !!p.is_looking_for_people,
    looking_for_people_note: p.looking_for_people_note || '',
    total_budget: p.total_budget ?? '',
    psdp: p.psdp || '',
    location: p.location || '',
    obj_of_proj: p.obj_of_proj || '',
});

const GeneralSettings = ({ project, canEdit, onSaved }) => {
    const toast = useToast();
    const [form, setForm] = useState(() => pick(project));
    const [saving, setSaving] = useState(false);
    const [dueDate, setDueDate] = useState(project.due_date || '');
    const [savingDue, setSavingDue] = useState(false);

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));
    const original = pick(project);
    const dirty = Object.keys(form).some((k) => String(form[k]) !== String(original[k]));

    const save = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) {
            toast.error('Project name is required');
            return;
        }
        setSaving(true);
        try {
            const payload = { ...form, name: form.name.trim(), total_budget: form.total_budget === '' ? null : Number(form.total_budget) };
            await projectService.update(project.id, payload);
            toast.success('Project details saved');
            onSaved?.();
        } catch (err) {
            toast.error(err);
        } finally {
            setSaving(false);
        }
    };

    const saveDue = async () => {
        if (!dueDate) return;
        setSavingDue(true);
        try {
            await projectService.changeDueDate(project.id, dueDate);
            toast.success(`Due date set to ${formatDate(dueDate)}`);
            onSaved?.();
        } catch (err) {
            toast.error(err);
        } finally {
            setSavingDue(false);
        }
    };

    const days = daysUntil(project.due_date);

    return (
        <>
            <SettingsSection icon={<FaInfoCircle />} title="Project details" description="Name, description, visibility and the programme fields used across reports.">
                <form onSubmit={save}>
                    <div className="form-grid">
                        <Field label="Project name" className="span-2">
                            <input className="form-input" value={form.name} onChange={set('name')} disabled={!canEdit} required maxLength={250} />
                        </Field>
                        <Field label="Description" className="span-2">
                            <textarea className="form-input" rows={3} value={form.description} onChange={set('description')} disabled={!canEdit} />
                        </Field>
                        <Field label="Total budget" hint={form.total_budget !== '' ? `≈ ${formatCompact(form.total_budget)}` : 'Whole amount, no separators'}>
                            <input className="form-input tabular" type="number" min="0" step="1" value={form.total_budget} onChange={set('total_budget')} disabled={!canEdit} />
                        </Field>
                        <Field label="PSDP number">
                            <input className="form-input" value={form.psdp} onChange={set('psdp')} disabled={!canEdit} placeholder="e.g. PSDP-2026-117" />
                        </Field>
                        <Field label="Location" className="span-2">
                            <input className="form-input" value={form.location} onChange={set('location')} disabled={!canEdit} placeholder="District, Province" />
                        </Field>
                        <Field label="Objective of project" className="span-2">
                            <textarea className="form-input" rows={3} value={form.obj_of_proj} onChange={set('obj_of_proj')} disabled={!canEdit} />
                        </Field>
                    </div>

                    <div className="divider" />
                    <div className="settings-row">
                        <div className="settings-row-main">
                            <div className="settings-row-title">{form.is_private ? <FaLock /> : <FaGlobeAsia />} Private project</div>
                            <div className="settings-row-desc">
                                {form.is_private ? 'Only members can see this project.' : 'Anyone can view this project; use Roles › public permissions to control what they see.'}
                            </div>
                        </div>
                        <Switch checked={form.is_private} onChange={set('is_private')} disabled={!canEdit} label={<span className="sr-only">Private project</span>} />
                    </div>
                    <div className="settings-row">
                        <div className="settings-row-main">
                            <div className="settings-row-title"><FaUserFriends /> Looking for people</div>
                            <div className="settings-row-desc">Advertise that this project is recruiting contributors.</div>
                            {form.is_looking_for_people && (
                                <input
                                    className="form-input mt-2"
                                    value={form.looking_for_people_note}
                                    onChange={set('looking_for_people_note')}
                                    disabled={!canEdit}
                                    placeholder="Who are you looking for?"
                                    aria-label="Looking for people note"
                                    maxLength={60}
                                />
                            )}
                        </div>
                        <Switch checked={form.is_looking_for_people} onChange={set('is_looking_for_people')} disabled={!canEdit} label={<span className="sr-only">Looking for people</span>} />
                    </div>

                    {canEdit && (
                        <div className="form-actions mt-4">
                            <button type="button" className="btn btn-ghost" disabled={!dirty || saving} onClick={() => setForm(pick(project))}>Reset</button>
                            <button type="submit" className="btn btn-primary" disabled={!dirty || saving}>
                                {saving ? <span className="spinner spinner-sm" /> : 'Save changes'}
                            </button>
                        </div>
                    )}
                </form>
            </SettingsSection>

            <SettingsSection
                icon={<FaCalendarAlt />}
                title="Project due date"
                description="The completion deadline shown on dashboards and the project overview."
            >
                <div className="row flex-wrap gap-3">
                    <input
                        type="date"
                        className="form-input"
                        style={{ maxWidth: 200 }}
                        value={dueDate || ''}
                        onChange={(e) => setDueDate(e.target.value)}
                        disabled={!canEdit}
                        aria-label="Due date"
                    />
                    {canEdit && (
                        <button className="btn btn-primary" onClick={saveDue} disabled={savingDue || !dueDate || dueDate === project.due_date}>
                            {savingDue ? <span className="spinner spinner-sm" /> : 'Update due date'}
                        </button>
                    )}
                    {project.due_date && (
                        <span className={`badge ${days < 0 ? 'badge-error' : days <= 30 ? 'badge-warning' : 'badge-primary'}`}>
                            {days < 0 ? `${Math.abs(days)} days overdue` : days === 0 ? 'Due today' : `${days} days left`}
                        </span>
                    )}
                </div>
            </SettingsSection>

            <ProjectAssets project={project} canEdit={canEdit} onSaved={onSaved} />
        </>
    );
};

export default GeneralSettings;

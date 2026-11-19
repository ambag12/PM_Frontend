import React, { useState } from 'react';
import { FaPlus } from 'react-icons/fa';
import { tenderService, TENDER_STATUSES } from '../api/services';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../api/client';
import { Modal, Field } from './UI';
import { useMyProjects } from './modules/hooks';

const NAME_MAX = 50;

/*
 * Create a tender. With `projectId` the project is fixed; otherwise the user picks one
 * (from `projects`, or from their project list).
 *   onCreated(tender)
 */
const CreateTenderModal = ({ projectId, projects: projectsProp, defaultProjectId, onClose, onCreated, isOpen = true }) => {
    const toast = useToast();
    const needPicker = !projectId;
    const mine = useMyProjects(needPicker && !projectsProp);
    const projects = projectsProp || mine.projects;

    const [form, setForm] = useState({
        project: projectId || defaultProjectId || '',
        name_of_tenders: '',
        status: 'not_started',
        tech_opeining: '',
        financial_opening: '',
    });
    const [touched, setTouched] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const project = form.project || (needPicker && projects.length === 1 ? projects[0].id : '');
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const nameError = touched && !form.name_of_tenders.trim() ? 'Give the tender a name (e.g. "Medical Equipment Lot 2").' : null;
    const projectError = touched && !project ? 'Choose the project this tender belongs to.' : null;
    const orderWarning = form.tech_opeining && form.financial_opening && form.financial_opening < form.tech_opeining
        ? 'Financial bids are normally opened after the technical evaluation.' : null;

    const submit = async (e) => {
        e.preventDefault();
        setTouched(true);
        if (!form.name_of_tenders.trim() || !project) return;
        setSaving(true);
        setError(null);
        try {
            const payload = {
                project: Number(project),
                name_of_tenders: form.name_of_tenders.trim(),
                status: form.status,
            };
            if (form.tech_opeining) payload.tech_opeining = form.tech_opeining;
            if (form.financial_opening) payload.financial_opening = form.financial_opening;
            const res = await tenderService.create(payload);
            toast.success('Tender created');
            onCreated?.(res.data?.data || null);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="New tender"
            footer={(
                <>
                    <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button type="submit" form="create-tender-form" className="btn btn-primary" disabled={saving}>
                        {saving ? <span className="spinner spinner-sm" /> : <FaPlus size={11} />} Create tender
                    </button>
                </>
            )}
        >
            <form id="create-tender-form" onSubmit={submit} noValidate>
                {error && <div className="alert alert-error mb-4">{error}</div>}

                {needPicker && (
                    <Field label="Project" error={projectError}>
                        <select className="form-input" value={project} onChange={set('project')} disabled={!projects.length}>
                            <option value="">{mine.loaded || projectsProp ? 'Select a project…' : 'Loading projects…'}</option>
                            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </Field>
                )}

                <Field label="Tender name" error={nameError} hint={`${form.name_of_tenders.length}/${NAME_MAX} characters`}>
                    <input
                        className="form-input"
                        value={form.name_of_tenders}
                        onChange={set('name_of_tenders')}
                        maxLength={NAME_MAX}
                        placeholder="e.g. Civil Works Block B"
                        autoFocus
                    />
                </Field>

                <Field label="Status">
                    <div className="segmented mod-segmented-wrap" role="radiogroup" aria-label="Status">
                        {TENDER_STATUSES.map((s) => (
                            <button
                                key={s.value}
                                type="button"
                                role="radio"
                                aria-checked={form.status === s.value}
                                className={form.status === s.value ? 'active' : ''}
                                onClick={() => setForm((f) => ({ ...f, status: s.value }))}
                            >
                                <span className={`dot tone-${s.tone}`} />{s.label}
                            </button>
                        ))}
                    </div>
                </Field>

                <div className="form-grid">
                    <Field label="Technical opening" optional hint="Technical bid opening date">
                        <input type="date" className="form-input" value={form.tech_opeining} onChange={set('tech_opeining')} />
                    </Field>
                    <Field label="Financial opening" optional hint="Financial bid opening date">
                        <input type="date" className="form-input" value={form.financial_opening} onChange={set('financial_opening')} />
                    </Field>
                </div>
                {orderWarning && <div className="alert alert-warning">{orderWarning}</div>}
            </form>
        </Modal>
    );
};

export default CreateTenderModal;

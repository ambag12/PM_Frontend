import React, { useState } from 'react';
import { FaFlagCheckered } from 'react-icons/fa';
import { Modal, Button, Field } from '../UI';
import { milestoneService } from '../../api/services';
import { useToast } from '../../context/ToastContext';
import { addDays, toISODate } from './utils';

/*
 * SprintFormModal — create (no `sprint`) or edit a sprint (milestone).
 * `lastFinish` (ISO date) seeds the default start of a new sprint.
 */
const SprintFormModal = ({ projectId, sprint, lastFinish, sprintCount = 0, onClose, onSaved }) => {
    const toast = useToast();
    const defaultStart = lastFinish && lastFinish >= toISODate(new Date()) ? addDays(lastFinish, 1) : toISODate(new Date());
    const [form, setForm] = useState(() => ({
        name: sprint?.name || `Sprint ${sprintCount + 1}`,
        estimated_start: sprint?.estimated_start || defaultStart,
        estimated_finish: sprint?.estimated_finish || addDays(defaultStart, 13),
    }));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
    const invalidRange = form.estimated_start && form.estimated_finish && form.estimated_finish < form.estimated_start;
    const canSave = form.name.trim() && form.estimated_start && form.estimated_finish && !invalidRange;

    const lengthDays = form.estimated_start && form.estimated_finish && !invalidRange
        ? Math.round((new Date(form.estimated_finish) - new Date(form.estimated_start)) / 86400000) + 1
        : null;

    const submit = async (e) => {
        e?.preventDefault();
        if (!canSave) return;
        setSaving(true);
        setError('');
        try {
            const payload = { name: form.name.trim(), estimated_start: form.estimated_start, estimated_finish: form.estimated_finish };
            const res = sprint
                ? await milestoneService.update(sprint.id, payload)
                : await milestoneService.create({ project: Number(projectId), ...payload });
            toast.success(sprint ? 'Sprint updated' : `Sprint “${payload.name}” created`);
            onSaved?.(res.data);
            onClose();
        } catch (err) {
            setError(err?.response?.data?.name?.[0] || err?.response?.data?._error_message || 'Could not save the sprint');
            toast.error(err);
            setSaving(false);
        }
    };

    return (
        <Modal
            isOpen
            onClose={onClose}
            title={sprint ? 'Edit sprint' : 'New sprint'}
            footer={(
                <>
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={submit} loading={saving} disabled={!canSave} icon={<FaFlagCheckered />}>
                        {sprint ? 'Save changes' : 'Create sprint'}
                    </Button>
                </>
            )}
        >
            <form onSubmit={submit}>
                {error && <div className="alert alert-error mb-4">{error}</div>}
                <Field label="Sprint name">
                    <input className="form-input" value={form.name} onChange={set('name')} autoFocus required aria-label="Sprint name" />
                </Field>
                <div className="form-grid">
                    <Field label="Start date">
                        <input type="date" className="form-input" value={form.estimated_start} onChange={set('estimated_start')} required aria-label="Start date" />
                    </Field>
                    <Field label="End date" error={invalidRange ? 'End date must be after the start date' : null}>
                        <input type="date" className="form-input" value={form.estimated_finish} min={form.estimated_start} onChange={set('estimated_finish')} required aria-label="End date" />
                    </Field>
                </div>
                {lengthDays && <div className="form-hint mt-0">{lengthDays} days · {Math.ceil(lengthDays / 7)} week{lengthDays > 7 ? 's' : ''}</div>}
                <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
            </form>
        </Modal>
    );
};

export default SprintFormModal;

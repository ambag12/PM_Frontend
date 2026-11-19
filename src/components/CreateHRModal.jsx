import React, { useRef, useState } from 'react';
import { FaPlus, FaUpload, FaFileAlt, FaTimes, FaMagic } from 'react-icons/fa';
import { hrService } from '../api/services';
import { getErrorMessage } from '../api/client';
import { useToast } from '../context/ToastContext';
import { formatBytes } from '../utils/format';
import { Modal, Field } from './UI';
import { useMyProjects } from './modules/hooks';
import { isStorageError, todayInput, toApiDateTime } from './modules/moduleUtils';
import '../styles/modules.css';

const PAY_SCALES = Array.from({ length: 22 }, (_, i) => `BPS-${i + 1}`);
const toInt = (v) => (v === '' || v === null || v === undefined ? 0 : Math.max(0, parseInt(v, 10) || 0));

/*
 * Create an HR / staffing record (multipart). The optional document is uploaded to Cloudinary
 * by the backend; when storage isn't configured we explain and offer to save without it.
 *   onCreated(record)
 */
const CreateHRModal = ({ projectId, projects: projectsProp, defaultProjectId, positions = [], onClose, onCreated, isOpen = true }) => {
    const toast = useToast();
    const needPicker = !projectId;
    const mine = useMyProjects(needPicker && !projectsProp);
    const projects = projectsProp || mine.projects;
    const fileRef = useRef(null);

    const [form, setForm] = useState({
        project: projectId || defaultProjectId || '',
        hr_name: '',
        position: '',
        ppps: '',
        no_of_posts: '',
        filled: '',
        vacancy: '',
        created_date: todayInput(),
        finish_date: '',
        filename: '',
    });
    const [vacancyTouched, setVacancyTouched] = useState(false);
    const [file, setFile] = useState(null);
    const [dragging, setDragging] = useState(false);
    const [touched, setTouched] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [storageError, setStorageError] = useState(false);

    const project = form.project || (needPicker && projects.length === 1 ? projects[0].id : '');
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const posts = toInt(form.no_of_posts);
    const filled = toInt(form.filled);
    const suggestedVacancy = Math.max(posts - filled, 0);
    const vacancy = vacancyTouched ? toInt(form.vacancy) : suggestedVacancy;

    const errors = {
        project: touched && !project ? 'Choose a project.' : null,
        hr_name: touched && !form.hr_name.trim() ? 'Give the record a title (e.g. "Nursing staff").' : null,
        created_date: touched && !form.created_date ? 'Start date is required.' : null,
        finish_date: form.finish_date && form.created_date && form.finish_date < form.created_date ? 'Finish date is before the start date.' : null,
    };
    const warnings = [];
    if (filled > posts && posts > 0) warnings.push(`Filled (${filled}) is more than the sanctioned posts (${posts}).`);
    else if (filled + vacancy > posts) warnings.push(`Filled + vacant (${filled + vacancy}) exceeds sanctioned posts (${posts}).`);

    const pickFile = (f) => {
        if (!f) return;
        setFile(f);
        setStorageError(false);
        setForm((s) => ({ ...s, filename: s.filename || f.name }));
    };

    const save = async (withFile) => {
        setTouched(true);
        if (!project || !form.hr_name.trim() || !form.created_date || errors.finish_date) return;
        setSaving(true);
        setError(null);
        try {
            const fields = {
                project: Number(project),
                hr_name: form.hr_name.trim(),
                // filename is NOT NULL in the DB: fall back to the title.
                filename: (form.filename || (withFile && file?.name) || form.hr_name).trim(),
                position: form.position.trim(),
                ppps: form.ppps.trim(),
                no_of_posts: posts,
                filled,
                vacancy,
                created_date: toApiDateTime(form.created_date),
                finish_date: toApiDateTime(form.finish_date),
            };
            const res = await hrService.create(fields, withFile ? file : null);
            toast.success(withFile && file ? 'HR record and document saved' : 'HR record created');
            onCreated?.(res.data?.data || null);
        } catch (err) {
            const msg = getErrorMessage(err);
            if (withFile && file && isStorageError(msg)) {
                setStorageError(true);
            } else {
                setError(msg);
            }
        } finally {
            setSaving(false);
        }
    };

    const submit = (e) => {
        e.preventDefault();
        save(true);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="New HR record"
            size="lg"
            footer={(
                <>
                    <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button type="submit" form="create-hr-form" className="btn btn-primary" disabled={saving}>
                        {saving ? <span className="spinner spinner-sm" /> : <FaPlus size={11} />} Create record
                    </button>
                </>
            )}
        >
            <form id="create-hr-form" onSubmit={submit} noValidate>
                {error && <div className="alert alert-error mb-4">{error}</div>}
                {storageError && (
                    <div className="alert alert-warning mb-4">
                        <div className="flex-1">
                            <strong>The document couldn&apos;t be uploaded.</strong> File storage (Cloudinary) isn&apos;t configured on this server.
                            You can save the record without the document and attach it later once storage is set up.
                            <div className="mt-2">
                                <button type="button" className="btn btn-accent btn-sm" disabled={saving} onClick={() => save(false)}>
                                    Save without document
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="form-grid">
                    {needPicker && (
                        <Field label="Project" error={errors.project} className="span-2">
                            <select className="form-input" value={project} onChange={set('project')} disabled={!projects.length}>
                                <option value="">{mine.loaded || projectsProp ? 'Select a project…' : 'Loading projects…'}</option>
                                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </Field>
                    )}
                    <Field label="Title" error={errors.hr_name} className="span-2" hint="The cadre or staffing group, e.g. “Nursing staff”.">
                        <input className="form-input" value={form.hr_name} onChange={set('hr_name')} placeholder="e.g. Nursing staff" autoFocus />
                    </Field>
                    <Field label="Position" optional>
                        <input className="form-input" list="hr-positions" value={form.position} onChange={set('position')} placeholder="e.g. Staff Nurse" />
                        <datalist id="hr-positions">{positions.map((p) => <option key={p} value={p} />)}</datalist>
                    </Field>
                    <Field label="Pay scale (PPPS / BPS)" optional>
                        <input className="form-input" list="hr-payscales" value={form.ppps} onChange={set('ppps')} placeholder="e.g. BPS-16" />
                        <datalist id="hr-payscales">{PAY_SCALES.map((p) => <option key={p} value={p} />)}</datalist>
                    </Field>
                </div>

                <div className="mod-posts-grid">
                    <Field label="Sanctioned posts">
                        <input type="number" min="0" inputMode="numeric" className="form-input" value={form.no_of_posts} onChange={set('no_of_posts')} placeholder="0" />
                    </Field>
                    <Field label="Filled">
                        <input type="number" min="0" inputMode="numeric" className="form-input" value={form.filled} onChange={set('filled')} placeholder="0" />
                    </Field>
                    <Field
                        label="Vacant"
                        hint={vacancyTouched && vacancy !== suggestedVacancy ? (
                            <button type="button" className="mod-link-btn" onClick={() => { setVacancyTouched(false); setForm((f) => ({ ...f, vacancy: '' })); }}>
                                <FaMagic size={9} /> Use {suggestedVacancy} (posts − filled)
                            </button>
                        ) : !vacancyTouched ? 'Auto: posts − filled' : null}
                    >
                        <input
                            type="number"
                            min="0"
                            inputMode="numeric"
                            className="form-input"
                            value={vacancyTouched ? form.vacancy : String(suggestedVacancy)}
                            onChange={(e) => { setVacancyTouched(true); setForm((f) => ({ ...f, vacancy: e.target.value })); }}
                        />
                    </Field>
                </div>
                {warnings.map((w) => <div key={w} className="alert alert-warning mb-3">{w}</div>)}

                <div className="form-grid">
                    <Field label="Start date" error={errors.created_date}>
                        <input type="date" className="form-input" value={form.created_date} onChange={set('created_date')} />
                    </Field>
                    <Field label="Finish date" optional error={errors.finish_date} hint="Leave empty if ongoing.">
                        <input type="date" className="form-input" value={form.finish_date} onChange={set('finish_date')} />
                    </Field>
                </div>

                <Field label="Supporting document" optional hint="Sanction letter, advertisement or notification (PDF, DOCX, XLSX…).">
                    {file ? (
                        <div className="attachment-item">
                            <span className="attachment-thumb"><FaFileAlt /></span>
                            <div className="flex-1">
                                <div className="text-sm font-semibold truncate">{file.name}</div>
                                <div className="text-xs text-muted">{formatBytes(file.size)}</div>
                            </div>
                            <button type="button" className="btn btn-ghost btn-sm btn-icon" aria-label="Remove file" onClick={() => { setFile(null); setStorageError(false); }}>
                                <FaTimes size={12} />
                            </button>
                        </div>
                    ) : (
                        <div
                            className={`dropzone ${dragging ? 'dragging' : ''}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => fileRef.current?.click()}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileRef.current?.click(); } }}
                            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={(e) => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files?.[0]); }}
                        >
                            <FaUpload />
                            <span><strong>Click to choose</strong> or drag a file here</span>
                        </div>
                    )}
                    <input ref={fileRef} type="file" className="sr-only" tabIndex={-1} onChange={(e) => pickFile(e.target.files?.[0])} />
                </Field>
                <Field label="Document name" optional hint="Defaults to the file name, or the title when no file is attached.">
                    <input className="form-input" value={form.filename} onChange={set('filename')} placeholder={file?.name || form.hr_name || 'e.g. Sanction letter 2026.pdf'} />
                </Field>
            </form>
        </Modal>
    );
};

export default CreateHRModal;

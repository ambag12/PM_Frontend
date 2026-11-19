import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    FaProjectDiagram, FaCheckCircle, FaRunning, FaColumns, FaInfoCircle, FaCoins, FaFileUpload, FaImage,
    FaLock, FaGlobeAsia, FaTimes, FaFilePdf, FaArrowLeft, FaExclamationCircle,
} from 'react-icons/fa';
import { projectService, projectTemplateService } from '../api/services';
import { getErrorMessage } from '../api/client';
import { useToast } from '../context/ToastContext';
import { PageHeader, Switch } from '../components/UI';
import { ProjectLogo, SkeletonRows } from '../components/overview/OverviewParts';
import useAsync from '../components/overview/useAsync';
import { formatCompact, formatDate, formatNumber } from '../utils/format';
import '../styles/overview.css';

const templateIcon = (t) => {
    const s = `${t.slug} ${t.name}`.toLowerCase();
    if (s.includes('kanban')) return <FaColumns />;
    if (s.includes('scrum')) return <FaRunning />;
    return <FaProjectDiagram />;
};

const todayIso = () => new Date().toISOString().slice(0, 10);

// Server errors may come back as an HTML page — keep toasts readable.
const stepError = (err, fallback) => {
    const data = err?.response?.data;
    if (typeof data === 'string' && data.trim().startsWith('<')) return `${fallback} (server error ${err.response.status})`;
    return getErrorMessage(err, fallback);
};

const CreateProject = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const templatesQ = useAsync(() => projectTemplateService.list().then((r) => (Array.isArray(r.data) ? r.data : [])), []);
    const templates = useMemo(() => [...(templatesQ.data || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [templatesQ.data]);

    const [form, setForm] = useState({
        template: null,
        name: '',
        description: '',
        is_private: false,
        total_budget: '',
        psdp: '',
        location: '',
        obj_of_proj: '',
        due_date: '',
    });
    const [logo, setLogo] = useState(null);
    const [pc1, setPc1] = useState(null);
    const [errors, setErrors] = useState({});
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [step, setStep] = useState('');

    const templateId = form.template ?? templates[0]?.id ?? null;
    const selectedTemplate = templates.find((t) => t.id === templateId);

    const [logoUrl, setLogoUrl] = useState(null);

    const pickLogo = (file) => {
        setLogo(file);
        setLogoUrl(null);
        setErrors((x) => ({ ...x, logo: undefined }));
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = () => setLogoUrl(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const set = (key) => (e) => {
        const value = e && e.target ? e.target.value : e;
        setForm((f) => ({ ...f, [key]: value }));
        if (errors[key]) setErrors((x) => ({ ...x, [key]: undefined }));
    };

    const validate = () => {
        const next = {};
        if (!form.name.trim()) next.name = 'Give the project a name.';
        else if (form.name.trim().length > 250) next.name = 'Keep the name under 250 characters.';
        if (!form.description.trim()) next.description = 'Add a short description.';
        if (form.total_budget !== '' && (!/^\d+$/.test(String(form.total_budget).trim()))) next.total_budget = 'Enter a whole number without commas.';
        if (!templateId) next.template = 'Choose a template.';
        if (logo && !logo.type.startsWith('image/')) next.logo = 'The logo must be an image (PNG, JPG, SVG…).';
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!validate()) return;
        setSubmitting(true);
        setStep('Creating project…');
        let created;
        try {
            const res = await projectService.create({
                name: form.name.trim(),
                description: form.description.trim(),
                creation_template: templateId,
                is_private: form.is_private,
                total_budget: form.total_budget === '' ? null : Number(form.total_budget),
                psdp: form.psdp.trim() || null,
                location: form.location.trim() || null,
                obj_of_proj: form.obj_of_proj.trim() || null,
            });
            created = res.data;
        } catch (err) {
            const data = err?.response?.data;
            const fieldErrors = {};
            if (data && typeof data === 'object') {
                ['name', 'description', 'total_budget', 'psdp', 'location', 'obj_of_proj'].forEach((k) => {
                    if (data[k]) fieldErrors[k] = [].concat(data[k]).join(' ');
                });
            }
            setErrors(fieldErrors);
            setError(getErrorMessage(err, 'Could not create the project.'));
            setSubmitting(false);
            setStep('');
            return;
        }

        // Optional follow-up steps: failures here are warnings, the project already exists.
        if (form.due_date) {
            setStep('Setting due date…');
            try { await projectService.changeDueDate(created.id, form.due_date); } catch (err) { toast.warning(`Due date not saved: ${stepError(err, 'request failed')}`, 7000); }
        }
        if (logo) {
            setStep('Uploading logo…');
            try { await projectService.changeLogo(created.id, logo); } catch (err) { toast.warning(`Logo not uploaded: ${stepError(err, 'request failed')}`, 7000); }
        }
        if (pc1) {
            setStep('Uploading PC-1 document…');
            try {
                await projectService.uploadPc1(created.id, pc1);
            } catch (err) {
                toast.warning(`PC-1 document could not be uploaded — ${stepError(err, 'file storage is unavailable')}. You can upload it later from project settings.`, 9000);
            }
        }
        toast.success(`“${created.name}” created`);
        navigate(`/project/${created.id}`);
    };

    const budgetPreview = form.total_budget && /^\d+$/.test(String(form.total_budget)) ? formatCompact(form.total_budget) : null;

    return (
        <>
            <PageHeader
                icon={<FaProjectDiagram />}
                title="New project"
                subtitle="Set up a workspace for a development scheme — scope, funding, schedule and documents."
                actions={<Link to="/" className="btn btn-ghost"><FaArrowLeft size={11} /> Back to dashboard</Link>}
            />

            <form onSubmit={handleSubmit} noValidate>
                <div className="grid-main-side">
                    <div className="card flush">
                        {error && (
                            <div className="p-4" style={{ paddingBottom: 0 }}>
                                <div className="alert alert-error" role="alert"><FaExclamationCircle style={{ marginTop: 3 }} /><span>{error}</span></div>
                            </div>
                        )}

                        {/* Template */}
                        <div className="ov-form-section">
                            <div className="ov-form-section-title"><FaColumns /> Working method</div>
                            <div className="ov-form-section-sub">Templates pre-configure statuses, points and roles. You can change everything later.</div>
                            {templatesQ.loading && <SkeletonRows rows={2} height={56} />}
                            {templatesQ.error && !templatesQ.data && (
                                <div className="alert alert-error"><span className="flex-1">Could not load project templates.</span><button type="button" className="btn btn-sm btn-secondary" onClick={templatesQ.reload}>Retry</button></div>
                            )}
                            {templates.length > 0 && (
                                <div className="ov-templates" role="radiogroup" aria-label="Project template">
                                    {templates.map((t) => {
                                        const selected = t.id === templateId;
                                        return (
                                            <button
                                                key={t.id}
                                                type="button"
                                                role="radio"
                                                aria-checked={selected}
                                                className={`ov-template ${selected ? 'selected' : ''}`}
                                                onClick={() => set('template')(t.id)}
                                            >
                                                <span className="ov-template-icon">{templateIcon(t)}</span>
                                                <span className="flex-1">
                                                    <span className="ov-template-name block">{t.name}</span>
                                                    <span className="ov-template-desc">{t.description}</span>
                                                </span>
                                                {selected && <FaCheckCircle className="ov-template-check" aria-hidden="true" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            {errors.template && <div className="form-error">{errors.template}</div>}
                        </div>

                        {/* Basics */}
                        <div className="ov-form-section">
                            <div className="ov-form-section-title"><FaInfoCircle /> Basics</div>
                            <div className="ov-form-section-sub">How the project appears to your team.</div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="cp-name">Project name</label>
                                <input id="cp-name" className={`form-input ${errors.name ? 'is-invalid' : ''}`} value={form.name} onChange={set('name')} placeholder="e.g. District Hospital Expansion — Phase II" autoFocus aria-invalid={errors.name ? 'true' : undefined} />
                                {errors.name && <div className="form-error">{errors.name}</div>}
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="cp-desc">Description</label>
                                <textarea id="cp-desc" rows={3} className={`form-input ${errors.description ? 'is-invalid' : ''}`} value={form.description} onChange={set('description')} placeholder="A one-paragraph summary of the scheme and its scope." aria-invalid={errors.description ? 'true' : undefined} />
                                {errors.description && <div className="form-error">{errors.description}</div>}
                            </div>
                            <div className="ov-privacy">
                                <div>
                                    <div className="font-semibold text-heading row">{form.is_private ? <FaLock size={12} /> : <FaGlobeAsia size={12} />} {form.is_private ? 'Private project' : 'Public project'}</div>
                                    <div className="text-xs text-muted">{form.is_private ? 'Only invited members can see it.' : 'Anyone with an account can view it; only members can edit.'}</div>
                                </div>
                                <Switch checked={form.is_private} onChange={(v) => set('is_private')(v)} label={<span className="sr-only">Private project</span>} />
                            </div>
                        </div>

                        {/* Details */}
                        <div className="ov-form-section">
                            <div className="ov-form-section-title"><FaCoins /> Funding &amp; schedule</div>
                            <div className="ov-form-section-sub">PC-1 / PSDP details shown on the project overview. All optional.</div>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label" htmlFor="cp-budget">Total budget <span className="optional">(optional)</span></label>
                                    <div className="ov-input-affix">
                                        <span className="ov-affix">PKR</span>
                                        <input id="cp-budget" inputMode="numeric" className={`form-input ${errors.total_budget ? 'is-invalid' : ''}`} value={form.total_budget} onChange={(e) => set('total_budget')(e.target.value.replace(/[,\s]/g, ''))} placeholder="2450000000" />
                                    </div>
                                    {errors.total_budget
                                        ? <div className="form-error">{errors.total_budget}</div>
                                        : <div className="form-hint">{budgetPreview ? `≈ ${budgetPreview} (${formatNumber(form.total_budget)})` : 'Whole amount, no commas.'}</div>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="cp-psdp">PSDP no. <span className="optional">(optional)</span></label>
                                    <input id="cp-psdp" className="form-input" value={form.psdp} onChange={set('psdp')} placeholder="e.g. PSDP-2026-117" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="cp-location">Location <span className="optional">(optional)</span></label>
                                    <input id="cp-location" className="form-input" value={form.location} onChange={set('location')} placeholder="e.g. Multan, Punjab" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="cp-due">Due date <span className="optional">(optional)</span></label>
                                    <input id="cp-due" type="date" className="form-input" value={form.due_date} min={todayIso()} onChange={set('due_date')} />
                                </div>
                                <div className="form-group span-2">
                                    <label className="form-label" htmlFor="cp-obj">Objective <span className="optional">(optional)</span></label>
                                    <textarea id="cp-obj" rows={3} className="form-input" value={form.obj_of_proj} onChange={set('obj_of_proj')} placeholder="What will the project achieve? e.g. Expand bed capacity by 300 across three district hospitals." />
                                </div>
                            </div>
                        </div>

                        {/* Documents */}
                        <div className="ov-form-section">
                            <div className="ov-form-section-title"><FaFileUpload /> Logo &amp; documents</div>
                            <div className="ov-form-section-sub">Optional — you can add these later from project settings.</div>
                            <div className="form-grid">
                                <div className="form-group">
                                    <span className="form-label">Project logo</span>
                                    <div className="ov-logo-picker">
                                        {logoUrl
                                            ? <span className="ov-logo" style={{ '--logo-size': '56px' }}><img src={logoUrl} alt="Logo preview" /></span>
                                            : <ProjectLogo project={{ id: 1, name: form.name || 'New project' }} size={56} />}
                                        <div className="stack-sm" style={{ minWidth: 0 }}>
                                            <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                                                <FaImage size={11} /> {logo ? 'Change image' : 'Choose image'}
                                                <input type="file" accept="image/*" className="sr-only" onChange={(e) => { pickLogo(e.target.files?.[0] || null); e.target.value = ''; }} />
                                            </label>
                                            {logo && <button type="button" className="btn btn-ghost btn-sm" onClick={() => pickLogo(null)}><FaTimes size={10} /> Remove</button>}
                                        </div>
                                    </div>
                                    {errors.logo ? <div className="form-error">{errors.logo}</div> : <div className="form-hint">Square image, at least 200 × 200 px.</div>}
                                </div>
                                <div className="form-group">
                                    <span className="form-label">PC-1 document</span>
                                    {pc1 ? (
                                        <div className="attachment-item">
                                            <span className="attachment-thumb"><FaFilePdf /></span>
                                            <span className="ov-file-name flex-1"><span title={pc1.name}>{pc1.name}</span></span>
                                            <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setPc1(null)} aria-label="Remove PC-1 file"><FaTimes /></button>
                                        </div>
                                    ) : (
                                        <label className="dropzone">
                                            <FaFileUpload />
                                            <span><strong>Choose a file</strong> — PDF or Word</span>
                                            <input type="file" accept=".pdf,.doc,.docx,application/pdf" className="sr-only" onChange={(e) => { setPc1(e.target.files?.[0] || null); e.target.value = ''; }} />
                                        </label>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="ov-form-footer">
                            <Link to="/" className="btn btn-secondary">Cancel</Link>
                            <button type="submit" className="btn btn-primary" disabled={submitting || templatesQ.loading}>
                                {submitting ? <><span className="spinner spinner-sm" /> {step || 'Creating…'}</> : 'Create project'}
                            </button>
                        </div>
                    </div>

                    <aside className="stack">
                        <div className="card">
                            <div className="card-header"><h2 className="card-title">Summary</h2></div>
                            <div className="row mb-3">
                                {logoUrl
                                    ? <span className="ov-logo" style={{ '--logo-size': '40px' }}><img src={logoUrl} alt="" /></span>
                                    : <ProjectLogo project={{ id: 1, name: form.name || 'New project' }} size={40} />}
                                <div className="flex-1">
                                    <div className="font-semibold text-heading truncate">{form.name || 'Untitled project'}</div>
                                    <div className="text-xs text-muted">{selectedTemplate?.name || '—'} template</div>
                                </div>
                            </div>
                            <div className="ov-summary-row"><span>Visibility</span><span>{form.is_private ? 'Private' : 'Public'}</span></div>
                            <div className="ov-summary-row"><span>Budget</span><span>{budgetPreview ? `PKR ${budgetPreview}` : '—'}</span></div>
                            <div className="ov-summary-row"><span>PSDP no.</span><span>{form.psdp || '—'}</span></div>
                            <div className="ov-summary-row"><span>Location</span><span>{form.location || '—'}</span></div>
                            <div className="ov-summary-row"><span>Due date</span><span>{form.due_date ? formatDate(form.due_date) : '—'}</span></div>
                            <div className="ov-summary-row"><span>PC-1</span><span>{pc1 ? 'Attached' : 'Not attached'}</span></div>
                        </div>
                        <div className="card">
                            <div className="card-header"><h2 className="card-title">After you create it</h2></div>
                            <ol className="ov-steps">
                                <li><span>1</span><span>Invite your team and assign roles from <strong>Team</strong>.</span></li>
                                <li><span>2</span><span>Break the scope into epics and user stories in the <strong>Backlog</strong>.</span></li>
                                <li><span>3</span><span>Plan sprints, track tenders and HR, and follow progress on the overview.</span></li>
                            </ol>
                        </div>
                    </aside>
                </div>
            </form>
        </>
    );
};

export default CreateProject;

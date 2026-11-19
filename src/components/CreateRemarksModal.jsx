import React, { useContext, useEffect, useId, useMemo, useState } from 'react';
import { FaFileContract, FaUserTie, FaPaperPlane } from 'react-icons/fa';
import { hrService, remarkService, tenderService } from '../api/services';
import { getErrorMessage } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { timeAgo } from '../utils/format';
import { Modal, Field } from './UI';
import { loadMemberships, memberName, useMyProjects } from './modules/hooks';
import { sortRemarks, tenderStatusMeta } from './modules/moduleUtils';
import '../styles/modules.css';

const unwrap = (res) => {
    const d = res?.data?.data ?? res?.data;
    return Array.isArray(d) ? d : [];
};

/*
 * Add a remark to a tender or an HR record.
 *   <CreateRemarksModal projectId? hrId? tenderId? onClose onCreated />
 * Without projectId the user picks a project first; without hrId/tenderId they pick the target.
 * `user_member` is the current user's MEMBERSHIP id in that project.
 */
const CreateRemarksModal = ({ projectId, hrId, tenderId, onClose, onCreated, isOpen = true }) => {
    const toast = useToast();
    const { user } = useContext(AuthContext);
    const textId = useId();
    const presetKind = tenderId ? 'tender' : hrId ? 'hr' : null;
    const presetId = tenderId || hrId || null;

    // A preset target without a project: look the record up to learn its project.
    const [presetProject, setPresetProject] = useState(null);
    useEffect(() => {
        if (projectId || !presetId) return undefined;
        let alive = true;
        const svc = presetKind === 'tender' ? tenderService : hrService;
        svc.get(presetId)
            .then((res) => alive && setPresetProject(unwrap(res)[0]?.project || 'missing'))
            .catch(() => alive && setPresetProject('missing'));
        return () => { alive = false; };
    }, [projectId, presetId, presetKind]);

    const fixedProject = projectId || (presetProject && presetProject !== 'missing' ? presetProject : null);
    const { projects, loaded: projectsLoaded } = useMyProjects(true);

    const [pickedProject, setPickedProject] = useState('');
    const project = fixedProject || pickedProject || (projects.length === 1 ? projects[0].id : '');
    const projectName = projects.find((p) => String(p.id) === String(project))?.name;

    const [kind, setKind] = useState(presetKind || 'tender');
    const [targetId, setTargetId] = useState(presetId ? String(presetId) : '');
    const [text, setText] = useState('');
    const [touched, setTouched] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    // Targets + memberships of the chosen project.
    const [data, setData] = useState({ pid: null, tenders: [], hr: [], memberships: [], error: null });
    useEffect(() => {
        if (!project) return undefined;
        let alive = true;
        Promise.all([
            tenderService.list(project).then(unwrap),
            hrService.list(project).then(unwrap),
            loadMemberships(project).catch(() => []),
        ])
            .then(([tenders, hr, memberships]) => alive && setData({ pid: String(project), tenders, hr, memberships, error: null }))
            .catch((err) => alive && setData({ pid: String(project), tenders: [], hr: [], memberships: [], error: err }));
        return () => { alive = false; };
    }, [project]);
    const ready = !!project && data.pid === String(project);

    const me = useMemo(() => data.memberships.find((m) => String(m.user) === String(user?.id)) || null, [data.memberships, user?.id]);
    const targets = kind === 'tender' ? data.tenders : data.hr;
    const target = targets.find((t) => String(t.id) === String(targetId)) || null;
    const recent = sortRemarks(kind === 'tender' ? target?.tender_remarks : target?.hr_remarks).slice(0, 2);

    const errors = {
        project: touched && !project ? 'Choose a project.' : null,
        target: touched && !target ? `Choose ${kind === 'tender' ? 'a tender' : 'an HR record'}.` : null,
        text: touched && !text.trim() ? 'Write the remark.' : null,
    };

    const changeProject = (value) => {
        setPickedProject(value);
        if (!presetId) setTargetId('');
    };
    const changeKind = (value) => {
        setKind(value);
        setTargetId('');
    };

    const submit = async (e) => {
        e.preventDefault();
        setTouched(true);
        if (!project || !target || !text.trim()) return;
        setSaving(true);
        setError(null);
        try {
            const res = await remarkService.create({
                project: Number(project),
                remarks: text.trim(),
                ...(kind === 'tender' ? { tenders: target.id } : { hr: target.id }),
                ...(me ? { user_member: me.id } : {}),
            });
            toast.success(`Remark added to ${kind === 'tender' ? 'tender' : 'HR record'} “${kind === 'tender' ? target.name_of_tenders : target.hr_name}”`);
            onCreated?.(res.data?.data || null);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const presetMissing = presetProject === 'missing';
    const targetLabel = (t) => (kind === 'tender'
        ? `${t.name_of_tenders || 'Untitled tender'} — ${tenderStatusMeta(t.status).label}`
        : `${t.hr_name || 'Untitled record'}${t.position ? ` — ${t.position}` : ''}${t.ppps ? ` (${t.ppps})` : ''}`);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Add remark"
            footer={(
                <>
                    <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button type="submit" form="create-remark-form" className="btn btn-primary" disabled={saving || presetMissing}>
                        {saving ? <span className="spinner spinner-sm" /> : <FaPaperPlane size={11} />} Post remark
                    </button>
                </>
            )}
        >
            <form id="create-remark-form" onSubmit={submit} noValidate>
                {error && <div className="alert alert-error mb-4">{error}</div>}
                {presetMissing && <div className="alert alert-error mb-4">The selected record could not be found.</div>}

                {fixedProject ? (
                    <div className="mod-remark-context mb-4">
                        <span className="eyebrow">Project</span>
                        <span className="font-semibold text-heading">{projectName || `Project #${fixedProject}`}</span>
                    </div>
                ) : (
                    <Field label="Project" error={errors.project}>
                        <select className="form-input" value={project} onChange={(e) => changeProject(e.target.value)} disabled={!projectsLoaded || !projects.length}>
                            <option value="">{projectsLoaded ? (projects.length ? 'Select a project…' : 'You are not a member of any project') : 'Loading projects…'}</option>
                            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </Field>
                )}

                {!presetKind && (
                    <Field label="Attach to">
                        <div className="segmented" role="radiogroup" aria-label="Remark target type">
                            <button type="button" role="radio" aria-checked={kind === 'tender'} className={kind === 'tender' ? 'active' : ''} onClick={() => changeKind('tender')}>
                                <FaFileContract size={11} /> Tender {ready && <span className="mod-count">{data.tenders.length}</span>}
                            </button>
                            <button type="button" role="radio" aria-checked={kind === 'hr'} className={kind === 'hr' ? 'active' : ''} onClick={() => changeKind('hr')}>
                                <FaUserTie size={11} /> HR record {ready && <span className="mod-count">{data.hr.length}</span>}
                            </button>
                        </div>
                    </Field>
                )}

                <Field
                    label={kind === 'tender' ? 'Tender' : 'HR record'}
                    error={errors.target || (data.error && ready ? getErrorMessage(data.error) : null)}
                    hint={ready && !targets.length ? `This project has no ${kind === 'tender' ? 'tenders' : 'HR records'} yet.` : null}
                >
                    <select
                        className="form-input"
                        value={targetId}
                        onChange={(e) => setTargetId(e.target.value)}
                        disabled={!ready || !!presetId || !targets.length}
                    >
                        <option value="">
                            {!project ? 'Choose a project first' : !ready ? 'Loading…' : `Select ${kind === 'tender' ? 'a tender' : 'an HR record'}…`}
                        </option>
                        {targets.map((t) => <option key={t.id} value={t.id}>{targetLabel(t)}</option>)}
                    </select>
                </Field>

                {recent.length > 0 && (
                    <div className="mod-recent mb-4">
                        <div className="eyebrow mb-1">Latest remarks</div>
                        {recent.map((r) => (
                            <div key={r.id} className="mod-recent-item">
                                <span className="truncate">{r.remarks}</span>
                                <span className="text-xs text-muted nowrap">{timeAgo(r.created_at)}</span>
                            </div>
                        ))}
                    </div>
                )}

                <Field label="Remark" error={errors.text}>
                    <textarea
                        id={textId}
                        className="form-input"
                        rows={4}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Committee decision, clarification, recruitment update…"
                        aria-label="Remark"
                    />
                </Field>
                {ready && (
                    <p className="text-xs text-muted">
                        {me ? <>Posting as <strong>{memberName(me)}</strong>{me.role_name ? ` (${me.role_name})` : ''}.</> : 'You are not a member of this project; the remark will be posted without an author.'}
                    </p>
                )}
            </form>
        </Modal>
    );
};

export default CreateRemarksModal;

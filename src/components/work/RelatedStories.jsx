import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaBookOpen, FaPlus, FaLink, FaUnlink } from 'react-icons/fa';
import { epicService, taskService, userStoryService } from '../../api/services';
import { useToast, useConfirm } from '../../context/ToastContext';
import { byId, percent } from '../../utils/format';
import { ProgressBar, StatusPill, UserAvatar } from '../UI';

/*
 * User stories related to an epic, with per-story task progress and overall progress.
 * Link an existing story, quick-create new ones (one per line → bulk_create), unlink.
 */
const RelatedStories = ({ epic, project, projectId, canModify, onChanged }) => {
    const toast = useToast();
    const confirm = useConfirm();
    const [data, setData] = useState({ id: null, stories: [], tasks: [], error: null });
    const [mode, setMode] = useState(null); // 'link' | 'create' | null
    const [allStories, setAllStories] = useState(null);
    const [text, setText] = useState('');
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        try {
            const [rel, stories, tasks] = await Promise.all([
                epicService.listRelated(epic.id),
                userStoryService.list({ project: projectId, epic: epic.id }),
                taskService.list({ project: projectId }),
            ]);
            const order = new Map((rel.data || []).map((r) => [r.user_story, r.order]));
            const linked = (stories.data || [])
                .filter((s) => order.has(s.id))
                .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
            setData({ id: epic.id, stories: linked, tasks: tasks.data || [], error: null });
        } catch (err) {
            setData({ id: epic.id, stories: [], tasks: [], error: err });
        }
    }, [epic.id, projectId]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        if (mode !== 'link' || allStories) return undefined;
        let off = false;
        userStoryService.list({ project: projectId })
            .then((res) => { if (!off) setAllStories(res.data || []); })
            .catch((err) => { if (!off) { setAllStories([]); toast.error(err); } });
        return () => { off = true; };
    }, [mode, allStories, projectId, toast]);

    const run = async (fn, msg) => {
        setBusy(true);
        try {
            await fn();
            if (msg) toast.success(msg);
            await load();
            onChanged?.();
            return true;
        } catch (err) {
            toast.error(err);
            return false;
        } finally {
            setBusy(false);
        }
    };

    const createStories = async (e) => {
        e.preventDefault();
        const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
        if (!lines.length) return;
        const ok = await run(
            () => epicService.bulkCreateRelated(epic.id, projectId, lines.join('\n')),
            lines.length === 1 ? 'User story created and linked' : `${lines.length} user stories created and linked`,
        );
        if (ok) { setText(''); setMode(null); setAllStories(null); }
    };

    const unlink = async (s) => {
        const ok = await confirm({ title: 'Remove story from epic?', message: `#${s.ref} "${s.subject}" stays in the project; only the link to this epic is removed.`, confirmText: 'Remove link', danger: true });
        if (ok) run(() => epicService.removeRelated(epic.id, s.id), `Story #${s.ref} unlinked`);
    };

    const loading = String(data.id) !== String(epic.id);
    const linkedIds = new Set(data.stories.map((s) => s.id));
    const candidates = (allStories || []).filter((s) => !linkedIds.has(s.id));
    const closed = data.stories.filter((s) => s.is_closed).length;
    const total = data.stories.length;

    return (
        <section className="work-section" aria-labelledby={`rel-${epic.id}`}>
            <div className="work-section-head">
                <h3 className="work-section-title" id={`rel-${epic.id}`}>
                    <FaBookOpen /> User stories {!loading && <span className="count-chip">{closed}/{total}</span>}
                </h3>
                {canModify && mode === null && (
                    <div className="row">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMode('link')}><FaLink size={10} /> Link existing</button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMode('create')}><FaPlus size={10} /> New story</button>
                    </div>
                )}
            </div>

            {mode === 'link' && (
                <div className="row mb-3">
                    <select
                        className="form-input form-input-sm flex-1"
                        value=""
                        disabled={busy || !allStories}
                        aria-label="Choose a user story to link"
                        onChange={(e) => {
                            const s = candidates.find((x) => String(x.id) === e.target.value);
                            if (s) run(() => epicService.addRelated(epic.id, s.id), `Story #${s.ref} linked`);
                        }}
                    >
                        <option value="">{allStories ? (candidates.length ? 'Choose a user story…' : 'All stories are already linked') : 'Loading stories…'}</option>
                        {candidates.map((s) => <option key={s.id} value={s.id}>#{s.ref} {s.subject}</option>)}
                    </select>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMode(null)}>Done</button>
                </div>
            )}

            {mode === 'create' && (
                <form className="stack-sm mb-3" onSubmit={createStories}>
                    <label className="form-label" htmlFor={`rel-new-${epic.id}`}>New user stories <span className="optional">(one per line)</span></label>
                    <textarea
                        id={`rel-new-${epic.id}`}
                        className="form-input"
                        rows={3}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder={'Install HVAC in ward B\nProcure ICU beds'}
                        autoFocus
                    />
                    <div className="row justify-end">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setMode(null); setText(''); }} disabled={busy}>Cancel</button>
                        <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !text.trim()}>
                            {busy && <span className="spinner spinner-sm" />} Create &amp; link
                        </button>
                    </div>
                </form>
            )}

            {loading ? (
                <div className="skeleton" style={{ height: 60 }} />
            ) : data.error ? (
                <div className="alert alert-error">Could not load related stories. <button type="button" className="btn btn-ghost btn-sm" onClick={load}>Retry</button></div>
            ) : total === 0 ? (
                <p className="text-sm text-muted">No user stories in this epic yet.</p>
            ) : (
                <>
                    <div className="epic-progress">
                        <ProgressBar value={percent(closed, total)} tone="success" showLabel />
                        <span className="text-xs text-muted">{closed} of {total} stories closed</span>
                    </div>
                    <ul className="work-rows">
                        {data.stories.map((s) => {
                            const tasks = data.tasks.filter((t) => t.user_story === s.id);
                            const doneTasks = tasks.filter((t) => t.is_closed).length;
                            const status = byId(project.us_statuses, s.status) || s.status_extra_info;
                            return (
                                <li key={s.id} className={`work-row work-row-story ${s.is_closed ? 'is-done' : ''}`}>
                                    <span className="ref">#{s.ref}</span>
                                    <Link className="work-row-title" to={`/project/${projectId}/backlog?ref=${s.ref}`}>{s.subject}</Link>
                                    <StatusPill status={status} />
                                    <span className="work-row-progress" title={tasks.length ? `${doneTasks}/${tasks.length} tasks closed` : 'No tasks'}>
                                        <ProgressBar value={s.is_closed ? 100 : percent(doneTasks, tasks.length)} size="sm" tone={s.is_closed ? 'success' : undefined} />
                                    </span>
                                    {s.assigned_to_extra_info
                                        ? <UserAvatar user={s.assigned_to_extra_info} size="xs" />
                                        : <span className="avatar avatar-xs avatar-empty" title="Unassigned" aria-label="Unassigned" />}
                                    {canModify && (
                                        <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => unlink(s)} disabled={busy} aria-label={`Unlink story #${s.ref}`} title="Remove from epic">
                                            <FaUnlink />
                                        </button>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </>
            )}
        </section>
    );
};

export default RelatedStories;

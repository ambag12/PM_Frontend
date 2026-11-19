import React, { useMemo, useState } from 'react';
import { FaHashtag, FaPlus, FaTrash, FaCompressArrowsAlt, FaSearch } from 'react-icons/fa';
import { projectService, epicService, userStoryService, taskService, issueService } from '../../api/services';
import { useToast, useConfirm } from '../../context/ToastContext';
import { Loader, EmptyState, Modal } from '../UI';
import { SettingsSection, ColorPicker, InlineText } from './shared';
import { PRESET_COLORS } from './constants';
import { useAsyncData } from './hooks';

/* Usage counts come from the filters_data endpoints of each module (tags: [{name, count}]). */
const loadUsage = async (projectId) => {
    const sources = [epicService, userStoryService, taskService, issueService];
    const results = await Promise.allSettled(sources.map((s) => s.getFiltersData(projectId)));
    const usage = {};
    results.forEach((r) => {
        if (r.status !== 'fulfilled') return;
        (r.value.data?.tags || []).forEach((t) => { usage[t.name] = (usage[t.name] || 0) + (t.count || 0); });
    });
    return usage;
};

const MergeModal = ({ tags, onClose, onMerge }) => {
    const [target, setTarget] = useState(tags[0] || '');
    const [busy, setBusy] = useState(false);
    const submit = async () => {
        setBusy(true);
        try { await onMerge(tags.filter((t) => t !== target), target); } finally { setBusy(false); }
    };
    return (
        <Modal
            isOpen
            onClose={onClose}
            title={`Merge ${tags.length} tags`}
            size="sm"
            footer={(
                <>
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={submit} disabled={busy || !target}>{busy ? <span className="spinner spinner-sm" /> : 'Merge tags'}</button>
                </>
            )}
        >
            <p className="text-sm text-secondary mb-3">Every item tagged with the other selected tags will be re-tagged with the one you keep.</p>
            <fieldset className="stack-sm" style={{ border: 'none' }}>
                <legend className="form-label">Keep this tag</legend>
                {tags.map((t) => (
                    <label key={t} className="row" style={{ cursor: 'pointer' }}>
                        <input type="radio" name="merge-target" checked={target === t} onChange={() => setTarget(t)} />
                        <span className="tag-chip">{t}</span>
                    </label>
                ))}
            </fieldset>
        </Modal>
    );
};

const TagsSettings = ({ project, canEdit, onChanged }) => {
    const toast = useToast();
    const confirm = useConfirm();
    const tagsQ = useAsyncData(() => projectService.getTagsColors(project.id).then((r) => r.data || {}), [project.id]);
    const usageQ = useAsyncData(() => loadUsage(project.id), [project.id]);
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState([]);
    const [merging, setMerging] = useState(false);
    const [newTag, setNewTag] = useState('');
    const [newColor, setNewColor] = useState(PRESET_COLORS[6]);
    const [busy, setBusy] = useState(false);

    const tags = useMemo(() => {
        const entries = Object.entries(tagsQ.data || project.tags_colors || {});
        return entries
            .map(([name, color]) => ({ name, color }))
            .filter((t) => t.name.toLowerCase().includes(query.trim().toLowerCase()))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [tagsQ.data, project.tags_colors, query]);

    const refresh = () => {
        tagsQ.reload();
        usageQ.reload();
        onChanged?.();
    };

    const run = async (fn, msg) => {
        try {
            await fn();
            toast.success(msg);
            refresh();
            return true;
        } catch (err) {
            toast.error(err);
            return false;
        }
    };

    const create = async (e) => {
        e.preventDefault();
        const name = newTag.trim();
        if (!name) return;
        setBusy(true);
        const ok = await run(() => projectService.createTag(project.id, name, newColor), `Tag “${name}” created`);
        if (ok) setNewTag('');
        setBusy(false);
    };

    const rename = (t, to) => run(() => projectService.editTag(project.id, t.name, to, undefined), `Renamed to “${to}”`);
    const recolor = (t, color) => run(() => projectService.editTag(project.id, t.name, undefined, color), 'Tag colour updated');

    const remove = async (t) => {
        const n = usageQ.data?.[t.name] || 0;
        if (!(await confirm({
            title: `Delete tag “${t.name}”?`,
            message: n ? `It will be removed from ${n} item${n > 1 ? 's' : ''}. This cannot be undone.` : 'This cannot be undone.',
            confirmText: 'Delete tag',
            danger: true,
        }))) return;
        setSelected((s) => s.filter((x) => x !== t.name));
        run(() => projectService.deleteTag(project.id, t.name), `Tag “${t.name}” deleted`);
    };

    const merge = async (fromTags, toTag) => {
        const ok = await run(() => projectService.mixTags(project.id, fromTags, toTag), `Merged into “${toTag}”`);
        if (ok) {
            setSelected([]);
            setMerging(false);
        }
    };

    const toggleSel = (name) => setSelected((s) => (s.includes(name) ? s.filter((x) => x !== name) : [...s, name]));

    return (
        <SettingsSection
            icon={<FaHashtag />}
            title="Tags"
            description="Rename, recolour, delete or merge the tags used on epics, stories, tasks and issues."
            flush
            actions={canEdit && (
                <button className="btn btn-secondary btn-sm" disabled={selected.length < 2} onClick={() => setMerging(true)}>
                    <FaCompressArrowsAlt /> Merge selected{selected.length ? ` (${selected.length})` : ''}
                </button>
            )}
        >
            <div className="p-4" style={{ paddingBottom: '0.75rem' }}>
                <div className="form-input-icon" style={{ maxWidth: 320 }}>
                    <FaSearch />
                    <input className="form-input form-input-sm" placeholder="Filter tags" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Filter tags" />
                </div>
            </div>

            {tagsQ.loading ? <Loader label="Loading tags…" /> : tagsQ.error ? (
                <div className="card-body"><div className="alert alert-error">Could not load tags.</div></div>
            ) : tags.length === 0 ? (
                <EmptyState icon={<FaHashtag />} title={query ? 'No matching tags' : 'No tags yet'} description="Create a tag below, or add tags to any work item." />
            ) : (
                <div role="list" aria-label="Project tags" style={{ borderTop: '1px solid var(--border-light)' }}>
                    {tags.map((t) => (
                        <div key={t.name} role="listitem" className={`tag-row ${selected.includes(t.name) ? 'selected' : ''}`}>
                            {canEdit ? (
                                <input type="checkbox" checked={selected.includes(t.name)} onChange={() => toggleSel(t.name)} aria-label={`Select ${t.name}`} />
                            ) : <span />}
                            <div className="row" style={{ minWidth: 0 }}>
                                <ColorPicker value={t.color} disabled={!canEdit} label={`${t.name} colour`} onChange={(c) => recolor(t, c)} />
                                <InlineText key={t.name} value={t.name} ariaLabel={`Rename tag ${t.name}`} disabled={!canEdit} onSave={(v) => rename(t, v)} />
                            </div>
                            <span className="tag-usage">{usageQ.loading ? '…' : `${usageQ.data?.[t.name] || 0} uses`}</span>
                            {canEdit ? (
                                <button className="btn btn-danger-ghost btn-sm btn-icon" onClick={() => remove(t)} aria-label={`Delete tag ${t.name}`} title="Delete tag"><FaTrash /></button>
                            ) : <span />}
                        </div>
                    ))}
                </div>
            )}

            {canEdit && (
                <form className="value-new" onSubmit={create}>
                    <ColorPicker value={newColor} onChange={setNewColor} label="New tag colour" />
                    <input className="form-input form-input-sm" placeholder="New tag name" value={newTag} onChange={(e) => setNewTag(e.target.value)} aria-label="New tag name" />
                    <button className="btn btn-primary btn-sm" type="submit" disabled={busy || !newTag.trim()}>
                        {busy ? <span className="spinner spinner-sm" /> : <><FaPlus /> Create tag</>}
                    </button>
                </form>
            )}

            {merging && <MergeModal tags={selected} onClose={() => setMerging(false)} onMerge={merge} />}
        </SettingsSection>
    );
};

export default TagsSettings;

import React, { useCallback, useState } from 'react';
import { FaLink, FaTrash, FaLock, FaCheckCircle, FaRegComments, FaHistory, FaTags, FaExclamationTriangle } from 'react-icons/fa';
import { Drawer, Loader, EmptyState, StatusPill, Tabs } from '../UI';
import { useToast, useConfirm } from '../../context/ToastContext';
import { byId } from '../../utils/format';
import { useProjectData, useWorkItem } from './useWorkItem';
import { memberOptions, statusOptions } from './workTypes';
import { SubjectEditor, DescriptionEditor } from './InlineEditors';
import { SelectField, DueDateField, BlockedField, MetaRows } from './SideFields';
import WatchVote from './WatchVote';
import TagEditor from './TagEditor';
import CustomAttributes from './CustomAttributes';
import Attachments from './Attachments';
import Comments from './Comments';
import ActivityHistory from './ActivityHistory';
import '../../styles/work.css';

/*
 * Shared right-side drawer for epics, user stories, tasks and issues.
 * Type-specific parts are passed as render props receiving `ctx`:
 *   ctx = { item, project, projectId, save, mutate, reload, canModify, can, cfg, toast, close }
 *   renderMain(ctx)       — extra main-column sections (tasks, related stories…)
 *   renderSideTop(ctx)    — fields after Status / Assigned to
 *   renderSideBottom(ctx) — fields after Sprint / Due date
 *   renderBadges(ctx)     — extra header badges
 *   renderActions(ctx)    — extra header buttons (e.g. promote)
 */
const WorkItemDrawer = ({
    type, id, projectId: projectIdProp, onClose, onUpdate, onDelete,
    renderMain, renderSideTop, renderSideBottom, renderBadges, renderActions,
    width = 1000,
}) => {
    const toast = useToast();
    const confirm = useConfirm();
    const { cfg, item, error, loading, reload, save, mutate } = useWorkItem(type, id, { onUpdate });
    const projectId = projectIdProp || item?.project;
    const { project, can } = useProjectData(projectId);
    const [tab, setTab] = useState('comments');
    const [commentCount, setCommentCount] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const close = useCallback(() => onClose?.(), [onClose]);

    if (error) {
        const notFound = error?.response?.status === 404;
        return (
            <Drawer isOpen onClose={close} title={cfg.label} width={560}>
                <EmptyState
                    icon={<FaExclamationTriangle />}
                    title={notFound ? `${cfg.label} not found` : `Could not load this ${cfg.label.toLowerCase()}`}
                    description={notFound ? 'It may have been deleted or you no longer have access.' : 'Check your connection and try again.'}
                    action={!notFound && <button type="button" className="btn btn-primary" onClick={reload}>Retry</button>}
                />
            </Drawer>
        );
    }

    if (loading || !item || !project) {
        return (
            <Drawer isOpen onClose={close} title={<span className="text-muted">Loading {cfg.label.toLowerCase()}…</span>} width={width}>
                <Loader />
            </Drawer>
        );
    }

    const canModify = can(cfg.perm.modify);
    const canDelete = can(cfg.perm.delete);
    const canComment = can(cfg.perm.comment) || canModify;
    const statuses = project[cfg.statusesKey] || [];
    const status = byId(statuses, item.status) || item.status_extra_info;
    const ctx = { item, project, projectId, save, mutate, reload, canModify, can, cfg, toast, close };

    const copyLink = async () => {
        const url = `${window.location.origin}${cfg.link(projectId, item.ref)}`;
        try {
            await navigator.clipboard.writeText(url);
            toast.success('Link copied to clipboard');
        } catch {
            toast.info(url, 8000);
        }
    };

    const remove = async () => {
        const ok = await confirm({
            title: `Delete ${cfg.label.toLowerCase()} #${item.ref}?`,
            message: `"${item.subject}" will be permanently deleted with its comments and attachments.`,
            confirmText: 'Delete',
            danger: true,
        });
        if (!ok) return;
        setDeleting(true);
        try {
            await cfg.service.delete(item.id);
            toast.success(`${cfg.label} #${item.ref} deleted`);
            onDelete?.(item.id);
            close();
        } catch (err) {
            toast.error(err);
            setDeleting(false);
        }
    };

    const title = (
        <div className="work-head">
            <div className="work-head-meta">
                <span className={`work-type work-type-${type}`}>{cfg.label}</span>
                <span className="ref">#{item.ref}</span>
                <StatusPill status={status} />
                {item.is_blocked && <span className="badge badge-error"><FaLock size={9} /> Blocked</span>}
                {item.is_closed && <span className="badge badge-success"><FaCheckCircle size={10} /> Closed</span>}
                {renderBadges?.(ctx)}
            </div>
            <SubjectEditor value={item.subject} disabled={!canModify} onSave={(subject) => save({ subject })} />
        </div>
    );

    const actions = (
        <>
            {renderActions?.(ctx)}
            <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={copyLink} aria-label="Copy link" title="Copy link">
                <FaLink />
            </button>
            {canDelete && (
                <button type="button" className="btn btn-danger-ghost btn-sm btn-icon" onClick={remove} disabled={deleting} aria-label={`Delete ${cfg.label.toLowerCase()}`} title="Delete">
                    {deleting ? <span className="spinner spinner-sm" /> : <FaTrash />}
                </button>
            )}
        </>
    );

    const milestones = project.milestones || [];
    const sprintOptions = milestones
        .filter((m) => !m.closed || String(m.id) === String(item.milestone))
        .map((m) => ({ value: m.id, label: m.closed ? `${m.name} (closed)` : m.name }));

    return (
        <Drawer isOpen onClose={close} title={title} actions={actions} width={width}>
            <div className="work-toolbar">
                <WatchVote type={type} item={item} onChanged={reload} members={project.members} />
            </div>

            {item.is_blocked && (
                <div className="alert alert-error mb-4" role="status">
                    <FaLock style={{ marginTop: 3 }} />
                    <div>
                        <strong>Blocked.</strong>{' '}
                        {item.blocked_note_html
                            ? <span className="blocked-inline" dangerouslySetInnerHTML={{ __html: item.blocked_note_html }} />
                            : (item.blocked_note || 'No reason given.')}
                    </div>
                </div>
            )}

            <div className="detail-layout work-layout">
                <div className="work-main">
                    <DescriptionEditor
                        html={item.description_html}
                        value={item.description}
                        projectId={projectId}
                        disabled={!canModify}
                        onSave={(description) => save({ description })}
                    />

                    <section className="work-section" aria-label="Tags">
                        <div className="work-section-head">
                            <h3 className="work-section-title"><FaTags /> Tags</h3>
                        </div>
                        <TagEditor
                            value={item.tags}
                            tagsColors={project.tags_colors}
                            disabled={!canModify}
                            onChange={(tags) => save({ tags })}
                        />
                    </section>

                    {renderMain?.(ctx)}

                    <CustomAttributes
                        defs={project[cfg.attrsKey]}
                        service={cfg.service.customAttributes}
                        objectId={item.id}
                        canEdit={canModify}
                    />

                    <Attachments
                        service={cfg.service.attachments}
                        projectId={projectId}
                        objectId={item.id}
                        canEdit={canModify}
                    />

                    <section className="work-section work-discussion">
                        <Tabs
                            tabs={[
                                { id: 'comments', label: 'Comments', icon: <FaRegComments />, badge: commentCount ?? item.total_comments ?? undefined },
                                { id: 'activity', label: 'Activity', icon: <FaHistory /> },
                            ]}
                            activeTab={tab}
                            onChange={setTab}
                        />
                        {tab === 'comments' ? (
                            <Comments
                                type={cfg.history}
                                objectId={item.id}
                                canComment={canComment}
                                canModerate={!!(project.i_am_admin || project.i_am_owner)}
                                members={project.members}
                                onCountChange={setCommentCount}
                                onAdd={(text) => mutate((cur) => cfg.service.addComment(cur.id, text, cur.version))}
                            />
                        ) : (
                            <ActivityHistory type={cfg.history} objectId={item.id} refreshKey={item.version} />
                        )}
                    </section>
                </div>

                <aside className="detail-side work-side" aria-label="Details">
                    <SelectField
                        label="Status"
                        value={item.status}
                        options={statusOptions(statuses)}
                        disabled={!canModify}
                        swatch
                        onChange={(v) => save({ status: v })}
                    />
                    <SelectField
                        label="Assigned to"
                        value={item.assigned_to}
                        options={memberOptions(project.members)}
                        noneLabel="Unassigned"
                        disabled={!canModify}
                        onChange={(v) => save({ assigned_to: v })}
                    />
                    {renderSideTop?.(ctx)}
                    {cfg.hasSprint && (
                        <SelectField
                            label="Sprint"
                            value={item.milestone}
                            options={sprintOptions}
                            noneLabel={type === 'issue' ? 'No sprint' : 'Backlog (no sprint)'}
                            disabled={!canModify}
                            onChange={(v) => save({ milestone: v })}
                        />
                    )}
                    {cfg.hasDueDate && <DueDateField item={item} disabled={!canModify} onChange={(patch) => save(patch)} />}
                    {renderSideBottom?.(ctx)}
                    <BlockedField item={item} disabled={!canModify} onChange={(patch) => save(patch)} />
                    <MetaRows item={item} />
                </aside>
            </div>
        </Drawer>
    );
};

export default WorkItemDrawer;

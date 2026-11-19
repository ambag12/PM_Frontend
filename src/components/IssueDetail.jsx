import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowUp, FaBookOpen } from 'react-icons/fa';
import { issueService } from '../api/services';
import { useConfirm } from '../context/ToastContext';
import { byId } from '../utils/format';
import WorkItemDrawer from './work/WorkItemDrawer';
import { SelectField } from './work/SideFields';
import { statusOptions } from './work/workTypes';

const PromoteButton = ({ item, projectId, toast, reload, canPromote }) => {
    const confirm = useConfirm();
    const [busy, setBusy] = useState(false);
    if (!canPromote) return null;
    const promote = async () => {
        const ok = await confirm({
            title: `Promote issue #${item.ref} to a user story?`,
            message: 'A new user story is created from this issue. The issue stays open and links to the new story.',
            confirmText: 'Promote',
        });
        if (!ok) return;
        setBusy(true);
        try {
            const res = await issueService.promoteToUserStory(item.id, projectId);
            const refs = [].concat(res.data || []);
            toast.success(refs.length ? `Created user story #${refs.join(', #')}` : 'Promoted to user story');
            await reload();
        } catch (err) {
            toast.error(err);
        } finally {
            setBusy(false);
        }
    };
    return (
        <button type="button" className="btn btn-secondary btn-sm" onClick={promote} disabled={busy} title="Promote to user story">
            {busy ? <span className="spinner spinner-sm" /> : <FaArrowUp />} <span className="hide-sm">Promote</span>
        </button>
    );
};

/*
 * Issue detail drawer.
 *   <IssueDetail issueId={id} projectId={pid} onClose onUpdate={(issue) => …} onDelete={(id) => …} />
 */
const IssueDetail = ({ issueId, projectId, onClose, onUpdate, onDelete }) => (
    <WorkItemDrawer
        type="issue"
        id={issueId}
        projectId={projectId}
        onClose={onClose}
        onUpdate={onUpdate}
        onDelete={onDelete}
        renderBadges={({ item, project }) => {
            const t = byId(project.issue_types, item.type);
            const sev = byId(project.severities, item.severity);
            const pri = byId(project.priorities, item.priority);
            return (
                <>
                    {t && <span className="value-chip" style={{ '--chip': t.color }}>{t.name}</span>}
                    {sev && <span className="value-chip" style={{ '--chip': sev.color }} title="Severity">{sev.name} severity</span>}
                    {pri && <span className="value-chip" style={{ '--chip': pri.color }} title="Priority">{pri.name} priority</span>}
                </>
            );
        }}
        renderActions={({ item, projectId: pid, toast, reload, can }) => (
            <PromoteButton item={item} projectId={pid} toast={toast} reload={reload} canPromote={can('add_us')} />
        )}
        renderMain={({ item, projectId: pid }) => (item.generated_user_stories?.length ? (
            <section className="work-section">
                <div className="work-section-head">
                    <h3 className="work-section-title"><FaBookOpen /> Promoted to user stories</h3>
                </div>
                <ul className="work-rows">
                    {item.generated_user_stories.map((s) => (
                        <li key={s.id} className="work-row">
                            <span className="ref">#{s.ref}</span>
                            <Link className="work-row-title" to={`/project/${pid}/backlog?ref=${s.ref}`}>{s.subject}</Link>
                        </li>
                    ))}
                </ul>
            </section>
        ) : null)}
        renderSideTop={({ item, project, save, canModify }) => (
            <>
                <SelectField label="Type" value={item.type} options={statusOptions(project.issue_types)} swatch disabled={!canModify} onChange={(v) => save({ type: v })} />
                <SelectField label="Severity" value={item.severity} options={statusOptions(project.severities)} swatch disabled={!canModify} onChange={(v) => save({ severity: v })} />
                <SelectField label="Priority" value={item.priority} options={statusOptions(project.priorities)} swatch disabled={!canModify} onChange={(v) => save({ priority: v })} />
            </>
        )}
    />
);

export default IssueDetail;

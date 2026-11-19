import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaLayerGroup, FaTimes } from 'react-icons/fa';
import { epicService } from '../../api/services';
import { useToast } from '../../context/ToastContext';

/* Parent epics of a user story — link / unlink through epics/:id/related_userstories. */
const StoryEpics = ({ story, projectId, canModify, onChanged }) => {
    const toast = useToast();
    const [epics, setEpics] = useState(null); // project epics, loaded when picking
    const [picking, setPicking] = useState(false);
    const [busy, setBusy] = useState(false);
    const linked = story.epics || [];

    useEffect(() => {
        if (!picking || epics) return undefined;
        let off = false;
        epicService.list({ project: projectId })
            .then((res) => { if (!off) setEpics(res.data || []); })
            .catch((err) => { if (!off) { setEpics([]); toast.error(err); } });
        return () => { off = true; };
    }, [picking, epics, projectId, toast]);

    const run = async (fn, msg) => {
        setBusy(true);
        try {
            await fn();
            toast.success(msg);
            await onChanged();
        } catch (err) {
            toast.error(err);
        } finally {
            setBusy(false);
        }
    };

    const available = (epics || []).filter((e) => !linked.some((l) => l.id === e.id));

    return (
        <section className="work-section" aria-labelledby={`epics-${story.id}`}>
            <div className="work-section-head">
                <h3 className="work-section-title" id={`epics-${story.id}`}><FaLayerGroup /> Epics</h3>
                {canModify && !picking && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPicking(true)}>Link to epic</button>
                )}
            </div>
            {linked.length === 0 && !picking && <p className="text-sm text-muted">Not part of any epic.</p>}
            {linked.length > 0 && (
                <ul className="epic-chips">
                    {linked.map((e) => (
                        <li key={e.id} className="epic-chip" style={{ '--epic': e.color || 'var(--primary-500)' }}>
                            <span className="epic-dot" />
                            <Link to={`/project/${projectId}/epics?ref=${e.ref}`} className="truncate">
                                <span className="ref">#{e.ref}</span> {e.subject}
                            </Link>
                            {canModify && (
                                <button type="button" aria-label={`Remove from epic ${e.subject}`} title="Remove from epic" disabled={busy}
                                    onClick={() => run(() => epicService.removeRelated(e.id, story.id), `Removed from epic #${e.ref}`)}>
                                    <FaTimes size={9} />
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
            {picking && (
                <div className="row mt-2">
                    <select
                        className="form-input form-input-sm flex-1"
                        defaultValue=""
                        disabled={busy || !epics}
                        aria-label="Choose an epic"
                        onChange={(e) => {
                            const ep = available.find((x) => String(x.id) === e.target.value);
                            if (ep) run(() => epicService.addRelated(ep.id, story.id), `Linked to epic #${ep.ref}`).then(() => setPicking(false));
                        }}
                    >
                        <option value="">{epics ? (available.length ? 'Choose an epic…' : 'No other epics') : 'Loading epics…'}</option>
                        {available.map((e) => <option key={e.id} value={e.id}>#{e.ref} {e.subject}</option>)}
                    </select>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPicking(false)}>Cancel</button>
                </div>
            )}
        </section>
    );
};

export default StoryEpics;

import React, { useEffect, useRef, useState } from 'react';
import WatchButton from '../WatchButton';
import VoteButtons from '../VoteButtons';
import { UserAvatar } from '../UI';
import { useToast } from '../../context/ToastContext';
import { WORK_TYPES } from './workTypes';

/* Small popover listing people (watchers / voters), loaded when opened. */
const PeoplePopover = ({ title, load, onClose, members, boundaryRef }) => {
    const [state, setState] = useState({ loading: true, people: [], error: null });

    useEffect(() => {
        let off = false;
        load()
            .then((res) => { if (!off) setState({ loading: false, people: res.data || [], error: null }); })
            .catch((err) => { if (!off) setState({ loading: false, people: [], error: err }); });
        return () => { off = true; };
    }, [load]);

    useEffect(() => {
        const onDoc = (e) => { if (boundaryRef.current && !boundaryRef.current.contains(e.target)) onClose(); };
        const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
        document.addEventListener('mousedown', onDoc);
        document.addEventListener('keydown', onKey, true);
        return () => {
            document.removeEventListener('mousedown', onDoc);
            document.removeEventListener('keydown', onKey, true);
        };
    }, [onClose, boundaryRef]);

    // Watcher/voter payloads are light ({id, username, full_name}); enrich with member photos.
    const enrich = (p) => {
        const m = (members || []).find((x) => String(x.id) === String(p.id));
        return m ? { ...p, ...m } : p;
    };

    return (
        <div className="people-popover" role="dialog" aria-label={title}>
            <div className="people-popover-head">{title}</div>
            {state.loading ? (
                <div className="people-popover-empty"><span className="spinner spinner-sm" /> Loading…</div>
            ) : state.error ? (
                <div className="people-popover-empty text-error">Could not load the list.</div>
            ) : state.people.length === 0 ? (
                <div className="people-popover-empty">Nobody yet.</div>
            ) : (
                <ul className="people-popover-list">
                    {state.people.map((p) => {
                        const u = enrich(p);
                        return (
                            <li key={u.id}>
                                <UserAvatar user={u} size="xs" />
                                <span className="truncate">{u.full_name_display || u.full_name || u.username}</span>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

/*
 * Watch + vote controls for a work item, with watcher / voter lists.
 *   <WatchVote type="issue" item={issue} onChanged={reload} members={project.members} />
 */
const WatchVote = ({ type, item, onChanged, members, disabled }) => {
    const svc = WORK_TYPES[type].service;
    const toast = useToast();
    const [open, setOpen] = useState(null); // 'watchers' | 'voters' | null
    const watchRef = useRef(null);
    const voteRef = useRef(null);

    const act = async (fn, okMsg) => {
        try {
            await fn(item.id);
            await onChanged?.();
            if (okMsg) toast.success(okMsg);
        } catch (err) {
            toast.error(err);
            throw err;
        }
    };

    const loadWatchers = React.useCallback(() => svc.getWatchers(item.id), [svc, item.id]);
    const loadVoters = React.useCallback(() => svc.getVoters(item.id), [svc, item.id]);
    const close = React.useCallback(() => setOpen(null), []);
    const label = WORK_TYPES[type].label.toLowerCase();

    return (
        <div className="watch-vote">
            <div className="watch-vote-item" ref={watchRef}>
                <WatchButton
                    isWatching={item.is_watcher}
                    watchersCount={item.total_watchers || 0}
                    resourceType={label}
                    disabled={disabled}
                    onWatch={() => act(svc.watch, `You are now watching this ${label}`)}
                    onUnwatch={() => act(svc.unwatch)}
                    onCountClick={() => setOpen(open === 'watchers' ? null : 'watchers')}
                    countExpanded={open === 'watchers'}
                />
                {open === 'watchers' && (
                    <PeoplePopover title="Watchers" load={loadWatchers} onClose={close} members={members} boundaryRef={watchRef} />
                )}
            </div>
            <div className="watch-vote-item" ref={voteRef}>
                <VoteButtons
                    isUpvoted={item.is_voter}
                    upvotesCount={item.total_voters || 0}
                    disabled={disabled}
                    onUpvote={() => act(svc.upvote)}
                    onDownvote={() => act(svc.downvote)}
                    onCountClick={() => setOpen(open === 'voters' ? null : 'voters')}
                    countExpanded={open === 'voters'}
                />
                {open === 'voters' && (
                    <PeoplePopover title="Voters" load={loadVoters} onClose={close} members={members} boundaryRef={voteRef} />
                )}
            </div>
        </div>
    );
};

export default WatchVote;

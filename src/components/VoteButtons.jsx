import React, { useState } from 'react';
import { FaThumbsUp, FaThumbsDown, FaRegThumbsUp } from 'react-icons/fa';
import '../styles/work.css';

/*
 * Upvote / downvote control.
 * the API votes are binary: "upvote" adds your vote, "downvote" removes it.
 *   <VoteButtons isUpvoted upvotesCount={2} onUpvote={…} onDownvote={…} onCountClick={…} />
 * Legacy props (isDownvoted, downvotesCount, onRemoveVote) are still accepted.
 */
const VoteButtons = ({
    isUpvoted,
    isDownvoted = false,
    upvotesCount = 0,
    downvotesCount = 0,
    onUpvote,
    onDownvote,
    onRemoveVote,
    onCountClick,
    countExpanded,
    size = 'sm',
    disabled = false,
}) => {
    const [busy, setBusy] = useState(null);

    const run = async (which, fn) => {
        if (!fn) return;
        setBusy(which);
        try {
            await fn();
        } catch {
            // the caller reports errors (toast)
        } finally {
            setBusy(null);
        }
    };

    // Clicking an active upvote removes it (the backend's downvote).
    const handleUp = () => run('up', isUpvoted ? (onRemoveVote || onDownvote) : onUpvote);
    const handleDown = () => run('down', isDownvoted && onRemoveVote ? onRemoveVote : onDownvote);

    const sizeClass = size === 'sm' ? 'btn-sm' : '';
    const canDown = !!onDownvote && (isUpvoted || isDownvoted);

    return (
        <span className="split-btn">
            <button
                type="button"
                className={`btn btn-secondary ${sizeClass} ${isUpvoted ? 'is-on' : ''}`}
                onClick={handleUp}
                disabled={disabled || busy !== null || (isUpvoted && !onRemoveVote && !onDownvote)}
                aria-pressed={!!isUpvoted}
                title={isUpvoted ? 'You upvoted this — click to remove your vote' : 'Upvote'}
            >
                {busy === 'up' ? <span className="spinner spinner-sm" /> : isUpvoted ? <FaThumbsUp /> : <FaRegThumbsUp />}
                <span>{isUpvoted ? 'Upvoted' : 'Upvote'}</span>
            </button>
            {onCountClick ? (
                <button
                    type="button"
                    className={`btn btn-secondary ${sizeClass} split-btn-count`}
                    onClick={onCountClick}
                    aria-expanded={!!countExpanded}
                    aria-label={`${upvotesCount} vote${upvotesCount === 1 ? '' : 's'} — show voters`}
                >
                    {upvotesCount}
                </button>
            ) : (
                <span className={`btn btn-secondary ${sizeClass} split-btn-count is-static`} aria-label={`${upvotesCount} votes`}>
                    {upvotesCount}
                </span>
            )}
            {onDownvote && (
                <button
                    type="button"
                    className={`btn btn-secondary ${sizeClass} btn-icon ${isDownvoted ? 'is-on' : ''}`}
                    onClick={handleDown}
                    disabled={disabled || busy !== null || !canDown}
                    aria-label="Downvote (remove your vote)"
                    title="Downvote (remove your vote)"
                >
                    {busy === 'down' ? <span className="spinner spinner-sm" /> : <FaThumbsDown />}
                    {downvotesCount > 0 && <span>{downvotesCount}</span>}
                </button>
            )}
        </span>
    );
};

export default VoteButtons;

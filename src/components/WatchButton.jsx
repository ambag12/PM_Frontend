import React, { useState } from 'react';
import { FaEye, FaRegEye } from 'react-icons/fa';
import '../styles/work.css';

/*
 * Watch / unwatch toggle with a watcher count.
 *   <WatchButton isWatching watchersCount={3} onWatch={…} onUnwatch={…} resourceType="task"
 *                onCountClick={() => …} size="sm" />
 * onCountClick (optional) turns the count into a button (e.g. to show the watcher list).
 */
const WatchButton = ({
    isWatching,
    watchersCount = 0,
    onWatch,
    onUnwatch,
    resourceType = 'item',
    onCountClick,
    countExpanded,
    size = 'sm',
    disabled = false,
}) => {
    const [busy, setBusy] = useState(false);

    const handleToggle = async () => {
        setBusy(true);
        try {
            if (isWatching) await onUnwatch?.();
            else await onWatch?.();
        } catch {
            // the caller reports errors (toast)
        } finally {
            setBusy(false);
        }
    };

    const sizeClass = size === 'sm' ? 'btn-sm' : '';
    return (
        <span className="split-btn">
            <button
                type="button"
                onClick={handleToggle}
                disabled={busy || disabled}
                className={`btn btn-secondary ${sizeClass} ${isWatching ? 'is-on' : ''}`}
                aria-pressed={!!isWatching}
                title={isWatching ? `Stop watching this ${resourceType}` : `Get notified about changes to this ${resourceType}`}
            >
                {busy ? <span className="spinner spinner-sm" /> : isWatching ? <FaEye /> : <FaRegEye />}
                <span>{isWatching ? 'Watching' : 'Watch'}</span>
            </button>
            {onCountClick ? (
                <button
                    type="button"
                    className={`btn btn-secondary ${sizeClass} split-btn-count`}
                    onClick={onCountClick}
                    aria-expanded={!!countExpanded}
                    aria-label={`${watchersCount} watcher${watchersCount === 1 ? '' : 's'} — show list`}
                >
                    {watchersCount}
                </button>
            ) : (
                <span className={`btn btn-secondary ${sizeClass} split-btn-count is-static`} aria-label={`${watchersCount} watchers`}>
                    {watchersCount}
                </span>
            )}
        </span>
    );
};

export default WatchButton;

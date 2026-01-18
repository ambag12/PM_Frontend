import React, { useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const WatchButton = ({ 
  isWatching, 
  watchersCount = 0, 
  onWatch, 
  onUnwatch, 
  resourceType = 'item' 
}) => {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (isWatching) {
        await onUnwatch();
      } else {
        await onWatch();
      }
    } catch (error) {
      console.error('Failed to toggle watch status', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className="btn"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 1rem',
        background: isWatching ? 'rgba(0, 122, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
        color: isWatching ? 'var(--primary)' : 'var(--text-secondary)',
        border: '1px solid ' + (isWatching ? 'var(--primary)' : 'transparent'),
        fontSize: '0.9rem'
      }}
      title={isWatching ? `Unwatch this ${resourceType}` : `Watch this ${resourceType}`}
    >
      {isWatching ? <FaEye /> : <FaEyeSlash />}
      <span>{isWatching ? 'Watching' : 'Watch'}</span>
      {watchersCount > 0 && (
        <span style={{ 
          background: 'rgba(255, 255, 255, 0.1)', 
          padding: '0.15rem 0.5rem', 
          borderRadius: '10px',
          fontSize: '0.8rem'
        }}>
          {watchersCount}
        </span>
      )}
    </button>
  );
};

export default WatchButton;

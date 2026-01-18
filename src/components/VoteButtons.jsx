import React, { useState } from 'react';
import { FaThumbsUp, FaThumbsDown } from 'react-icons/fa';

const VoteButtons = ({ 
  isUpvoted, 
  isDownvoted, 
  upvotesCount = 0, 
  downvotesCount = 0,
  onUpvote, 
  onDownvote,
  onRemoveVote
}) => {
  const [loading, setLoading] = useState(false);

  const handleUpvote = async () => {
    setLoading(true);
    try {
      if (isUpvoted && onRemoveVote) {
        await onRemoveVote();
      } else {
        await onUpvote();
      }
    } catch (error) {
      console.error('Failed to upvote', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownvote = async () => {
    setLoading(true);
    try {
      if (isDownvoted && onRemoveVote) {
        await onRemoveVote();
      } else {
        await onDownvote();
      }
    } catch (error) {
      console.error('Failed to downvote', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <button
        onClick={handleUpvote}
        disabled={loading}
        className="btn"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          padding: '0.4rem 0.8rem',
          background: isUpvoted ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 255, 255, 0.05)',
          color: isUpvoted ? '#34C759' : 'var(--text-secondary)',
          border: '1px solid ' + (isUpvoted ? '#34C759' : 'transparent'),
          fontSize: '0.85rem'
        }}
        title="Upvote"
      >
        <FaThumbsUp />
        {upvotesCount > 0 && <span>{upvotesCount}</span>}
      </button>

      <button
        onClick={handleDownvote}
        disabled={loading}
        className="btn"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          padding: '0.4rem 0.8rem',
          background: isDownvoted ? 'rgba(255, 59, 48, 0.1)' : 'rgba(255, 255, 255, 0.05)',
          color: isDownvoted ? '#FF3B30' : 'var(--text-secondary)',
          border: '1px solid ' + (isDownvoted ? '#FF3B30' : 'transparent'),
          fontSize: '0.85rem'
        }}
        title="Downvote"
      >
        <FaThumbsDown />
        {downvotesCount > 0 && <span>{downvotesCount}</span>}
      </button>
    </div>
  );
};

export default VoteButtons;

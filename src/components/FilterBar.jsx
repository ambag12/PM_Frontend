import React, { useState } from 'react';
import { FaSearch, FaFilter, FaTimes } from 'react-icons/fa';

const FilterBar = ({ 
  onSearch, 
  onFilterChange, 
  statuses = [], 
  members = [],
  showStatusFilter = true,
  showAssigneeFilter = true,
  showTagsFilter = true,
  placeholder = "Search..."
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (onSearch) onSearch(value);
  };

  const handleStatusChange = (e) => {
    const value = e.target.value;
    setSelectedStatus(value);
    if (onFilterChange) {
      onFilterChange({
        status: value,
        assignee: selectedAssignee,
        tag: tagFilter
      });
    }
  };

  const handleAssigneeChange = (e) => {
    const value = e.target.value;
    setSelectedAssignee(value);
    if (onFilterChange) {
      onFilterChange({
        status: selectedStatus,
        assignee: value,
        tag: tagFilter
      });
    }
  };

  const handleTagChange = (e) => {
    const value = e.target.value;
    setTagFilter(value);
    if (onFilterChange) {
      onFilterChange({
        status: selectedStatus,
        assignee: selectedAssignee,
        tag: value
      });
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedStatus('');
    setSelectedAssignee('');
    setTagFilter('');
    if (onSearch) onSearch('');
    if (onFilterChange) {
      onFilterChange({
        status: '',
        assignee: '',
        tag: ''
      });
    }
  };

  const hasActiveFilters = selectedStatus || selectedAssignee || tagFilter || searchTerm;

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
        {/* Search Input */}
        <div style={{ flex: 1, position: 'relative' }}>
          <FaSearch style={{ 
            position: 'absolute', 
            left: '1rem', 
            top: '50%', 
            transform: 'translateY(-50%)',
            color: 'var(--text-secondary)',
            fontSize: '0.9rem'
          }} />
          <input
            type="text"
            className="input-field"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder={placeholder}
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>

        {/* Filter Toggle Button */}
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className="btn"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            background: showFilters ? 'var(--primary)' : 'var(--bg-secondary)'
          }}
        >
          <FaFilter /> Filters
        </button>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button 
            onClick={clearFilters}
            className="btn"
            style={{ 
              background: 'rgba(255, 59, 48, 0.1)', 
              color: 'var(--error)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <FaTimes /> Clear
          </button>
        )}
      </div>

      {/* Filter Dropdowns */}
      {showFilters && (
        <div style={{ 
          padding: '1rem', 
          background: 'var(--bg-secondary)', 
          borderRadius: '8px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem'
        }}>
          {showStatusFilter && statuses.length > 0 && (
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontSize: '0.85rem',
                color: 'var(--text-secondary)'
              }}>
                Status
              </label>
              <select
                className="input-field"
                value={selectedStatus}
                onChange={handleStatusChange}
                style={{ width: '100%', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
              >
                <option value="">All Statuses</option>
                {statuses.map(status => (
                  <option key={status.id} value={status.id}>
                    {status.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {showAssigneeFilter && members.length > 0 && (
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontSize: '0.85rem',
                color: 'var(--text-secondary)'
              }}>
                Assigned To
              </label>
              <select
                className="input-field"
                value={selectedAssignee}
                onChange={handleAssigneeChange}
                style={{ width: '100%', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
              >
                <option value="">All Members</option>
                <option value="unassigned">Unassigned</option>
                {members.map(member => (
                  <option key={member.id} value={member.user}>
                    {member.full_name || member.user_email}
                  </option>
                ))}
              </select>
            </div>
          )}

          {showTagsFilter && (
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontSize: '0.85rem',
                color: 'var(--text-secondary)'
              }}>
                Tag
              </label>
              <input
                type="text"
                className="input-field"
                value={tagFilter}
                onChange={handleTagChange}
                placeholder="Filter by tag..."
                style={{ width: '100%' }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FilterBar;

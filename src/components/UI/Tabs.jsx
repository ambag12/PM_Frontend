import React from 'react';

// tabs: [{ id, label, icon?, badge?, disabled? }]
const Tabs = ({ tabs, activeTab, onChange, className = '' }) => (
    <div className={`tabs ${className}`} role="tablist">
        {tabs.map((tab) => (
            <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => onChange(tab.id)}
                disabled={tab.disabled}
            >
                {tab.icon && <span className="icon">{tab.icon}</span>}
                {tab.label}
                {tab.badge !== undefined && tab.badge !== null && <span className="tab-count">{tab.badge}</span>}
            </button>
        ))}
    </div>
);

export default Tabs;

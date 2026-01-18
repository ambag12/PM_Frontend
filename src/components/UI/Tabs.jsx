import React from 'react';

const Tabs = ({ tabs, activeTab, onChange, className = '' }) => {
    return (
        <div className={`tabs ${className}`}>
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => onChange(tab.id)}
                    disabled={tab.disabled}
                >
                    {tab.icon && <span style={{ marginRight: '0.5rem' }}>{tab.icon}</span>}
                    {tab.label}
                    {tab.badge !== undefined && (
                        <span
                            style={{
                                marginLeft: '0.5rem',
                                background: 'var(--neutral-200)',
                                color: 'var(--text-secondary)',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                padding: '0.125rem 0.5rem',
                                borderRadius: 'var(--radius-full)',
                            }}
                        >
                            {tab.badge}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
};

export default Tabs;

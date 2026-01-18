import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';

const MainLayout = ({ children }) => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            if (!mobile) {
                setMobileMenuOpen(false);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleSidebar = () => {
        if (isMobile) {
            setMobileMenuOpen(!mobileMenuOpen);
        } else {
            setSidebarCollapsed(!sidebarCollapsed);
        }
    };

    return (
        <div className="app-layout">
            {/* Mobile overlay */}
            {isMobile && mobileMenuOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.5)',
                        zIndex: 999,
                    }}
                />
            )}

            {/* Sidebar */}
            <Sidebar
                collapsed={sidebarCollapsed}
                onToggle={toggleSidebar}
                className={isMobile && mobileMenuOpen ? 'mobile-open' : ''}
            />

            {/* Main Content Area */}
            <main
                className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}
                style={isMobile ? { marginLeft: 0 } : {}}
            >
                {/* Mobile Header */}
                {isMobile && (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '1rem',
                            marginBottom: '1rem',
                            background: 'var(--bg-secondary)',
                            borderBottom: '1px solid var(--border-light)',
                            marginLeft: '-2rem',
                            marginRight: '-2rem',
                            marginTop: '-2rem',
                            paddingLeft: '2rem',
                            paddingRight: '2rem',
                        }}
                    >
                        <button
                            onClick={toggleSidebar}
                            className="btn btn-ghost btn-icon"
                            style={{ marginRight: '1rem' }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="3" y1="12" x2="21" y2="12"></line>
                                <line x1="3" y1="6" x2="21" y2="6"></line>
                                <line x1="3" y1="18" x2="21" y2="18"></line>
                            </svg>
                        </button>
                        <span style={{ fontWeight: 600, fontSize: '1.125rem' }}>Project Manager</span>
                    </div>
                )}

                {children}
            </main>
        </div>
    );
};

export default MainLayout;

import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const COLLAPSE_KEY = 'pm-sidebar-collapsed';

const MainLayout = ({ children }) => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
    });
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            if (!mobile) setMobileMenuOpen(false);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Close the mobile drawer on navigation (adjust state during render, no effect needed)
    const [lastPath, setLastPath] = useState(location.pathname);
    if (lastPath !== location.pathname) {
        setLastPath(location.pathname);
        if (mobileMenuOpen) setMobileMenuOpen(false);
    }

    const toggleSidebar = () => {
        if (isMobile) {
            setMobileMenuOpen((o) => !o);
        } else {
            setSidebarCollapsed((c) => {
                try { localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1'); } catch { /* ignore */ }
                return !c;
            });
        }
    };

    return (
        <div className="app-layout">
            {isMobile && mobileMenuOpen && <div className="sidebar-overlay" onClick={() => setMobileMenuOpen(false)} />}

            <Sidebar
                collapsed={!isMobile && sidebarCollapsed}
                onToggle={toggleSidebar}
                className={isMobile && mobileMenuOpen ? 'mobile-open' : ''}
            />

            <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                <Topbar isMobile={isMobile} onMenuClick={toggleSidebar} />
                <div className="page-body">{children}</div>
            </main>
        </div>
    );
};

export default MainLayout;

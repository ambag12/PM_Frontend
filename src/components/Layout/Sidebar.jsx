import React, { useState, useContext } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import {
    FaHome,
    FaFolder,
    FaPlus,
    FaCog,
    FaSignOutAlt,
    FaChevronLeft,
    FaChevronRight,
    FaUsers,
    FaUserShield,
    FaClipboardList,
    FaTasks,
    FaBug,
    FaFlag,
    FaBook,
    FaChartBar
} from 'react-icons/fa';

const Sidebar = ({ collapsed, onToggle }) => {
    const { user, logout } = useContext(AuthContext);
    const location = useLocation();
    const navigate = useNavigate();
    const [projectMenuOpen, setProjectMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getInitials = (name) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const mainNavItems = [
        { path: '/', icon: <FaHome />, label: 'Dashboard' },
        { path: '/create-project', icon: <FaPlus />, label: 'New Project' },
    ];

    const adminNavItems = [
        { path: '/admin', icon: <FaUserShield />, label: 'Admin Panel', requireAdmin: true },
    ];

    const isActive = (path) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    return (
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
            {/* Logo & Header */}
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <FaClipboardList />
                </div>
                <span className="sidebar-title">Project Manager</span>
            </div>

            {/* Toggle Button */}
            <button
                className="sidebar-toggle"
                onClick={onToggle}
                title={collapsed ? 'Expand' : 'Collapse'}
            >
                {collapsed ? <FaChevronRight size={12} /> : <FaChevronLeft size={12} />}
            </button>

            {/* Navigation */}
            <nav className="sidebar-nav">
                {/* Main Navigation */}
                <div className="nav-section">
                    <span className="nav-section-title">Main</span>
                    {mainNavItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                        >
                            <span className="nav-item-icon">{item.icon}</span>
                            <span className="nav-item-label">{item.label}</span>
                        </NavLink>
                    ))}
                </div>

                {/* Project Navigation (shown when in a project) */}
                {location.pathname.includes('/project/') && (
                    <div className="nav-section">
                        <span className="nav-section-title">Current Project</span>
                        <NavLink
                            to={location.pathname.split('/').slice(0, 3).join('/')}
                            className={`nav-item ${location.pathname.match(/^\/project\/\d+$/) ? 'active' : ''}`}
                        >
                            <span className="nav-item-icon"><FaChartBar /></span>
                            <span className="nav-item-label">Overview</span>
                        </NavLink>
                        <NavLink
                            to={`${location.pathname.split('/').slice(0, 3).join('/')}/backlog`}
                            className={`nav-item ${location.pathname.includes('/backlog') ? 'active' : ''}`}
                        >
                            <span className="nav-item-icon"><FaClipboardList /></span>
                            <span className="nav-item-label">Backlog</span>
                        </NavLink>
                        <NavLink
                            to={`${location.pathname.split('/').slice(0, 3).join('/')}/kanban`}
                            className={`nav-item ${location.pathname.includes('/kanban') ? 'active' : ''}`}
                        >
                            <span className="nav-item-icon"><FaTasks /></span>
                            <span className="nav-item-label">Kanban Board</span>
                        </NavLink>
                        <NavLink
                            to={`${location.pathname.split('/').slice(0, 3).join('/')}/issues`}
                            className={`nav-item ${location.pathname.includes('/issues') ? 'active' : ''}`}
                        >
                            <span className="nav-item-icon"><FaBug /></span>
                            <span className="nav-item-label">Issues</span>
                        </NavLink>
                        <NavLink
                            to={`${location.pathname.split('/').slice(0, 3).join('/')}/milestones`}
                            className={`nav-item ${location.pathname.includes('/milestones') ? 'active' : ''}`}
                        >
                            <span className="nav-item-icon"><FaFlag /></span>
                            <span className="nav-item-label">Milestones</span>
                        </NavLink>
                        <NavLink
                            to={`${location.pathname.split('/').slice(0, 3).join('/')}/wiki`}
                            className={`nav-item ${location.pathname.includes('/wiki') ? 'active' : ''}`}
                        >
                            <span className="nav-item-icon"><FaBook /></span>
                            <span className="nav-item-label">Wiki</span>
                        </NavLink>
                        <NavLink
                            to={`${location.pathname.split('/').slice(0, 3).join('/')}/members`}
                            className={`nav-item ${location.pathname.includes('/members') ? 'active' : ''}`}
                        >
                            <span className="nav-item-icon"><FaUsers /></span>
                            <span className="nav-item-label">Members</span>
                        </NavLink>
                        <NavLink
                            to={`${location.pathname.split('/').slice(0, 3).join('/')}/settings`}
                            className={`nav-item ${location.pathname.includes('/settings') ? 'active' : ''}`}
                        >
                            <span className="nav-item-icon"><FaCog /></span>
                            <span className="nav-item-label">Settings</span>
                        </NavLink>
                    </div>
                )}

                {/* Admin Navigation */}
                <div className="nav-section">
                    <span className="nav-section-title">Admin</span>
                    {adminNavItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                        >
                            <span className="nav-item-icon">{item.icon}</span>
                            <span className="nav-item-label">{item.label}</span>
                        </NavLink>
                    ))}
                </div>
            </nav>

            {/* User Profile & Logout */}
            <div className="sidebar-footer">
                <div className="sidebar-user" onClick={handleLogout}>
                    <div className="sidebar-user-avatar">
                        {getInitials(user?.full_name)}
                    </div>
                    <div className="sidebar-user-info">
                        <div className="sidebar-user-name">{user?.full_name || 'User'}</div>
                        <div className="sidebar-user-role">Click to Logout</div>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;

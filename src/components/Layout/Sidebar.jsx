import React, { useContext, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
    FaHome, FaPlus, FaCog, FaChevronLeft, FaChevronRight, FaUsers, FaUserShield, FaClipboardList,
    FaColumns, FaBug, FaFlagCheckered, FaBook, FaChartPie, FaFileContract, FaUserTie, FaSearch,
    FaCommentDots, FaLayerGroup, FaStream, FaBell,
} from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import { usePermissions } from '../../context/PermissionContext';
import CreateRemarksModal from '../CreateRemarksModal';
import Logo from '../UI/Logo';
import { initials } from '../../utils/format';

const NavItem = ({ to, icon, label, end, badge, collapsed }) => (
    <NavLink
        to={to}
        end={end}
        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        title={collapsed ? label : undefined}
    >
        <span className="nav-item-icon">{icon}</span>
        <span className="nav-item-label">{label}</span>
        {badge !== undefined && badge !== null && <span className="nav-badge">{badge}</span>}
    </NavLink>
);

const Sidebar = ({ collapsed, onToggle, className = '' }) => {
    const { user } = useContext(AuthContext);
    const { project, projectId } = useProject();
    const { isAdmin, isOwner } = usePermissions();
    const location = useLocation();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [showRemarksModal, setShowRemarksModal] = useState(false);

    const base = projectId ? `/project/${projectId}` : null;
    // Project feature toggles default to "on" until the project has loaded
    const on = (flag) => (project ? project[flag] !== false : true);

    const onSearch = (e) => {
        e.preventDefault();
        const q = searchTerm.trim();
        if (!q) return;
        navigate(base ? `${base}/search?q=${encodeURIComponent(q)}` : `/?q=${encodeURIComponent(q)}`);
        setSearchTerm('');
    };

    return (
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${className}`}>
            <div className="sidebar-header">
                <div className="sidebar-logo"><Logo size={34} /></div>
                <span className="sidebar-title">
                    Agile PM
                    <small>Project Management System</small>
                </span>
            </div>

            <button className="sidebar-toggle" onClick={onToggle} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-label="Toggle sidebar">
                {collapsed ? <FaChevronRight size={10} /> : <FaChevronLeft size={10} />}
            </button>

            {base && (
                <div className="sidebar-project" title={project?.name}>
                    <div className="sidebar-project-logo">
                        {project?.logo_small_url ? <img src={project.logo_small_url} alt="" /> : initials(project?.name || '…')}
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <div className="sidebar-project-name">{project?.name || 'Loading…'}</div>
                        <div className="sidebar-project-meta">
                            {project ? `${project.total_memberships ?? project.members?.length ?? 0} members · ${project.is_private ? 'Private' : 'Public'}` : ' '}
                        </div>
                    </div>
                </div>
            )}

            <nav className="sidebar-nav">
                {base && (
                    <div className="nav-section">
                        <span className="nav-section-title">Project</span>
                        <NavItem collapsed={collapsed} to={base} end icon={<FaChartPie />} label="Overview" />
                        {on('is_epics_activated') && <NavItem collapsed={collapsed} to={`${base}/epics`} icon={<FaLayerGroup />} label="Epics" />}
                        {on('is_backlog_activated') && <NavItem collapsed={collapsed} to={`${base}/backlog`} icon={<FaClipboardList />} label="Backlog" />}
                        {on('is_kanban_activated') && <NavItem collapsed={collapsed} to={`${base}/kanban`} icon={<FaColumns />} label="Kanban" />}
                        {on('is_backlog_activated') && <NavItem collapsed={collapsed} to={`${base}/milestones`} icon={<FaFlagCheckered />} label="Sprints" badge={project?.milestones?.filter((m) => !m.closed).length || null} />}
                        {on('is_issues_activated') && <NavItem collapsed={collapsed} to={`${base}/issues`} icon={<FaBug />} label="Issues" />}
                        {on('is_wiki_activated') && <NavItem collapsed={collapsed} to={`${base}/wiki`} icon={<FaBook />} label="Wiki" />}
                        <NavItem collapsed={collapsed} to={`${base}/tenders`} icon={<FaFileContract />} label="Tenders" />
                        <NavItem collapsed={collapsed} to={`${base}/hr`} icon={<FaUserTie />} label="HR & staffing" />
                        <NavItem collapsed={collapsed} to={`${base}/activity`} icon={<FaStream />} label="Activity" />
                        <NavItem collapsed={collapsed} to={`${base}/members`} icon={<FaUsers />} label="Team" />
                        {(isAdmin || isOwner) && <NavItem collapsed={collapsed} to={`${base}/settings`} icon={<FaCog />} label="Settings" />}
                    </div>
                )}

                <div className="nav-section">
                    <span className="nav-section-title">Workspace</span>
                    <NavItem collapsed={collapsed} to="/" end icon={<FaHome />} label="Dashboard" />
                    <NavItem collapsed={collapsed} to="/create-project" icon={<FaPlus />} label="New project" />
                    <NavItem collapsed={collapsed} to="/notifications" icon={<FaBell />} label="Notifications" />
                </div>

                <div className="nav-section">
                    <span className="nav-section-title">Modules</span>
                    <NavItem collapsed={collapsed} to="/tenders" end icon={<FaFileContract />} label="All tenders" />
                    <NavItem collapsed={collapsed} to="/hr" end icon={<FaUserTie />} label="All HR records" />
                    <button className="nav-item w-full" onClick={() => setShowRemarksModal(true)} title={collapsed ? 'Add remark' : undefined}>
                        <span className="nav-item-icon"><FaCommentDots /></span>
                        <span className="nav-item-label">Add remark</span>
                    </button>
                </div>

                <div className="nav-section">
                    <span className="nav-section-title">Administration</span>
                    <NavItem collapsed={collapsed} to="/admin" icon={<FaUserShield />} label="Admin panel" />
                </div>
            </nav>

            <div className="sidebar-footer">
                <form className="sidebar-search" onSubmit={onSearch}>
                    <FaSearch className="sidebar-search-icon" />
                    <input
                        type="text"
                        className="sidebar-search-input"
                        placeholder={base ? 'Search this project…' : 'Search projects…'}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </form>

                <div className="sidebar-user" onClick={() => navigate('/profile')} title="My profile" role="button">
                    <div className="sidebar-user-avatar">
                        {user?.photo ? <img src={user.photo} alt="" /> : initials(user?.full_name || user?.username)}
                    </div>
                    <div className="sidebar-user-info">
                        <div className="sidebar-user-name">{user?.full_name || user?.username || 'User'}</div>
                        <div className="sidebar-user-role">{location.pathname === '/profile' ? 'Viewing profile' : `@${user?.username || ''}`}</div>
                    </div>
                </div>
            </div>

            {showRemarksModal && (
                <CreateRemarksModal
                    projectId={projectId}
                    onClose={() => setShowRemarksModal(false)}
                    onCreated={() => setShowRemarksModal(false)}
                />
            )}
        </aside>
    );
};

export default Sidebar;

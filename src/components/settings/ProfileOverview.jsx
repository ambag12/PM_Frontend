import React from 'react';
import { Link } from 'react-router-dom';
import { FaFolderOpen, FaAddressBook, FaCheckDouble, FaIdBadge, FaUserFriends, FaProjectDiagram } from 'react-icons/fa';
import { userService, projectService } from '../../api/services';
import { StatCard, Loader, EmptyState, UserAvatar } from '../UI';
import { useAsyncData } from './hooks';
import { formatDate, initials } from '../../utils/format';
import '../../styles/settings.css';

const ProfileOverview = ({ userId }) => {
    const stats = useAsyncData(() => userService.getStats(userId).then((r) => r.data), [userId]);
    const contacts = useAsyncData(() => userService.getContacts(userId).then((r) => r.data), [userId]);
    const projects = useAsyncData(() => projectService.listForUser().then((r) => r.data), [userId]);
    const s = stats.data || {};

    return (
        <div className="stack">
            {stats.loading ? <Loader label="Loading stats…" /> : stats.error ? (
                <div className="alert alert-error">Could not load your statistics.</div>
            ) : (
                <div className="stats-grid" style={{ marginBottom: 0 }}>
                    <StatCard icon={<FaFolderOpen />} label="Projects" value={s.total_num_projects ?? 0} tone="primary" />
                    <StatCard icon={<FaAddressBook />} label="Contacts" value={s.total_num_contacts ?? 0} tone="info" />
                    <StatCard icon={<FaCheckDouble />} label="Closed user stories" value={s.total_num_closed_userstories ?? 0} tone="success" />
                    <StatCard icon={<FaIdBadge />} label="Roles held" value={(s.roles || []).length} tone="accent" hint={(s.roles || []).join(', ') || undefined} />
                </div>
            )}

            <div className="grid-2">
                <div className="card flush">
                    <div className="card-header"><h3 className="card-title row"><FaProjectDiagram className="icon-muted" /> My projects</h3></div>
                    {projects.loading ? <Loader label="" /> : (projects.data || []).length === 0 ? (
                        <EmptyState icon={<FaFolderOpen />} title="No projects yet" description="Create a project or ask to be invited to one." />
                    ) : (
                        <div className="list" style={{ padding: '0.25rem 0.75rem' }}>
                            {projects.data.map((p) => (
                                <Link key={p.id} to={`/project/${p.id}`} className="list-item clickable">
                                    <span className="logo-preview" style={{ width: 34, height: 34, fontSize: '0.8rem', borderRadius: 9 }}>
                                        {p.logo_small_url ? <img src={p.logo_small_url} alt="" /> : initials(p.name)}
                                    </span>
                                    <div className="list-item-main">
                                        <div className="list-item-title">{p.name}</div>
                                        <div className="list-item-sub">{(p.members || []).length} members · updated {formatDate(p.modified_date)}</div>
                                    </div>
                                    {p.i_am_owner ? <span className="badge badge-accent">Owner</span> : p.i_am_admin ? <span className="badge badge-primary">Admin</span> : null}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                <div className="card flush">
                    <div className="card-header"><h3 className="card-title row"><FaUserFriends className="icon-muted" /> Contacts</h3></div>
                    {contacts.loading ? <Loader label="" /> : (contacts.data || []).length === 0 ? (
                        <EmptyState icon={<FaUserFriends />} title="No contacts yet" description="People you share projects with appear here." />
                    ) : (
                        <div className="list" style={{ padding: '0.25rem 0.75rem' }}>
                            {contacts.data.map((c) => (
                                <div key={c.id} className="list-item">
                                    <UserAvatar user={c} size="md" />
                                    <div className="list-item-main">
                                        <div className="list-item-title">{c.full_name_display || c.username}</div>
                                        <div className="list-item-sub">@{c.username}{(c.roles || []).length ? ` · ${c.roles.join(', ')}` : ''}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfileOverview;

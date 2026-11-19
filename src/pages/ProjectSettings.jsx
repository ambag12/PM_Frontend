import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
    FaCog, FaInfoCircle, FaPuzzlePiece, FaTags, FaHashtag, FaSlidersH, FaUserShield, FaLink, FaFileExport, FaExclamationTriangle, FaUsers,
} from 'react-icons/fa';
import { useProject } from '../context/ProjectContext';
import { usePermissions } from '../context/PermissionContext';
import { PageHeader, Loader, EmptyState } from '../components/UI';
import { ReadOnlyNotice } from '../components/settings/shared';
import GeneralSettings from '../components/settings/GeneralSettings';
import ModulesSettings from '../components/settings/ModulesSettings';
import AttributesSettings from '../components/settings/AttributesSettings';
import TagsSettings from '../components/settings/TagsSettings';
import CustomFieldsSettings from '../components/settings/CustomFieldsSettings';
import RolesSettings from '../components/settings/RolesSettings';
import IntegrationsSettings from '../components/settings/IntegrationsSettings';
import ExportSettings from '../components/settings/ExportSettings';
import DangerZone from '../components/settings/DangerZone';
import '../styles/settings.css';

const SECTIONS = [
    { id: 'general', label: 'General', icon: <FaInfoCircle />, Component: GeneralSettings },
    { id: 'modules', label: 'Modules', icon: <FaPuzzlePiece />, Component: ModulesSettings },
    { id: 'attributes', label: 'Attributes', icon: <FaTags />, Component: AttributesSettings },
    { id: 'tags', label: 'Tags', icon: <FaHashtag />, Component: TagsSettings },
    { id: 'custom-fields', label: 'Custom fields', icon: <FaSlidersH />, Component: CustomFieldsSettings },
    { id: 'roles', label: 'Roles & permissions', icon: <FaUserShield />, Component: RolesSettings },
    { id: 'integrations', label: 'Integrations', icon: <FaLink />, Component: IntegrationsSettings },
    { id: 'export', label: 'Reports & export', icon: <FaFileExport />, Component: ExportSettings },
    { id: 'danger', label: 'Danger zone', icon: <FaExclamationTriangle />, Component: DangerZone, danger: true },
];

const ProjectSettings = () => {
    const { project, loading, error, reload, patchLocal } = useProject();
    const { isAdmin, isOwner } = usePermissions();
    const [params, setParams] = useSearchParams();
    const sectionId = SECTIONS.some((s) => s.id === params.get('section')) ? params.get('section') : 'general';
    const section = SECTIONS.find((s) => s.id === sectionId);

    if (loading && !project) return <Loader label="Loading project settings…" />;
    if (error || !project) {
        return <EmptyState icon={<FaCog />} title="Project unavailable" description="This project could not be loaded, or you no longer have access to it." action={<Link className="btn btn-primary" to="/">Back to dashboard</Link>} />;
    }

    const canEdit = !!(isAdmin || isOwner);
    const Section = section.Component;

    const go = (id) => {
        setParams(id === 'general' ? {} : { section: id }, { replace: true });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="settings-page">
            <PageHeader
                icon={<FaCog />}
                eyebrow={project.name}
                title="Project settings"
                subtitle="Configure how this project works — details, modules, workflow values, access and integrations."
                actions={<Link className="btn btn-secondary" to={`/project/${project.id}/members`}><FaUsers /> Manage team</Link>}
            />

            {!canEdit && (
                <ReadOnlyNotice>
                    You can review this project’s configuration, but only project administrators can change it. Ask {project.owner?.full_name_display || 'the owner'} for admin access.
                </ReadOnlyNotice>
            )}

            <div className="settings-layout">
                <nav className="settings-nav" aria-label="Settings sections">
                    <div className="settings-nav-label eyebrow">Settings</div>
                    {SECTIONS.map((s) => (
                        <React.Fragment key={s.id}>
                            {s.danger && <div className="settings-nav-divider" />}
                            <button
                                className={`settings-nav-item ${s.id === sectionId ? 'active' : ''} ${s.danger ? 'is-danger' : ''}`}
                                onClick={() => go(s.id)}
                                aria-current={s.id === sectionId ? 'page' : undefined}
                            >
                                {s.icon}
                                <span>{s.label}</span>
                            </button>
                        </React.Fragment>
                    ))}
                </nav>

                <div className="settings-content">
                    <Section key={`${section.id}-${project.id}`} project={project} canEdit={canEdit} onSaved={reload} onChanged={reload} patchLocal={patchLocal} />
                </div>
            </div>
        </div>
    );
};

export default ProjectSettings;

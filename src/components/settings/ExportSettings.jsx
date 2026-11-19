import React, { useState } from 'react';
import { FaFileCsv, FaFileExport, FaSyncAlt, FaBan, FaDownload } from 'react-icons/fa';
import { projectService, exportService } from '../../api/services';
import { API_URL } from '../../api/client';
import { useToast, useConfirm } from '../../context/ToastContext';
import { SettingsSection, CopyField } from './shared';

const KINDS = [
    { id: 'epics', label: 'Epics' },
    { id: 'userstories', label: 'User stories' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'issues', label: 'Issues' },
];

const base = API_URL.endsWith('/') ? API_URL : `${API_URL}/`;
const csvUrl = (kind, uuid) => `${base}${kind}/csv?uuid=${uuid}`;

const ExportSettings = ({ project, canEdit, patchLocal }) => {
    const toast = useToast();
    const confirm = useConfirm();
    const [busy, setBusy] = useState('');
    const [exportResult, setExportResult] = useState(null);

    const regenerate = async (kind) => {
        const field = `${kind.id}_csv_uuid`;
        if (project[field] && !(await confirm({
            title: `Regenerate ${kind.label.toLowerCase()} CSV link?`,
            message: 'The current link stops working. Anyone using it (spreadsheets, BI tools) must switch to the new one.',
            confirmText: 'Regenerate',
        }))) return;
        setBusy(kind.id);
        try {
            const res = await projectService.regenerateCsvUuid(project.id, kind.id);
            patchLocal?.({ [field]: res.data?.uuid });
            toast.success(`${kind.label} CSV link ${project[field] ? 'regenerated' : 'enabled'}`);
        } catch (err) {
            toast.error(err);
        } finally {
            setBusy('');
        }
    };

    const disable = async (kind) => {
        const field = `${kind.id}_csv_uuid`;
        if (!(await confirm({ title: `Disable ${kind.label.toLowerCase()} CSV link?`, message: 'The link stops working immediately.', confirmText: 'Disable', danger: true }))) return;
        setBusy(kind.id);
        try {
            await projectService.deleteCsvUuid(project.id, kind.id);
            patchLocal?.({ [field]: null });
            toast.success(`${kind.label} CSV link disabled`);
        } catch (err) {
            toast.error(err);
        } finally {
            setBusy('');
        }
    };

    const exportProject = async () => {
        setBusy('export');
        setExportResult(null);
        try {
            const res = await exportService.exportProject(project.id);
            setExportResult(res.data || {});
            toast.success(res.data?.url ? 'Export ready to download' : 'Export started — you will receive an email when it is ready');
        } catch (err) {
            toast.error(err);
        } finally {
            setBusy('');
        }
    };

    return (
        <>
            <SettingsSection icon={<FaFileCsv />} title="CSV reports" description="Secret links that always return the latest data as CSV — paste them into Excel, Google Sheets or Power BI.">
                {KINDS.map((k) => {
                    const uuid = project[`${k.id}_csv_uuid`];
                    return (
                        <div key={k.id} className="settings-row" style={{ flexWrap: 'wrap' }}>
                            <div className="settings-row-main" style={{ minWidth: 220 }}>
                                <div className="settings-row-title">{k.label} {uuid ? <span className="badge badge-success">Enabled</span> : <span className="badge">Disabled</span>}</div>
                                {uuid ? <div className="mt-2"><CopyField value={csvUrl(k.id, uuid)} label={`${k.label} CSV URL`} /></div> : <div className="settings-row-desc">No link generated yet.</div>}
                            </div>
                            {canEdit && (
                                <div className="row">
                                    <button className="btn btn-secondary btn-sm" onClick={() => regenerate(k)} disabled={busy === k.id}>
                                        {busy === k.id ? <span className="spinner spinner-sm" /> : <><FaSyncAlt /> {uuid ? 'Regenerate' : 'Generate link'}</>}
                                    </button>
                                    {uuid && <button className="btn btn-danger-ghost btn-sm" onClick={() => disable(k)} disabled={busy === k.id}><FaBan /> Disable</button>}
                                </div>
                            )}
                        </div>
                    );
                })}
            </SettingsSection>

            <SettingsSection icon={<FaFileExport />} title="Export project" description="A complete JSON dump (stories, tasks, issues, wiki, attachments metadata) that can be imported into another Taiga instance.">
                <div className="row flex-wrap gap-3">
                    <button className="btn btn-primary" onClick={exportProject} disabled={busy === 'export' || !canEdit}>
                        {busy === 'export' ? <span className="spinner spinner-sm" /> : <><FaFileExport /> Export project</>}
                    </button>
                    {exportResult?.url && (
                        <a className="btn btn-secondary" href={exportResult.url} target="_blank" rel="noopener noreferrer"><FaDownload /> Download export</a>
                    )}
                </div>
                {exportResult && (
                    exportResult.url ? (
                        <div className="mt-3"><CopyField value={exportResult.url} label="Export URL" /></div>
                    ) : (
                        <div className="alert alert-success mt-3">
                            Export started{exportResult.export_id ? ` (job ${exportResult.export_id})` : ''}. You’ll receive an email with the download link when it finishes.
                        </div>
                    )
                )}
            </SettingsSection>
        </>
    );
};

export default ExportSettings;

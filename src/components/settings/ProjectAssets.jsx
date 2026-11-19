import React, { useEffect, useRef, useState } from 'react';
import { FaImage, FaFilePdf, FaUpload, FaTrash, FaExternalLinkAlt } from 'react-icons/fa';
import { projectService } from '../../api/services';
import { getErrorMessage } from '../../api/client';
import { useToast, useConfirm } from '../../context/ToastContext';
import { SettingsSection } from './shared';
import { initials } from '../../utils/format';

/* Logo (change/remove with preview) + PC-1 document (Cloudinary upload). */
const ProjectAssets = ({ project, canEdit, onSaved }) => {
    const toast = useToast();
    const confirm = useConfirm();
    const logoInput = useRef(null);
    const pcInput = useRef(null);
    const [preview, setPreview] = useState(null);
    const [busy, setBusy] = useState('');
    const [pcError, setPcError] = useState('');

    useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

    const onLogo = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error('Please choose an image file (PNG, JPG, GIF)');
            return;
        }
        setPreview(URL.createObjectURL(file));
        setBusy('logo');
        try {
            await projectService.changeLogo(project.id, file);
            toast.success('Logo updated');
            onSaved?.();
        } catch (err) {
            setPreview(null);
            toast.error(err);
        } finally {
            setBusy('');
        }
    };

    const removeLogo = async () => {
        if (!(await confirm({ title: 'Remove logo?', message: 'The project will fall back to its initials.', confirmText: 'Remove', danger: true }))) return;
        setBusy('logo');
        try {
            await projectService.removeLogo(project.id);
            setPreview(null);
            toast.success('Logo removed');
            onSaved?.();
        } catch (err) {
            toast.error(err);
        } finally {
            setBusy('');
        }
    };

    const onPc1 = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setBusy('pc1');
        setPcError('');
        try {
            await projectService.uploadPc1(project.id, file);
            toast.success('PC-1 document uploaded');
            onSaved?.();
        } catch (err) {
            const status = err?.response?.status;
            const raw = err?.response?.data;
            const msg = typeof raw === 'string' && raw.includes('<') ? `Server error (${status})` : getErrorMessage(err, 'Upload failed');
            setPcError(`${msg}${status >= 400 ? ' — the document storage service (Cloudinary) may not be configured on this server. Contact your administrator.' : ''}`);
            toast.error(`PC-1 upload failed: ${msg}`);
        } finally {
            setBusy('');
        }
    };

    const logoSrc = preview || project.logo_big_url || project.logo_small_url;

    return (
        <SettingsSection icon={<FaImage />} title="Logo & PC-1 document" description="Brand the project and keep its approved PC-1 at hand.">
            <div className="asset-grid">
                <div className="asset-tile">
                    <div className="logo-preview">
                        {logoSrc ? <img src={logoSrc} alt="Project logo" /> : initials(project.name)}
                    </div>
                    <div className="flex-1" style={{ minWidth: 0 }}>
                        <div className="font-semibold text-heading">Project logo</div>
                        <div className="text-xs text-muted mb-2">Square image, at least 200×200px.</div>
                        {canEdit && (
                            <div className="row flex-wrap">
                                <input ref={logoInput} type="file" accept="image/*" hidden onChange={onLogo} />
                                <button className="btn btn-secondary btn-sm" onClick={() => logoInput.current?.click()} disabled={busy === 'logo'}>
                                    {busy === 'logo' ? <span className="spinner spinner-sm" /> : <><FaUpload /> {logoSrc ? 'Replace' : 'Upload'}</>}
                                </button>
                                {(project.logo_big_url || project.logo_small_url) && (
                                    <button className="btn btn-danger-ghost btn-sm" onClick={removeLogo} disabled={busy === 'logo'}>
                                        <FaTrash /> Remove
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="asset-tile">
                    <div className="file-icon-tile"><FaFilePdf /></div>
                    <div className="flex-1" style={{ minWidth: 0 }}>
                        <div className="font-semibold text-heading">PC-1 document</div>
                        {project.pc1_url ? (
                            <a href={project.pc1_url} target="_blank" rel="noopener noreferrer" className="text-sm row">
                                <FaExternalLinkAlt size={11} /> <span className="truncate">View current PC-1</span>
                            </a>
                        ) : (
                            <div className="text-xs text-muted">No PC-1 uploaded yet.</div>
                        )}
                        {canEdit && (
                            <div className="row mt-2">
                                <input ref={pcInput} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" hidden onChange={onPc1} />
                                <button className="btn btn-secondary btn-sm" onClick={() => pcInput.current?.click()} disabled={busy === 'pc1'}>
                                    {busy === 'pc1' ? <span className="spinner spinner-sm" /> : <><FaUpload /> {project.pc1_url ? 'Upload replacement' : 'Upload PC-1'}</>}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {pcError && <div className="alert alert-error mt-3" role="alert">{pcError}</div>}
        </SettingsSection>
    );
};

export default ProjectAssets;

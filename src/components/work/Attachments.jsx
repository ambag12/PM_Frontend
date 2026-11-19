import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    FaPaperclip, FaCloudUploadAlt, FaDownload, FaTrash, FaEdit, FaFileAlt, FaFilePdf, FaFileImage,
    FaFileWord, FaFileExcel, FaFileArchive, FaArchive, FaUndo,
} from 'react-icons/fa';
import { useToast, useConfirm } from '../../context/ToastContext';
import { formatBytes, timeAgo, formatDateTime } from '../../utils/format';

/*
 * Attachments for epics / user stories / tasks / issues.
 *   <Attachments service={taskService.attachments} projectId={1} objectId={task.id} canEdit />
 * Lists, uploads (drag & drop or file picker, multiple), renames / describes,
 * marks deprecated, downloads and deletes.
 */

const IMAGE_RE = /\.(png|jpe?g|gif|webp|bmp|svg)$/i;
const iconFor = (name = '') => {
    if (IMAGE_RE.test(name)) return <FaFileImage />;
    if (/\.pdf$/i.test(name)) return <FaFilePdf />;
    if (/\.(docx?|odt|rtf)$/i.test(name)) return <FaFileWord />;
    if (/\.(xlsx?|ods|csv)$/i.test(name)) return <FaFileExcel />;
    if (/\.(zip|rar|7z|tar|gz)$/i.test(name)) return <FaFileArchive />;
    return <FaFileAlt />;
};

const AttachmentRow = ({ att, canEdit, onSave, onDelete }) => {
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ name: att.name, description: att.description || '' });
    const [busy, setBusy] = useState(false);
    const [thumbFailed, setThumbFailed] = useState(false);
    const isImage = IMAGE_RE.test(att.name);
    const thumb = isImage && !thumbFailed ? (att.thumbnail_card_url || att.preview_url || att.url) : null;

    const submit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        setBusy(true);
        try {
            await onSave(att, { name: form.name.trim(), description: form.description });
            setEditing(false);
        } catch {
            // toast shown by parent
        } finally {
            setBusy(false);
        }
    };

    const toggleDeprecated = async () => {
        setBusy(true);
        try { await onSave(att, { is_deprecated: !att.is_deprecated }); } catch { /* toast by parent */ } finally { setBusy(false); }
    };

    if (editing) {
        return (
            <form className="attachment-item attachment-edit" onSubmit={submit}>
                <div className="flex-1 stack-sm">
                    <input
                        className="form-input form-input-sm"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        aria-label="File name"
                        required
                    />
                    <input
                        className="form-input form-input-sm"
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        placeholder="Description (optional)"
                        aria-label="Description"
                    />
                </div>
                <div className="row">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)} disabled={busy}>Cancel</button>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>Save</button>
                </div>
            </form>
        );
    }

    return (
        <div className={`attachment-item ${att.is_deprecated ? 'is-deprecated' : ''}`}>
            <a className="attachment-thumb" href={att.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${att.name}`}>
                {thumb ? <img src={thumb} alt="" loading="lazy" onError={() => setThumbFailed(true)} /> : iconFor(att.name)}
            </a>
            <div className="flex-1 attachment-main">
                <a className="attachment-name" href={att.url} target="_blank" rel="noopener noreferrer">{att.name}</a>
                <div className="attachment-meta">
                    {formatBytes(att.size)} · <span title={formatDateTime(att.created_date)}>{timeAgo(att.created_date)}</span>
                    {att.is_deprecated && <span className="badge badge-warning">Deprecated</span>}
                </div>
                {att.description && <div className="attachment-desc">{att.description}</div>}
            </div>
            <div className="attachment-actions">
                <a className="btn btn-ghost btn-sm btn-icon" href={att.url} download={att.name} target="_blank" rel="noopener noreferrer" aria-label={`Download ${att.name}`} title="Download">
                    <FaDownload />
                </a>
                {canEdit && (
                    <>
                        <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditing(true)} aria-label={`Rename ${att.name}`} title="Rename / describe" disabled={busy}>
                            <FaEdit />
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={toggleDeprecated} disabled={busy}
                            aria-label={att.is_deprecated ? `Restore ${att.name}` : `Mark ${att.name} as deprecated`}
                            title={att.is_deprecated ? 'Restore (not deprecated)' : 'Mark as deprecated'}>
                            {att.is_deprecated ? <FaUndo /> : <FaArchive />}
                        </button>
                        <button type="button" className="btn btn-danger-ghost btn-sm btn-icon" onClick={() => onDelete(att)} aria-label={`Delete ${att.name}`} title="Delete" disabled={busy}>
                            <FaTrash />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

const Attachments = ({ service, projectId, objectId, canEdit, onChanged }) => {
    const toast = useToast();
    const confirm = useConfirm();
    const inputRef = useRef(null);
    const [data, setData] = useState({ id: null, list: [], error: null });
    const [uploading, setUploading] = useState([]); // file names in flight
    const [dragging, setDragging] = useState(false);
    const [showDeprecated, setShowDeprecated] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await service.list(projectId, objectId);
            setData({ id: objectId, list: res.data || [], error: null });
        } catch (err) {
            setData({ id: objectId, list: [], error: err });
        }
    }, [service, projectId, objectId]);

    useEffect(() => {
        if (!projectId || !objectId) return;
        load();
    }, [load, projectId, objectId]);

    const loading = String(data.id) !== String(objectId);

    const upload = async (files) => {
        const list = Array.from(files || []);
        if (!list.length) return;
        setUploading((u) => [...u, ...list.map((f) => f.name)]);
        let ok = 0;
        await Promise.all(list.map(async (file) => {
            try {
                await service.upload(projectId, objectId, file);
                ok += 1;
            } catch (err) {
                toast.error(`${file.name}: ${err?.response?.data?.attached_file || err?.message || 'upload failed'}`);
            } finally {
                setUploading((u) => {
                    const i = u.indexOf(file.name);
                    return i === -1 ? u : [...u.slice(0, i), ...u.slice(i + 1)];
                });
            }
        }));
        if (ok) {
            toast.success(ok === 1 ? 'File attached' : `${ok} files attached`);
            await load();
            onChanged?.();
        }
        if (inputRef.current) inputRef.current.value = '';
    };

    const saveAtt = async (att, patch) => {
        try {
            await service.update(att.id, patch);
            await load();
        } catch (err) {
            toast.error(err);
            throw err;
        }
    };

    const remove = async (att) => {
        const ok = await confirm({ title: 'Delete attachment?', message: `"${att.name}" will be permanently removed.`, confirmText: 'Delete', danger: true });
        if (!ok) return;
        try {
            await service.delete(att.id);
            toast.success('Attachment deleted');
            await load();
            onChanged?.();
        } catch (err) {
            toast.error(err);
        }
    };

    const deprecatedCount = data.list.filter((a) => a.is_deprecated).length;
    const visible = data.list.filter((a) => showDeprecated || !a.is_deprecated);

    return (
        <section className="work-section" aria-labelledby={`att-${objectId}`}>
            <div className="work-section-head">
                <h3 className="work-section-title" id={`att-${objectId}`}>
                    <FaPaperclip /> Attachments {!loading && <span className="count-chip">{data.list.length}</span>}
                </h3>
                {deprecatedCount > 0 && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowDeprecated((s) => !s)}>
                        {showDeprecated ? 'Hide' : 'Show'} deprecated ({deprecatedCount})
                    </button>
                )}
            </div>

            {loading ? (
                <div className="skeleton" style={{ height: 52 }} />
            ) : data.error ? (
                <div className="alert alert-error">Could not load attachments. <button type="button" className="btn btn-ghost btn-sm" onClick={load}>Retry</button></div>
            ) : (
                <>
                    {visible.length > 0 && (
                        <div className="mb-3">
                            {visible.map((att) => (
                                <AttachmentRow key={att.id} att={att} canEdit={canEdit} onSave={saveAtt} onDelete={remove} />
                            ))}
                        </div>
                    )}
                    {uploading.map((name, i) => (
                        <div key={`${name}-${i}`} className="attachment-item is-uploading">
                            <span className="attachment-thumb"><span className="spinner spinner-sm" /></span>
                            <div className="flex-1 truncate">{name}</div>
                            <span className="text-xs text-muted">Uploading…</span>
                        </div>
                    ))}
                    {canEdit ? (
                        <div
                            className={`dropzone ${dragging ? 'dragging' : ''}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => inputRef.current?.click()}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
                            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={(e) => { e.preventDefault(); setDragging(false); upload(e.dataTransfer.files); }}
                            aria-label="Upload attachments"
                        >
                            <FaCloudUploadAlt size={20} />
                            <span><strong>Drop files here</strong> or click to browse</span>
                            <input ref={inputRef} type="file" multiple hidden onChange={(e) => upload(e.target.files)} />
                        </div>
                    ) : data.list.length === 0 ? (
                        <p className="text-sm text-muted">No attachments.</p>
                    ) : null}
                </>
            )}
        </section>
    );
};

export default Attachments;

import React, { useEffect, useRef, useState } from 'react';
import { FaPaperclip, FaUpload, FaTrash, FaFileAlt, FaDownload, FaRedo } from 'react-icons/fa';
import { wikiService } from '../../api/services';
import { useConfirm, useToast } from '../../context/ToastContext';
import { formatBytes, timeAgo } from '../../utils/format';
import { Loader } from '../UI';

const isImage = (name) => /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(name || '');

/* Attachments of a wiki page (Taiga attachments: list / upload / delete). */
const WikiAttachments = ({ projectId, pageId, canEdit, onCountChange }) => {
    const toast = useToast();
    const confirm = useConfirm();
    const inputRef = useRef(null);
    const [nonce, setNonce] = useState(0);
    const key = `${pageId}:${nonce}`;
    const [state, setState] = useState({ key: null, items: [], error: null });
    const [uploading, setUploading] = useState(0);
    const [dragging, setDragging] = useState(false);

    useEffect(() => {
        let alive = true;
        wikiService.attachments.list(projectId, pageId)
            .then((res) => {
                if (!alive) return;
                const items = Array.isArray(res.data) ? res.data : [];
                setState({ key, items, error: null });
                onCountChange?.(items.length);
            })
            .catch((error) => alive && setState({ key, items: [], error }));
        return () => { alive = false; };
    }, [key, projectId, pageId, onCountChange]);

    const reload = () => setNonce((n) => n + 1);

    const upload = async (files) => {
        const list = Array.from(files || []);
        if (!list.length) return;
        setUploading(list.length);
        let ok = 0;
        for (const f of list) {
            try {
                await wikiService.attachments.upload(projectId, pageId, f);
                ok += 1;
            } catch (err) {
                toast.error(err);
            }
        }
        setUploading(0);
        if (ok) toast.success(ok === 1 ? 'File attached' : `${ok} files attached`);
        if (inputRef.current) inputRef.current.value = '';
        reload();
    };

    const remove = async (a) => {
        const yes = await confirm({ title: 'Delete attachment?', message: `“${a.name}” will be permanently deleted.`, confirmText: 'Delete', danger: true });
        if (!yes) return;
        try {
            await wikiService.attachments.delete(a.id);
            toast.success('Attachment deleted');
            reload();
        } catch (err) {
            toast.error(err);
        }
    };

    const loading = state.key === null || !state.key.startsWith(`${pageId}:`);

    return (
        <div className="wiki-attachments">
            {canEdit && (
                <div
                    className={`dropzone mb-4 ${dragging ? 'dragging' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => inputRef.current?.click()}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setDragging(false); upload(e.dataTransfer.files); }}
                    aria-label="Upload attachments"
                >
                    {uploading ? <span className="spinner" /> : <FaUpload />}
                    <span>{uploading ? `Uploading ${uploading} file${uploading > 1 ? 's' : ''}…` : <><strong>Click to upload</strong> or drop files here</>}</span>
                    <input ref={inputRef} type="file" multiple className="sr-only" tabIndex={-1} onChange={(e) => upload(e.target.files)} />
                </div>
            )}

            {loading ? (
                <Loader label="Loading attachments…" />
            ) : state.error ? (
                <div className="alert alert-error">
                    <div className="flex-1">Couldn&apos;t load attachments.</div>
                    <button className="btn btn-secondary btn-sm" onClick={reload}><FaRedo size={11} /> Retry</button>
                </div>
            ) : state.items.length === 0 ? (
                <div className="wiki-empty-inline"><FaPaperclip /> No attachments on this page.</div>
            ) : (
                <div>
                    {state.items.map((a) => (
                        <div key={a.id} className="attachment-item">
                            <span className="attachment-thumb">
                                {isImage(a.name) && (a.thumbnail_card_url || a.url) ? <img src={a.thumbnail_card_url || a.url} alt="" /> : <FaFileAlt />}
                            </span>
                            <div className="flex-1">
                                <a href={a.url} target="_blank" rel="noreferrer" className="text-sm font-semibold truncate block">{a.name}</a>
                                <div className="text-xs text-muted">
                                    {formatBytes(a.size)}{a.created_date ? ` · ${timeAgo(a.created_date)}` : ''}{a.description ? ` · ${a.description}` : ''}
                                </div>
                            </div>
                            <a className="btn btn-ghost btn-sm btn-icon" href={a.url} target="_blank" rel="noreferrer" aria-label={`Download ${a.name}`} title="Open / download">
                                <FaDownload size={11} />
                            </a>
                            {canEdit && (
                                <button type="button" className="btn btn-danger-ghost btn-sm btn-icon" onClick={() => remove(a)} aria-label={`Delete ${a.name}`} title="Delete">
                                    <FaTrash size={11} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default WikiAttachments;

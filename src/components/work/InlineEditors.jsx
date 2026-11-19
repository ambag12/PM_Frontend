import React, { useState } from 'react';
import { FaEdit, FaAlignLeft } from 'react-icons/fa';
import { wikiService } from '../../api/services';

/* Click-to-edit subject (Enter saves, Escape cancels). */
export const SubjectEditor = ({ value, onSave, disabled }) => {
    const [draft, setDraft] = useState(null);
    const [busy, setBusy] = useState(false);

    const commit = async () => {
        const next = (draft || '').trim();
        if (!next || next === value) { setDraft(null); return; }
        setBusy(true);
        try {
            await onSave(next);
            setDraft(null);
        } catch {
            // toast shown by mutate()
        } finally {
            setBusy(false);
        }
    };

    if (draft !== null) {
        return (
            <div className="subject-edit">
                <input
                    className="form-input subject-input"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); commit(); }
                        if (e.key === 'Escape') { e.stopPropagation(); setDraft(null); }
                    }}
                    disabled={busy}
                    aria-label="Subject"
                    maxLength={500}
                    autoFocus
                />
                <div className="row">
                    <button type="button" className="btn btn-primary btn-sm" onClick={commit} disabled={busy || !draft.trim()}>
                        {busy && <span className="spinner spinner-sm" />} Save
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDraft(null)} disabled={busy}>Cancel</button>
                </div>
            </div>
        );
    }

    if (disabled) return <h2 className="subject-view">{value}</h2>;
    return (
        <h2 className="subject-view">
            <button type="button" className="subject-btn" onClick={() => setDraft(value || '')} title="Click to edit the subject">
                {value}
                <FaEdit className="subject-edit-icon" aria-hidden="true" />
                <span className="sr-only"> (edit subject)</span>
            </button>
        </h2>
    );
};

/* Description: rendered HTML with an Edit toggle (Write / Preview). */
export const DescriptionEditor = ({ html, value, onSave, disabled, projectId }) => {
    const [draft, setDraft] = useState(null);
    const [busy, setBusy] = useState(false);
    const [preview, setPreview] = useState(null); // rendered html or null

    const save = async () => {
        setBusy(true);
        try {
            await onSave(draft);
            setDraft(null);
            setPreview(null);
        } catch {
            // toast shown by mutate()
        } finally {
            setBusy(false);
        }
    };

    const showPreview = async () => {
        if (!projectId) return;
        setPreview('');
        try {
            const res = await wikiService.renderMarkdown(projectId, draft || '');
            setPreview(res.data?.data ?? '');
        } catch {
            setPreview('<p><em>Preview unavailable.</em></p>');
        }
    };

    return (
        <section className="work-section" aria-label="Description">
            <div className="work-section-head">
                <h3 className="work-section-title"><FaAlignLeft /> Description</h3>
                {!disabled && draft === null && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDraft(value || '')}>
                        <FaEdit /> {value ? 'Edit' : 'Add'}
                    </button>
                )}
            </div>
            {draft !== null ? (
                <div className="stack-sm">
                    <div className="segmented" role="tablist" aria-label="Description editor mode">
                        <button type="button" role="tab" aria-selected={preview === null} className={preview === null ? 'active' : ''} onClick={() => setPreview(null)}>Write</button>
                        <button type="button" role="tab" aria-selected={preview !== null} className={preview !== null ? 'active' : ''} onClick={showPreview}>Preview</button>
                    </div>
                    {preview === null ? (
                        <textarea
                            className="form-input description-input"
                            rows={8}
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) save();
                                if (e.key === 'Escape') { e.stopPropagation(); setDraft(null); }
                            }}
                            placeholder="Describe the work… Markdown is supported."
                            aria-label="Description"
                            autoFocus
                        />
                    ) : (
                        <div className="prose description-preview">
                            {preview === '' ? <span className="spinner spinner-sm" /> : <div dangerouslySetInnerHTML={{ __html: preview || '<p><em>Nothing to preview.</em></p>' }} />}
                        </div>
                    )}
                    <div className="row justify-end">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setDraft(null); setPreview(null); }} disabled={busy}>Cancel</button>
                        <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={busy}>
                            {busy && <span className="spinner spinner-sm" />} Save description
                        </button>
                    </div>
                </div>
            ) : html ? (
                <div className="prose description-view" dangerouslySetInnerHTML={{ __html: html }} />
            ) : (
                <p className="text-sm text-muted">No description{disabled ? '.' : ' yet.'}</p>
            )}
        </section>
    );
};

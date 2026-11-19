import React, { useEffect, useRef, useState } from 'react';
import { FaBold, FaItalic, FaHeading, FaListUl, FaLink, FaCode, FaSave, FaQuoteRight } from 'react-icons/fa';
import { wikiService } from '../../api/services';
import { useConfirm, useToast } from '../../context/ToastContext';

const MODES = [
    { id: 'write', label: 'Write' },
    { id: 'split', label: 'Split' },
    { id: 'preview', label: 'Preview' },
];

const initialMode = () => (typeof window !== 'undefined' && window.innerWidth < 900 ? 'write' : 'split');

/*
 * Markdown editor with a live server-rendered preview (wiki/render, debounced) and
 * optimistic-concurrency save (content + version).
 */
const WikiEditor = ({ projectId, page, onSaved, onCancel }) => {
    const toast = useToast();
    const confirm = useConfirm();
    const areaRef = useRef(null);
    const [content, setContent] = useState(page.content || '');
    const [mode, setMode] = useState(initialMode);
    const [preview, setPreview] = useState({ source: page.content || '', html: page.html || '' });
    const [rendering, setRendering] = useState(false);
    const [saving, setSaving] = useState(false);
    const dirty = content !== (page.content || '');

    // Debounced server render (same renderer as the saved page: Taiga refs, emoji, mentions…)
    useEffect(() => {
        if (!content.trim() || content === preview.source) return undefined;
        let alive = true;
        const t = setTimeout(async () => {
            setRendering(true);
            try {
                const res = await wikiService.renderMarkdown(projectId, content);
                if (alive) setPreview({ source: content, html: res.data?.data || '' });
            } catch {
                /* keep the previous preview */
            } finally {
                if (alive) setRendering(false);
            }
        }, 450);
        return () => { alive = false; clearTimeout(t); };
    }, [content, projectId, preview.source]);

    const previewHtml = content.trim() ? preview.html : '';

    const save = async () => {
        if (!dirty || saving) return;
        setSaving(true);
        try {
            const res = await wikiService.updatePage(page.id, { content, version: page.version });
            toast.success('Page saved');
            onSaved?.(res.data);
        } catch (err) {
            const status = err?.response?.status;
            toast.error(status === 400 && /version/i.test(JSON.stringify(err?.response?.data || ''))
                ? 'Someone else changed this page meanwhile. Copy your text, reload and try again.'
                : err);
        } finally {
            setSaving(false);
        }
    };

    const cancel = async () => {
        if (dirty) {
            const ok = await confirm({ title: 'Discard changes?', message: 'Your unsaved edits to this page will be lost.', confirmText: 'Discard', danger: true });
            if (!ok) return;
        }
        onCancel?.();
    };

    // Wrap / prefix the current selection.
    const apply = (before, after = '', linePrefix = false) => {
        const el = areaRef.current;
        if (!el) return;
        const { selectionStart: s, selectionEnd: e } = el;
        const selected = content.slice(s, e);
        let next;
        let cursor;
        if (linePrefix) {
            const lineStart = content.lastIndexOf('\n', s - 1) + 1;
            next = content.slice(0, lineStart) + before + content.slice(lineStart);
            cursor = e + before.length;
        } else {
            const body = selected || 'text';
            next = content.slice(0, s) + before + body + after + content.slice(e);
            cursor = s + before.length + body.length;
        }
        setContent(next);
        requestAnimationFrame(() => {
            el.focus();
            el.setSelectionRange(linePrefix ? cursor : cursor - (selected ? 0 : 4), cursor);
        });
    };

    const tools = [
        { icon: <FaHeading />, label: 'Heading', run: () => apply('## ', '', true) },
        { icon: <FaBold />, label: 'Bold', run: () => apply('**', '**') },
        { icon: <FaItalic />, label: 'Italic', run: () => apply('_', '_') },
        { icon: <FaListUl />, label: 'Bulleted list', run: () => apply('- ', '', true) },
        { icon: <FaQuoteRight />, label: 'Quote', run: () => apply('> ', '', true) },
        { icon: <FaCode />, label: 'Code', run: () => apply('`', '`') },
        { icon: <FaLink />, label: 'Link', run: () => apply('[', '](https://)') },
    ];

    return (
        <div className="wiki-editor">
            <div className="wiki-editor-bar">
                <div className="wiki-editor-tools" role="toolbar" aria-label="Formatting">
                    {tools.map((t) => (
                        <button key={t.label} type="button" className="btn btn-ghost btn-sm btn-icon" onClick={t.run} aria-label={t.label} title={t.label} disabled={mode === 'preview'}>
                            {t.icon}
                        </button>
                    ))}
                </div>
                <div className="segmented" role="group" aria-label="Editor layout">
                    {MODES.map((m) => (
                        <button key={m.id} type="button" className={`${mode === m.id ? 'active' : ''} ${m.id === 'split' ? 'wiki-split-btn' : ''}`} onClick={() => setMode(m.id)}>
                            {m.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className={`wiki-editor-panes is-${mode}`}>
                {mode !== 'preview' && (
                    <div className="wiki-editor-pane">
                        <label htmlFor={`wiki-src-${page.id}`} className="sr-only">Page content (Markdown)</label>
                        <textarea
                            id={`wiki-src-${page.id}`}
                            ref={areaRef}
                            className="wiki-editor-input"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            onKeyDown={(e) => {
                                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
                            }}
                            placeholder={'# Heading\n\nWrite in Markdown. Reference items with #123 and people with @username.'}
                            spellCheck
                            autoFocus
                        />
                    </div>
                )}
                {mode !== 'write' && (
                    <div className="wiki-editor-pane is-preview" aria-live="polite">
                        <div className="wiki-preview-label">
                            Preview {rendering && <span className="spinner spinner-sm" aria-label="Rendering" />}
                        </div>
                        {previewHtml ? (
                            // Rendered and sanitised by the Taiga backend (bleach) — same HTML as saved pages.
                            <div className="prose" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                        ) : (
                            <p className="text-muted text-sm">Nothing to preview yet.</p>
                        )}
                    </div>
                )}
            </div>

            <div className="wiki-editor-foot">
                <span className="text-xs text-muted">
                    Markdown supported · <span className="kbd">Ctrl</span> + <span className="kbd">S</span> to save
                    {dirty && <span className="badge badge-warning ml-2">Unsaved</span>}
                </span>
                <div className="row">
                    <button type="button" className="btn btn-secondary" onClick={cancel} disabled={saving}>Cancel</button>
                    <button type="button" className="btn btn-primary" onClick={save} disabled={!dirty || saving}>
                        {saving ? <span className="spinner spinner-sm" /> : <FaSave size={12} />} Save page
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WikiEditor;

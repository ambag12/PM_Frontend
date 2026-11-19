import React, { useState } from 'react';
import { FaPlus } from 'react-icons/fa';
import { wikiService } from '../../api/services';
import { getErrorMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Modal, Field } from '../UI';
import { slugify, titleFromSlug } from './wikiUtils';

const TEMPLATES = [
    { id: 'blank', label: 'Blank', body: (t) => `# ${t}\n\n` },
    { id: 'meeting', label: 'Meeting notes', body: (t) => `# ${t}\n\n**Date:** \n**Attendees:** \n\n## Agenda\n\n- \n\n## Decisions\n\n- \n\n## Action items\n\n- [ ] \n` },
    { id: 'decision', label: 'Decision record', body: (t) => `# ${t}\n\n## Context\n\n\n## Decision\n\n\n## Consequences\n\n` },
];

/* Create a wiki page: title → slug (editable), optional starter template. */
const CreatePageModal = ({ projectId, existingSlugs, initialSlug = '', onClose, onCreated }) => {
    const toast = useToast();
    const [title, setTitle] = useState(initialSlug ? titleFromSlug(initialSlug) : '');
    const [slug, setSlug] = useState(initialSlug);
    const [slugTouched, setSlugTouched] = useState(!!initialSlug);
    const [template, setTemplate] = useState('blank');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [touched, setTouched] = useState(false);

    const effectiveSlug = slugTouched ? slugify(slug) : slugify(title);
    const taken = existingSlugs.has(effectiveSlug);
    const slugError = touched && !effectiveSlug ? 'Enter a title.' : taken ? 'A page with this address already exists.' : null;

    const submit = async (e) => {
        e.preventDefault();
        setTouched(true);
        if (!effectiveSlug || taken) return;
        setSaving(true);
        setError(null);
        try {
            const tpl = TEMPLATES.find((t) => t.id === template) || TEMPLATES[0];
            const res = await wikiService.createPage({
                project: Number(projectId),
                slug: effectiveSlug,
                content: tpl.body(title.trim() || titleFromSlug(effectiveSlug)),
            });
            toast.success('Page created');
            onCreated?.(res.data);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            isOpen
            onClose={onClose}
            title="New wiki page"
            footer={(
                <>
                    <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button type="submit" form="wiki-create-form" className="btn btn-primary" disabled={saving}>
                        {saving ? <span className="spinner spinner-sm" /> : <FaPlus size={11} />} Create page
                    </button>
                </>
            )}
        >
            <form id="wiki-create-form" onSubmit={submit} noValidate>
                {error && <div className="alert alert-error mb-4">{error}</div>}
                <Field label="Title">
                    <input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Procurement guidelines" autoFocus />
                </Field>
                <Field label="Page address" error={slugError} hint={effectiveSlug ? `Linked as ?page=${effectiveSlug}` : 'Generated from the title'}>
                    <div className="wiki-slug-input">
                        <span className="wiki-slug-prefix">wiki/</span>
                        <input
                            className="form-input"
                            value={slugTouched ? slug : slugify(title)}
                            onChange={(e) => { setSlugTouched(true); setSlug(e.target.value); }}
                            aria-label="Page slug"
                        />
                    </div>
                </Field>
                <Field label="Start from">
                    <div className="segmented" role="radiogroup" aria-label="Template">
                        {TEMPLATES.map((t) => (
                            <button key={t.id} type="button" role="radio" aria-checked={template === t.id} className={template === t.id ? 'active' : ''} onClick={() => setTemplate(t.id)}>
                                {t.label}
                            </button>
                        ))}
                    </div>
                </Field>
            </form>
        </Modal>
    );
};

export default CreatePageModal;

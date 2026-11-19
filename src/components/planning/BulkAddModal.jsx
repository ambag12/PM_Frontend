import React, { useState } from 'react';
import { FaLayerGroup } from 'react-icons/fa';
import { Modal, Button } from '../UI';
import { useToast } from '../../context/ToastContext';

/*
 * BulkAddModal — one subject per line. `onSubmit(text)` must return a promise (the bulk_create call).
 */
const BulkAddModal = ({ title = 'Bulk add', itemLabel = 'items', hint, onClose, onSubmit, children }) => {
    const toast = useToast();
    const [text, setText] = useState('');
    const [saving, setSaving] = useState(false);
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

    const submit = async (e) => {
        e?.preventDefault();
        if (!lines.length) return;
        setSaving(true);
        try {
            await onSubmit(lines.join('\n'));
            toast.success(`Added ${lines.length} ${itemLabel}`);
            onClose();
        } catch (err) {
            toast.error(err);
            setSaving(false);
        }
    };

    return (
        <Modal
            isOpen
            onClose={onClose}
            title={title}
            size="md"
            footer={(
                <>
                    <span className="text-sm text-muted pl-footer-note">{lines.length} {itemLabel}</span>
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={submit} loading={saving} disabled={!lines.length} icon={<FaLayerGroup />}>
                        Add {lines.length || ''} {itemLabel}
                    </Button>
                </>
            )}
        >
            <form onSubmit={submit}>
                {children}
                <div className="form-group mb-0">
                    <label className="form-label" htmlFor="bulk-add-text">One subject per line</label>
                    <textarea
                        id="bulk-add-text"
                        className="form-input pl-bulk-textarea"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(e); }}
                        placeholder={'Prepare site survey\nDraft procurement plan\nReview structural drawings'}
                        autoFocus
                        rows={8}
                    />
                    <div className="form-hint">{hint || 'Empty lines are ignored. Press Ctrl+Enter to add.'}</div>
                </div>
            </form>
        </Modal>
    );
};

export default BulkAddModal;

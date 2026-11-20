import React, { useId, useState } from 'react';
import { FaPlus, FaTimes } from 'react-icons/fa';
import { normalizeTags } from '../../utils/format';

/*
 * Tag editor — used by the drawers (saves on every change) and the create modals (form value).
 *   <TagEditor value={item.tags} tagsColors={project.tags_colors} onChange={(names) => save({ tags: names })} />
 * value accepts the API tags ([[name, color]] or [name]); onChange receives an array of tag names.
 */
const TagEditor = ({ value, tagsColors = {}, onChange, disabled = false, placeholder = 'Add a tag…' }) => {
    const listId = useId();
    const [adding, setAdding] = useState(false);
    const [text, setText] = useState('');
    const [busy, setBusy] = useState(false);
    const tags = normalizeTags(value, tagsColors || {});
    const names = tags.map((t) => t.name);
    const suggestions = Object.keys(tagsColors || {}).filter((t) => !names.includes(t)).sort();

    const commit = async (next) => {
        setBusy(true);
        try {
            await onChange?.(next);
        } catch {
            // caller shows the error
        } finally {
            setBusy(false);
        }
    };

    const add = async () => {
        const parts = text.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
        const fresh = parts.filter((t, i) => !names.includes(t) && parts.indexOf(t) === i);
        setText('');
        if (fresh.length) await commit([...names, ...fresh]);
    };

    const remove = (name) => commit(names.filter((n) => n !== name));

    const onKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            add();
        } else if (e.key === 'Escape') {
            e.stopPropagation();
            setAdding(false);
            setText('');
        } else if (e.key === 'Backspace' && !text && names.length) {
            remove(names[names.length - 1]);
        }
    };

    return (
        <div className={`tag-editor ${busy ? 'is-busy' : ''}`}>
            {tags.map((t) => (
                <span key={t.name} className="tag-chip tag-chip-removable" style={t.color ? { '--tag': t.color } : undefined}>
                    {t.name}
                    {!disabled && (
                        <button type="button" onClick={() => remove(t.name)} aria-label={`Remove tag ${t.name}`} disabled={busy}>
                            <FaTimes size={8} />
                        </button>
                    )}
                </span>
            ))}
            {!disabled && (adding ? (
                <span className="tag-editor-input">
                    <input
                        autoFocus
                        className="form-input form-input-sm"
                        value={text}
                        list={listId}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={onKeyDown}
                        onBlur={() => { if (text.trim()) add(); else setAdding(false); }}
                        placeholder={placeholder}
                        aria-label="New tag"
                    />
                    <datalist id={listId}>
                        {suggestions.map((s) => <option key={s} value={s} />)}
                    </datalist>
                </span>
            ) : (
                <button type="button" className="tag-add-btn" onClick={() => setAdding(true)} disabled={busy}>
                    <FaPlus size={9} /> Tag
                </button>
            ))}
            {disabled && tags.length === 0 && <span className="text-muted text-sm">No tags</span>}
        </div>
    );
};

export default TagEditor;

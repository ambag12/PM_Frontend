import React, { useCallback, useEffect, useState } from 'react';
import { FaEdit, FaExternalLinkAlt, FaSlidersH } from 'react-icons/fa';
import { useToast } from '../../context/ToastContext';
import { formatDate } from '../../utils/format';
import { Switch } from '../UI';
import { isVersionConflict } from './workTypes';

/*
 * Custom attributes panel.
 *   <CustomAttributes defs={project.issue_custom_attributes} service={issueService.customAttributes}
 *                     objectId={issue.id} canEdit />
 * Values come from <type>/custom-attributes-values/<id> ({ attributes_values, version }).
 */

const renderValue = (def, v) => {
    if (v === undefined || v === null || v === '') return <span className="text-muted">—</span>;
    switch (def.type) {
        case 'checkbox':
            return v ? 'Yes' : 'No';
        case 'date':
            return formatDate(v);
        case 'url':
            return (
                <a href={v} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">
                    <span className="truncate">{v}</span> <FaExternalLinkAlt size={10} />
                </a>
            );
        case 'number':
            return Number(v).toLocaleString();
        case 'multiline':
        case 'richtext':
            return <span className="ca-multiline">{v}</span>;
        default:
            return String(v);
    }
};

const AttrInput = ({ def, value, onChange, id }) => {
    const common = { id, className: 'form-input form-input-sm', value: value ?? '' };
    switch (def.type) {
        case 'multiline':
        case 'richtext':
            return <textarea {...common} rows={3} onChange={(e) => onChange(e.target.value)} />;
        case 'date':
            return <input type="date" {...common} onChange={(e) => onChange(e.target.value)} />;
        case 'url':
            return <input type="url" {...common} placeholder="https://…" onChange={(e) => onChange(e.target.value)} />;
        case 'number':
            return <input type="number" step="any" {...common} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} />;
        case 'checkbox':
            return <Switch checked={!!value} onChange={onChange} label={value ? 'Yes' : 'No'} />;
        case 'dropdown':
            return (
                <select {...common} onChange={(e) => onChange(e.target.value)}>
                    <option value="">—</option>
                    {(def.extra || []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
            );
        default:
            return <input type="text" {...common} onChange={(e) => onChange(e.target.value)} />;
    }
};

const CustomAttributes = ({ defs, service, objectId, canEdit }) => {
    const toast = useToast();
    const [data, setData] = useState({ id: null, values: {}, version: null, error: null });
    const [draft, setDraft] = useState(null);
    const [saving, setSaving] = useState(false);
    const sorted = [...(defs || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const load = useCallback(async () => {
        try {
            const res = await service.getValues(objectId);
            setData({ id: objectId, values: res.data.attributes_values || {}, version: res.data.version, error: null });
            return res.data;
        } catch (err) {
            setData({ id: objectId, values: {}, version: null, error: err });
            return null;
        }
    }, [service, objectId]);

    useEffect(() => {
        if (!sorted.length) return;
        load();
    }, [load, sorted.length]);

    if (!sorted.length) return null;
    const loading = String(data.id) !== String(objectId);

    const save = async () => {
        setSaving(true);
        const values = { ...data.values };
        Object.entries(draft).forEach(([k, v]) => {
            if (v === '' || v === null || v === undefined) delete values[k];
            else values[k] = v;
        });
        try {
            const res = await service.updateValues(objectId, { attributes_values: values, version: data.version });
            setData({ id: objectId, values: res.data.attributes_values || {}, version: res.data.version, error: null });
            setDraft(null);
            toast.success('Custom fields saved');
        } catch (err) {
            if (isVersionConflict(err)) {
                const fresh = await load();
                if (fresh) {
                    try {
                        const res = await service.updateValues(objectId, { attributes_values: { ...fresh.attributes_values, ...values }, version: fresh.version });
                        setData({ id: objectId, values: res.data.attributes_values || {}, version: res.data.version, error: null });
                        setDraft(null);
                        toast.info('Custom fields had changed elsewhere — latest version loaded and your values saved.');
                    } catch (err2) {
                        toast.error(err2);
                    }
                }
            } else {
                toast.error(err);
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className="work-section" aria-labelledby={`ca-${objectId}`}>
            <div className="work-section-head">
                <h3 className="work-section-title" id={`ca-${objectId}`}><FaSlidersH /> Custom fields</h3>
                {canEdit && !draft && !loading && !data.error && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDraft({ ...data.values })}>
                        <FaEdit /> Edit
                    </button>
                )}
            </div>
            {loading ? (
                <div className="skeleton" style={{ height: 64 }} />
            ) : data.error ? (
                <div className="alert alert-error">Could not load custom fields. <button type="button" className="btn btn-ghost btn-sm" onClick={load}>Retry</button></div>
            ) : draft ? (
                <div className="ca-form">
                    {sorted.map((def) => (
                        <div key={def.id} className="form-group">
                            <label className="form-label" htmlFor={`ca-${objectId}-${def.id}`}>{def.name}</label>
                            <AttrInput
                                id={`ca-${objectId}-${def.id}`}
                                def={def}
                                value={draft[def.id]}
                                onChange={(v) => setDraft((d) => ({ ...d, [def.id]: v }))}
                            />
                            {def.description && <div className="form-hint">{def.description}</div>}
                        </div>
                    ))}
                    <div className="row justify-end">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDraft(null)} disabled={saving}>Cancel</button>
                        <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
                            {saving ? <span className="spinner spinner-sm" /> : null} Save fields
                        </button>
                    </div>
                </div>
            ) : (
                <dl className="ca-list">
                    {sorted.map((def) => (
                        <div key={def.id} className="ca-row">
                            <dt title={def.description || undefined}>{def.name}</dt>
                            <dd>{renderValue(def, data.values[def.id])}</dd>
                        </div>
                    ))}
                </dl>
            )}
        </section>
    );
};

export default CustomAttributes;

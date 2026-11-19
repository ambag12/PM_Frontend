import React, { useState } from 'react';
import { FaSave, FaUndo } from 'react-icons/fa';
import { tenderService } from '../api/services';
import { useToast } from '../context/ToastContext';
import { formatDateTime, timeAgo } from '../utils/format';
import { Drawer, Field } from './UI';
import OpeningDate from './modules/OpeningDate';
import RemarksThread from './modules/RemarksThread';
import { TenderStatusPill, TenderStepper } from './modules/TenderStatus';
import { useMemberships } from './modules/hooks';
import { lastActivity, parseLooseDate, toDateInput } from './modules/moduleUtils';
import '../styles/modules.css';

const NAME_MAX = 50;

const unwrapOne = (res) => {
    const d = res?.data?.data ?? res?.data;
    return Array.isArray(d) ? d[0] : d;
};

/*
 * Tender detail drawer: status stepper, editable fields, remarks thread.
 * Tenders cannot be deleted (the backend has no delete endpoint).
 */
const TenderDetail = ({ tender, isOpen, onClose, onUpdated, showProject }) => {
    if (!tender) return null;
    return (
        <Drawer
            isOpen={isOpen}
            onClose={onClose}
            width={720}
            subtitle={(
                <span className="row gap-2">
                    <span className="ref">TND-{String(tender.id).padStart(3, '0')}</span>
                    {showProject && tender._project?.name && <span>· {tender._project.name}</span>}
                </span>
            )}
            title={(
                <div className="row flex-wrap gap-2">
                    <h2 className="text-xl font-bold">{tender.name_of_tenders || 'Untitled tender'}</h2>
                    <TenderStatusPill status={tender.status} />
                </div>
            )}
        >
            <TenderDetailBody key={tender.id} tender={tender} onUpdated={onUpdated} />
        </Drawer>
    );
};

const TenderDetailBody = ({ tender, onUpdated }) => {
    const toast = useToast();
    const memberships = useMemberships(tender.project);
    const [form, setForm] = useState(() => ({
        name_of_tenders: tender.name_of_tenders || '',
        tech_opeining: toDateInput(tender.tech_opeining),
        financial_opening: toDateInput(tender.financial_opening),
    }));
    const [saving, setSaving] = useState(false);
    const [statusSaving, setStatusSaving] = useState(false);

    // Stored values that aren't dates can't be shown in a date input; keep them unless replaced.
    const techText = tender.tech_opeining && !parseLooseDate(tender.tech_opeining) ? tender.tech_opeining : null;
    const finText = tender.financial_opening && !parseLooseDate(tender.financial_opening) ? tender.financial_opening : null;

    const changes = {};
    if (form.name_of_tenders.trim() !== (tender.name_of_tenders || '')) changes.name_of_tenders = form.name_of_tenders.trim();
    if (form.tech_opeining !== toDateInput(tender.tech_opeining) && !(techText && !form.tech_opeining)) changes.tech_opeining = form.tech_opeining;
    if (form.financial_opening !== toDateInput(tender.financial_opening) && !(finText && !form.financial_opening)) changes.financial_opening = form.financial_opening;
    const dirty = Object.keys(changes).length > 0;
    const nameError = !form.name_of_tenders.trim() ? 'A tender needs a name.' : null;
    const orderWarning = form.tech_opeining && form.financial_opening && form.financial_opening < form.tech_opeining
        ? 'Financial bids are normally opened after the technical evaluation.' : null;

    const refresh = async () => {
        try {
            const fresh = unwrapOne(await tenderService.get(tender.id));
            if (fresh) onUpdated?.(fresh);
        } catch {
            /* the list keeps the previous copy */
        }
    };

    const save = async (e) => {
        e.preventDefault();
        if (!dirty || nameError) return;
        setSaving(true);
        try {
            const updated = unwrapOne(await tenderService.update(tender.id, changes));
            onUpdated?.(updated);
            toast.success('Tender updated');
        } catch (err) {
            toast.error(err);
        } finally {
            setSaving(false);
        }
    };

    const reset = () => setForm({
        name_of_tenders: tender.name_of_tenders || '',
        tech_opeining: toDateInput(tender.tech_opeining),
        financial_opening: toDateInput(tender.financial_opening),
    });

    const changeStatus = async (status) => {
        setStatusSaving(true);
        try {
            const updated = unwrapOne(await tenderService.update(tender.id, { status }));
            onUpdated?.(updated);
            toast.success(`Status changed to ${status.replace(/_/g, ' ')}`);
        } catch (err) {
            toast.error(err);
        } finally {
            setStatusSaving(false);
        }
    };

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    return (
        <div className="stack mod-detail">
            <section>
                <div className="eyebrow mb-3">Procurement stage</div>
                <TenderStepper status={tender.status || 'not_started'} onChange={changeStatus} disabled={statusSaving} />
            </section>

            <section className="mod-openings">
                <div className="mod-opening-tile">
                    <div className="eyebrow">Technical opening</div>
                    <OpeningDate value={tender.tech_opeining} done={tender.status === 'completed'} />
                </div>
                <div className="mod-opening-tile">
                    <div className="eyebrow">Financial opening</div>
                    <OpeningDate value={tender.financial_opening} done={tender.status === 'completed'} />
                </div>
            </section>

            <form className="card" onSubmit={save}>
                <div className="card-header">
                    <h3 className="card-title">Details</h3>
                    {dirty && <span className="badge badge-warning">Unsaved changes</span>}
                </div>
                <Field label="Tender name" error={nameError} hint={`${form.name_of_tenders.length}/${NAME_MAX} characters`}>
                    <input className="form-input" value={form.name_of_tenders} maxLength={NAME_MAX} onChange={set('name_of_tenders')} />
                </Field>
                <div className="form-grid">
                    <Field label="Technical opening" hint={techText ? `Currently "${techText}" (free text). Pick a date to replace it.` : 'Technical bid opening date'}>
                        <input type="date" className="form-input" value={form.tech_opeining} onChange={set('tech_opeining')} />
                    </Field>
                    <Field
                        label="Financial opening"
                        hint={finText ? `Currently "${finText}" (free text). Pick a date to replace it.` : 'Financial bid opening date'}
                    >
                        <input type="date" className="form-input" value={form.financial_opening} onChange={set('financial_opening')} />
                    </Field>
                </div>
                {orderWarning && <div className="alert alert-warning mb-3">{orderWarning}</div>}
                <div className="form-actions">
                    <button type="button" className="btn btn-ghost" onClick={reset} disabled={!dirty || saving}><FaUndo size={11} /> Reset</button>
                    <button type="submit" className="btn btn-primary" disabled={!dirty || !!nameError || saving}>
                        {saving ? <span className="spinner spinner-sm" /> : <FaSave size={12} />} Save changes
                    </button>
                </div>
            </form>

            <section>
                <div className="row justify-between mb-2">
                    <h3 className="card-title">Remarks</h3>
                    <span className="badge">{(tender.tender_remarks || []).length}</span>
                </div>
                <RemarksThread
                    remarks={tender.tender_remarks}
                    memberships={memberships}
                    projectId={tender.project}
                    target={{ tenders: tender.id }}
                    onAdded={refresh}
                    placeholder="Committee decisions, clarifications, bidder queries…"
                />
            </section>

            <dl className="mod-meta">
                <div><dt>Created</dt><dd title={formatDateTime(tender.created_at)}>{formatDateTime(tender.created_at)}</dd></div>
                <div><dt>Last updated</dt><dd title={formatDateTime(lastActivity(tender, tender.tender_remarks))}>{timeAgo(lastActivity(tender, tender.tender_remarks))}</dd></div>
            </dl>
        </div>
    );
};

export default TenderDetail;

import React, { useState } from 'react';
import { FaLink, FaPlus, FaTrash, FaPen, FaPaperPlane, FaRedo, FaChevronDown, FaChevronUp, FaKey } from 'react-icons/fa';
import { webhookService } from '../../api/services';
import { useToast, useConfirm } from '../../context/ToastContext';
import { Loader, EmptyState, Modal, Field } from '../UI';
import { SettingsSection } from './shared';
import { useAsyncData } from './hooks';
import { timeAgo, formatDateTime } from '../../utils/format';

const randomKey = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');

const statusTone = (s) => (s >= 200 && s < 300 ? 'badge-success' : s >= 400 || s === 0 ? 'badge-error' : 'badge-warning');

const WebhookModal = ({ initial, onClose, onSave }) => {
    const [form, setForm] = useState(() => ({ name: initial?.name || '', url: initial?.url || '', key: initial?.key || randomKey() }));
    const [busy, setBusy] = useState(false);
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        try { await onSave(form); } finally { setBusy(false); }
    };
    return (
        <Modal
            isOpen
            onClose={onClose}
            title={initial ? `Edit “${initial.name}”` : 'New webhook'}
            footer={(
                <>
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" type="submit" form="webhook-form" disabled={busy || !form.name.trim() || !form.url.trim() || !form.key.trim()}>
                        {busy ? <span className="spinner spinner-sm" /> : 'Save webhook'}
                    </button>
                </>
            )}
        >
            <form id="webhook-form" onSubmit={submit}>
                <Field label="Name"><input className="form-input" value={form.name} onChange={set('name')} required autoFocus /></Field>
                <Field label="Payload URL" hint="Receives a POST with a JSON body for every change. Local/private network addresses are rejected by the server.">
                    <input className="form-input" type="url" value={form.url} onChange={set('url')} placeholder="https://example.com/hooks/taiga" required />
                </Field>
                <Field label="Secret key" hint="Used to sign payloads (X-TAIGA-WEBHOOK-SIGNATURE header).">
                    <div className="row">
                        <input className="form-input mono" value={form.key} onChange={set('key')} required />
                        <button type="button" className="btn btn-secondary" onClick={() => setForm((f) => ({ ...f, key: randomKey() }))} aria-label="Generate a new key"><FaKey /></button>
                    </div>
                </Field>
            </form>
        </Modal>
    );
};

const WebhookLogs = ({ webhookId, version }) => {
    const toast = useToast();
    const { data, loading, error, reload } = useAsyncData(() => webhookService.listLogs(webhookId).then((r) => r.data), [webhookId, version]);
    const [busy, setBusy] = useState(null);

    const resend = async (log) => {
        setBusy(log.id);
        try {
            const res = await webhookService.resendLog(log.id);
            const st = res.data?.status;
            if (st >= 200 && st < 300) toast.success(`Resent — responded ${st}`);
            else toast.warning(`Resent — endpoint responded ${st || 'with an error'}`);
            reload();
        } catch (err) {
            toast.error(err);
        } finally {
            setBusy(null);
        }
    };

    if (loading) return <div className="webhook-logs"><span className="spinner spinner-sm" /></div>;
    if (error) return <div className="webhook-logs text-sm text-error">Could not load delivery log.</div>;
    const logs = (data || []).slice(0, 10);
    return (
        <div className="webhook-logs">
            <div className="settings-subhead">Recent deliveries</div>
            {logs.length === 0 ? <p className="text-sm text-muted">No deliveries yet — use “Test” to send a ping.</p> : logs.map((log) => (
                <div key={log.id} className="log-row">
                    <span className={`badge ${statusTone(log.status)}`}>{log.status || 'ERR'}</span>
                    <span className="truncate text-secondary" title={formatDateTime(log.created)}>
                        {log.request_data?.action || 'event'} {log.request_data?.type || ''} · {timeAgo(log.created)}
                    </span>
                    <span className="text-xs text-muted tabular">{log.duration ? `${Number(log.duration).toFixed(2)}s` : ''}</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => resend(log)} disabled={busy === log.id} aria-label="Resend this delivery">
                        {busy === log.id ? <span className="spinner spinner-sm" /> : <><FaRedo /> Resend</>}
                    </button>
                </div>
            ))}
        </div>
    );
};

const IntegrationsSettings = ({ project, canEdit }) => {
    const toast = useToast();
    const confirm = useConfirm();
    const { data, loading, error, reload } = useAsyncData(() => webhookService.list({ project: project.id }).then((r) => r.data), [project.id]);
    const [editing, setEditing] = useState(null);
    const [open, setOpen] = useState({});
    const [testing, setTesting] = useState(null);
    const [logVersion, setLogVersion] = useState(0);

    const save = async (form) => {
        try {
            if (editing === 'new') await webhookService.create({ ...form, project: project.id });
            else await webhookService.update(editing.id, form);
            toast.success(`Webhook “${form.name}” saved`);
            setEditing(null);
            reload();
        } catch (err) {
            toast.error(err);
        }
    };

    const remove = async (w) => {
        if (!(await confirm({ title: `Delete webhook “${w.name}”?`, message: 'Deliveries to this URL stop immediately.', confirmText: 'Delete', danger: true }))) return;
        try {
            await webhookService.delete(w.id);
            toast.success('Webhook deleted');
            reload();
        } catch (err) {
            toast.error(err);
        }
    };

    const test = async (w) => {
        setTesting(w.id);
        try {
            const res = await webhookService.test(w.id);
            const st = res.data?.status;
            if (st >= 200 && st < 300) toast.success(`Test delivered — endpoint responded ${st}`);
            else toast.warning(`Test sent — endpoint responded ${st || 'with a connection error'}`);
            setOpen((o) => ({ ...o, [w.id]: true }));
            setLogVersion((v) => v + 1);
            reload();
        } catch (err) {
            toast.error(err);
        } finally {
            setTesting(null);
        }
    };

    return (
        <SettingsSection
            icon={<FaLink />}
            title="Webhooks"
            description="Notify external services (chat, CI, ERP) whenever something changes in this project."
            actions={canEdit && <button className="btn btn-primary btn-sm" onClick={() => setEditing('new')}><FaPlus /> Add webhook</button>}
        >
            {loading ? <Loader label="Loading webhooks…" /> : error ? (
                <div className="alert alert-error">Could not load webhooks.</div>
            ) : (data || []).length === 0 ? (
                <EmptyState icon={<FaLink />} title="No webhooks" description="Add a webhook to push project events to another system." />
            ) : (
                data.map((w) => (
                    <div key={w.id} className="webhook-item">
                        <div className="webhook-head">
                            <div className="flex-1" style={{ minWidth: 0 }}>
                                <div className="font-semibold text-heading">{w.name}</div>
                                <div className="text-xs text-muted truncate mono">{w.url}</div>
                            </div>
                            <span className="badge">{w.logs_counter ?? 0} deliveries</span>
                            {canEdit && (
                                <>
                                    <button className="btn btn-secondary btn-sm" onClick={() => test(w)} disabled={testing === w.id}>
                                        {testing === w.id ? <span className="spinner spinner-sm" /> : <><FaPaperPlane /> Test</>}
                                    </button>
                                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditing(w)} aria-label={`Edit ${w.name}`}><FaPen /></button>
                                    <button className="btn btn-danger-ghost btn-sm btn-icon" onClick={() => remove(w)} aria-label={`Delete ${w.name}`}><FaTrash /></button>
                                </>
                            )}
                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setOpen((o) => ({ ...o, [w.id]: !o[w.id] }))} aria-expanded={!!open[w.id]} aria-label="Toggle delivery log">
                                {open[w.id] ? <FaChevronUp /> : <FaChevronDown />}
                            </button>
                        </div>
                        {open[w.id] && <WebhookLogs webhookId={w.id} version={logVersion} />}
                    </div>
                ))
            )}
            {editing && <WebhookModal initial={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSave={save} />}
        </SettingsSection>
    );
};

export default IntegrationsSettings;

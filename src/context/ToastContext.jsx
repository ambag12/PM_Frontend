import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimesCircle, FaTimes } from 'react-icons/fa';
import Modal from '../components/UI/Modal';
import { getErrorMessage } from '../api/client';

/*
 * Usage:
 *   const toast = useToast();
 *   toast.success('Saved');  toast.error(err)  // err may be an axios error or a string
 *   const confirm = useConfirm();
 *   if (await confirm({ title: 'Delete story?', message: '…', confirmText: 'Delete', danger: true })) { … }
 */

const ToastContext = createContext(null);
const ConfirmContext = createContext(null);

const ICONS = {
    success: <FaCheckCircle />,
    error: <FaTimesCircle />,
    warning: <FaExclamationTriangle />,
    info: <FaInfoCircle />,
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const idRef = useRef(0);
    const [confirmState, setConfirmState] = useState(null);

    const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

    const push = useCallback((type, message, timeout = 4000) => {
        const id = ++idRef.current;
        const text = typeof message === 'string' ? message : getErrorMessage(message);
        setToasts((t) => [...t.slice(-4), { id, type, text }]);
        if (timeout) setTimeout(() => dismiss(id), timeout);
        return id;
    }, [dismiss]);

    const api = useMemo(() => ({
        success: (m, t) => push('success', m, t),
        error: (m, t) => push('error', m, t ?? 6000),
        warning: (m, t) => push('warning', m, t),
        info: (m, t) => push('info', m, t),
        dismiss,
    }), [push, dismiss]);

    const confirm = useCallback((opts) => new Promise((resolve) => {
        setConfirmState({ ...opts, resolve });
    }), []);

    const closeConfirm = (result) => {
        confirmState?.resolve(result);
        setConfirmState(null);
    };

    return (
        <ToastContext.Provider value={api}>
            <ConfirmContext.Provider value={confirm}>
                {children}
                <div className="toast-container" role="status" aria-live="polite">
                    {toasts.map((t) => (
                        <div key={t.id} className={`toast toast-${t.type}`}>
                            {ICONS[t.type]}
                            <div className="flex-1">{t.text}</div>
                            <button className="modal-close" style={{ width: 22, height: 22 }} onClick={() => dismiss(t.id)} aria-label="Dismiss">
                                <FaTimes size={11} />
                            </button>
                        </div>
                    ))}
                </div>
                <Modal
                    isOpen={!!confirmState}
                    onClose={() => closeConfirm(false)}
                    title={confirmState?.title || 'Are you sure?'}
                    size="sm"
                    footer={(
                        <>
                            <button className="btn btn-secondary" onClick={() => closeConfirm(false)}>
                                {confirmState?.cancelText || 'Cancel'}
                            </button>
                            <button
                                className={`btn ${confirmState?.danger ? 'btn-danger' : 'btn-primary'}`}
                                onClick={() => closeConfirm(true)}
                                autoFocus
                            >
                                {confirmState?.confirmText || 'Confirm'}
                            </button>
                        </>
                    )}
                >
                    <p className="text-secondary">{confirmState?.message}</p>
                </Modal>
            </ConfirmContext.Provider>
        </ToastContext.Provider>
    );
};

export const useToast = () => useContext(ToastContext);
export const useConfirm = () => useContext(ConfirmContext);

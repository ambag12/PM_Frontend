import React from 'react';
import { FaCheck, FaPause, FaPlay } from 'react-icons/fa';
import { TENDER_STATUSES } from '../../api/services';
import { TENDER_FLOW, tenderStatusMeta } from './moduleUtils';

export const TenderStatusPill = ({ status }) => {
    const meta = tenderStatusMeta(status);
    return <span className={`status-pill mod-pill tone-${meta.tone}`}>{meta.label}</span>;
};

/*
 * Procurement stepper: Not started → Pending → In progress → Completed, with "On hold" as a side state.
 * Clicking a step moves the tender to that status (when onChange is given).
 */
export const TenderStepper = ({ status, onChange, disabled }) => {
    const onHold = status === 'on_hold';
    const current = TENDER_FLOW.indexOf(status);
    const label = (v) => TENDER_STATUSES.find((s) => s.value === v)?.label || v;

    return (
        <div className="tender-stepper-wrap">
            <ol className={`tender-stepper ${onHold ? 'is-held' : ''}`} aria-label="Tender progress">
                {TENDER_FLOW.map((step, i) => {
                    const state = i < current ? 'done' : i === current ? 'current' : 'todo';
                    const meta = tenderStatusMeta(step);
                    return (
                        <li key={step} className={`tender-step is-${state} tone-${meta.tone}`}>
                            <button
                                type="button"
                                className="tender-step-btn"
                                onClick={() => onChange?.(step)}
                                disabled={disabled || !onChange || step === status}
                                aria-current={state === 'current' ? 'step' : undefined}
                                title={onChange && step !== status ? `Move to "${label(step)}"` : label(step)}
                            >
                                <span className="tender-step-dot">{state === 'done' ? <FaCheck size={10} /> : i + 1}</span>
                                <span className="tender-step-label">{label(step)}</span>
                            </button>
                        </li>
                    );
                })}
            </ol>
            {onChange && (
                <div className="row mt-3">
                    {onHold ? (
                        <>
                            <span className="badge badge-error"><FaPause size={9} /> On hold</span>
                            <span className="text-xs text-muted">Pick a step above to resume, or</span>
                            <button type="button" className="btn btn-ghost btn-sm" disabled={disabled} onClick={() => onChange('in_progress')}>
                                <FaPlay size={10} /> Resume in progress
                            </button>
                        </>
                    ) : (
                        <button type="button" className="btn btn-ghost btn-sm" disabled={disabled} onClick={() => onChange('on_hold')}>
                            <FaPause size={10} /> Put on hold
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

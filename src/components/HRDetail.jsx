import React from 'react';
import { FaExternalLinkAlt, FaFileAlt, FaInfoCircle } from 'react-icons/fa';
import { hrService } from '../api/services';
import { formatDate, formatDateTime, percent, timeAgo } from '../utils/format';
import { Drawer, Ring } from './UI';
import RemarksThread from './modules/RemarksThread';
import StaffingBar from './modules/StaffingBar';
import { useMemberships } from './modules/hooks';
import { lastActivity } from './modules/moduleUtils';
import '../styles/modules.css';

const num = (v) => Number(v) || 0;

/*
 * HR record drawer: staffing figures, details, document link and remarks.
 * HR records are read-only after creation (the backend has no update/delete endpoint).
 */
const HRDetail = ({ hr, isOpen, onClose, onUpdated, showProject }) => {
    if (!hr) return null;
    return (
        <Drawer
            isOpen={isOpen}
            onClose={onClose}
            width={680}
            subtitle={(
                <span className="row gap-2">
                    <span className="ref">HR-{String(hr.id).padStart(3, '0')}</span>
                    {showProject && hr._project?.name && <span>· {hr._project.name}</span>}
                </span>
            )}
            title={(
                <div className="row flex-wrap gap-2">
                    <h2 className="text-xl font-bold">{hr.hr_name || 'Untitled record'}</h2>
                    {hr.ppps && <span className="badge badge-primary mono">{hr.ppps}</span>}
                </div>
            )}
        >
            <HRDetailBody key={hr.id} hr={hr} onUpdated={onUpdated} />
        </Drawer>
    );
};

const HRDetailBody = ({ hr, onUpdated }) => {
    const memberships = useMemberships(hr.project);
    const posts = num(hr.no_of_posts);
    const filled = num(hr.filled);
    const vacant = num(hr.vacancy);
    const gap = posts - filled - vacant;
    const rate = percent(filled, posts);

    const refresh = async () => {
        try {
            const res = await hrService.get(hr.id);
            const d = res?.data?.data ?? res?.data;
            const fresh = Array.isArray(d) ? d[0] : d;
            if (fresh) onUpdated?.(fresh);
        } catch {
            /* keep the previous copy */
        }
    };

    return (
        <div className="stack mod-detail">
            <section className="card mod-hr-summary">
                <Ring value={rate} size={88} tone={rate >= 85 ? 'success' : rate >= 60 ? 'primary' : 'warning'} label={`${rate}%`} />
                <div className="flex-1">
                    <div className="mod-hr-figures is-detail">
                        <div><span className="mod-fig">{posts}</span><span className="mod-fig-label">Sanctioned</span></div>
                        <div className="is-filled"><span className="mod-fig">{filled}</span><span className="mod-fig-label">Filled</span></div>
                        <div className="is-vacant"><span className="mod-fig">{vacant}</span><span className="mod-fig-label">Vacant</span></div>
                    </div>
                    <StaffingBar posts={posts} filled={filled} vacant={vacant} size="lg" />
                    {gap !== 0 && (
                        <div className={`text-xs mt-2 ${gap < 0 ? 'text-error' : 'text-muted'}`}>
                            {gap > 0
                                ? `${gap} post${gap === 1 ? '' : 's'} not accounted for as filled or vacant.`
                                : `Filled + vacant exceeds sanctioned posts by ${Math.abs(gap)}.`}
                        </div>
                    )}
                </div>
            </section>

            <section>
                <dl className="mod-fields">
                    <div><dt>Position</dt><dd>{hr.position || '—'}</dd></div>
                    <div><dt>Pay scale (PPPS / BPS)</dt><dd>{hr.ppps || '—'}</dd></div>
                    <div><dt>Period</dt><dd>{hr.get_year_per_title || '—'}</dd></div>
                    <div><dt>Start date</dt><dd>{formatDate(hr.created_date)}</dd></div>
                    <div><dt>Finish date</dt><dd>{hr.finish_date ? formatDate(hr.finish_date) : 'Ongoing'}</dd></div>
                    <div>
                        <dt>Document</dt>
                        <dd>
                            {hr.file_url ? (
                                <a href={hr.file_url} target="_blank" rel="noreferrer" className="mod-doc-link">
                                    <FaFileAlt size={12} /> {hr.filename || 'Open document'} <FaExternalLinkAlt size={9} />
                                </a>
                            ) : (
                                <span className="text-muted">{hr.filename ? `${hr.filename} (not uploaded)` : 'No document'}</span>
                            )}
                        </dd>
                    </div>
                </dl>
                <p className="mod-note"><FaInfoCircle aria-hidden="true" /> Staffing records can&apos;t be edited after creation. Log recruitment progress and changes as remarks below.</p>
            </section>

            <section>
                <div className="row justify-between mb-2">
                    <h3 className="card-title">Remarks</h3>
                    <span className="badge">{(hr.hr_remarks || []).length}</span>
                </div>
                <RemarksThread
                    remarks={hr.hr_remarks}
                    memberships={memberships}
                    projectId={hr.project}
                    target={{ hr: hr.id }}
                    onAdded={refresh}
                    placeholder="Recruitment updates, approvals, transfers…"
                />
            </section>

            {(hr.hr_remarks || []).length > 0 && (
                <dl className="mod-meta">
                    <div><dt>Last remark</dt><dd title={formatDateTime(lastActivity(null, hr.hr_remarks))}>{timeAgo(lastActivity(null, hr.hr_remarks))}</dd></div>
                </dl>
            )}
        </div>
    );
};

export default HRDetail;

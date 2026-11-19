import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FaSearch, FaListUl, FaTasks, FaBug, FaLayerGroup, FaBook, FaTimes, FaChevronRight } from 'react-icons/fa';
import { useProject } from '../context/ProjectContext';
import { searchService } from '../api/services';
import { PageHeader, EmptyState, StatusPill } from '../components/UI';
import { SkeletonRows } from '../components/overview/OverviewParts';
import useAsync from '../components/overview/useAsync';
import { getErrorMessage } from '../api/client';
import { byId } from '../utils/format';
import '../styles/overview.css';

const GROUPS = [
    { key: 'userstories', label: 'User stories', icon: <FaListUl />, tone: 'primary', path: 'backlog', statuses: 'us_statuses' },
    { key: 'tasks', label: 'Tasks', icon: <FaTasks />, tone: 'info', path: 'backlog', statuses: 'task_statuses' },
    { key: 'issues', label: 'Issues', icon: <FaBug />, tone: 'danger', path: 'issues', statuses: 'issue_statuses' },
    { key: 'epics', label: 'Epics', icon: <FaLayerGroup />, tone: 'accent', path: 'epics', statuses: 'epic_statuses' },
    { key: 'wikipages', label: 'Wiki pages', icon: <FaBook />, tone: 'neutral', path: 'wiki' },
];

// Highlight the query inside a result title
const Highlight = ({ text = '', query }) => {
    const q = query.trim();
    if (!q) return text;
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return text;
    return <>{text.slice(0, i)}<mark>{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
};

const resultLink = (projectId, group, item) => (group.key === 'wikipages'
    ? `/project/${projectId}/wiki?page=${encodeURIComponent(item.slug)}`
    : `/project/${projectId}/${group.path}?ref=${item.ref}`);

const ProjectSearch = () => {
    const { project, projectId } = useProject();
    const [params, setParams] = useSearchParams();
    const q = (params.get('q') || '').trim();
    const [text, setText] = useState(params.get('q') || '');
    const [synced, setSynced] = useState(q);

    // Keep the input in sync when the URL changes (e.g. a new search from the top bar)
    if (q !== synced) {
        setSynced(q);
        setText(params.get('q') || '');
    }

    // Debounce typing into the URL
    useEffect(() => {
        const t = setTimeout(() => {
            if (text.trim() === q) return;
            const next = new URLSearchParams(params);
            if (text.trim()) next.set('q', text.trim()); else next.delete('q');
            setParams(next, { replace: true });
        }, 350);
        return () => clearTimeout(t);
    }, [text, q, params, setParams]);

    const resultsQ = useAsync(
        () => (q.length >= 1 ? searchService.search(projectId, q).then((r) => r.data) : Promise.resolve(null)),
        [projectId, q],
    );
    const results = resultsQ.data;
    const total = results ? GROUPS.reduce((n, g) => n + (results[g.key] || []).length, 0) : 0;

    const submit = (e) => {
        e.preventDefault();
        const next = new URLSearchParams(params);
        if (text.trim()) next.set('q', text.trim()); else next.delete('q');
        setParams(next, { replace: true });
    };

    return (
        <>
            <PageHeader
                icon={<FaSearch />}
                title="Search"
                subtitle={project ? `Find stories, tasks, issues, epics and wiki pages in ${project.name}.` : 'Search this project'}
            />

            <form className="ov-search-hero" onSubmit={submit} role="search">
                <div className="form-input-icon">
                    <FaSearch size={14} />
                    <input
                        className="form-input"
                        type="text"
                        enterKeyHint="search"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Search by title, reference number or content…"
                        aria-label="Search this project"
                        autoFocus
                    />
                </div>
                {text && <button type="button" className="btn btn-ghost btn-icon" onClick={() => setText('')} aria-label="Clear search"><FaTimes /></button>}
                <button type="submit" className="btn btn-primary btn-lg">Search</button>
            </form>

            {!q && (
                <div className="card">
                    <EmptyState icon={<FaSearch />} title="Search this project" description="Type a word from a title, a reference number like 12, or text from a wiki page." />
                </div>
            )}

            {q && resultsQ.loading && <div className="card"><SkeletonRows rows={6} height={22} /></div>}
            {q && resultsQ.error && (
                <div className="alert alert-error">{getErrorMessage(resultsQ.error, 'Search failed.')}</div>
            )}

            {q && results && total === 0 && (
                <div className="card">
                    <EmptyState icon={<FaSearch />} title={`No results for “${q}”`} description="Check the spelling or try a shorter, more general term." />
                </div>
            )}

            {q && results && total > 0 && (
                <>
                    <div className="ov-result-nav" aria-label="Result groups">
                        <span className="text-sm text-secondary" style={{ alignSelf: 'center', marginRight: '0.25rem' }}>
                            {total} result{total === 1 ? '' : 's'} for <strong className="text-heading">“{q}”</strong>
                        </span>
                        {GROUPS.filter((g) => (results[g.key] || []).length).map((g) => (
                            <a key={g.key} href={`#results-${g.key}`} className={`ov-filter-chip tone-${g.tone}`}>
                                {g.icon} {g.label} <span className="ov-chip-count">{results[g.key].length}</span>
                            </a>
                        ))}
                    </div>
                    <div className="stack">
                        {GROUPS.filter((g) => (results[g.key] || []).length).map((g) => (
                            <section key={g.key} id={`results-${g.key}`} className="card flush" aria-labelledby={`results-${g.key}-title`}>
                                <div className="card-header">
                                    <h2 className="card-title row" id={`results-${g.key}-title`}>
                                        <span className={`ov-work-icon tone-${g.tone}`}>{g.icon}</span> {g.label}
                                    </h2>
                                    <span className="badge">{results[g.key].length}</span>
                                </div>
                                <div>
                                    {results[g.key].map((item) => {
                                        const status = g.statuses ? byId(project?.[g.statuses], item.status) : null;
                                        return (
                                            <Link key={item.id} to={resultLink(projectId, g, item)} className="ov-result-row">
                                                {item.ref && <span className="ref">#{item.ref}</span>}
                                                <span className="flex-1" style={{ minWidth: 0 }}>
                                                    <span className="ov-work-title block"><Highlight text={item.subject || item.slug} query={q} /></span>
                                                    {item.milestone_name && <span className="ov-work-sub">{item.milestone_name}</span>}
                                                </span>
                                                {status && <StatusPill status={status} />}
                                                <FaChevronRight className="text-muted" size={11} aria-hidden="true" />
                                            </Link>
                                        );
                                    })}
                                </div>
                            </section>
                        ))}
                    </div>
                </>
            )}
        </>
    );
};

export default ProjectSearch;

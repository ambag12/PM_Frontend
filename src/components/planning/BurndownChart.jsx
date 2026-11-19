import React, { useEffect, useMemo, useRef, useState } from 'react';
import { fmtPoints, shortDate, toISODate } from './utils';

/*
 * BurndownChart — sprint burndown from milestoneService.getStats().days
 *   days: [{ day: 'YYYY-MM-DD', open_points, optimal_points }]
 * Remaining (actual) = --chart-1 solid line + markers; Ideal = --chart-2 dashed line.
 * Identity never relies on colour alone: dashed vs solid, legend, direct end labels, data table.
 */
const H = 240;
const PAD = { top: 18, right: 64, bottom: 34, left: 42 };

const niceMax = (v) => {
    if (v <= 0) return 1;
    const pow = 10 ** Math.floor(Math.log10(v));
    const n = v / pow;
    const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
    return step * pow;
};

const BurndownChart = ({ days = [] }) => {
    const [hover, setHover] = useState(null);
    const plotRef = useRef(null);
    const [W, setW] = useState(640);
    const hasData = days.length > 0;
    // Draw at the real pixel width so text and strokes keep their size.
    useEffect(() => {
        const el = plotRef.current;
        if (!el || typeof ResizeObserver === 'undefined') return undefined;
        const ro = new ResizeObserver((entries) => {
            const w = Math.round(entries[0].contentRect.width);
            if (w > 0) setW(Math.max(280, w));
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, [hasData]);
    const today = toISODate(new Date());

    const model = useMemo(() => {
        if (!days.length) return null;
        const maxV = niceMax(Math.max(...days.map((d) => Math.max(Number(d.optimal_points) || 0, Number(d.open_points) || 0))));
        const iw = W - PAD.left - PAD.right;
        const ih = H - PAD.top - PAD.bottom;
        const x = (i) => PAD.left + (days.length === 1 ? iw / 2 : (i / (days.length - 1)) * iw);
        const y = (v) => PAD.top + ih - (Math.max(0, Number(v) || 0) / maxV) * ih;
        const actualDays = days.map((d, i) => ({ ...d, i })).filter((d) => d.day <= today && d.open_points !== null && d.open_points !== undefined);
        const line = (pts) => pts.map((p, k) => `${k ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
        const ideal = line(days.map((d, i) => [x(i), y(d.optimal_points)]));
        const actual = line(actualDays.map((d) => [x(d.i), y(d.open_points)]));
        const area = actualDays.length > 1
            ? `${actual} L${x(actualDays[actualDays.length - 1].i).toFixed(1)},${y(0)} L${x(actualDays[0].i).toFixed(1)},${y(0)} Z`
            : '';
        const ticks = [0, maxV / 2, maxV];
        const labelEvery = Math.max(1, Math.ceil(days.length / Math.max(2, Math.floor(iw / 80))));
        const todayIdx = days.findIndex((d) => d.day === today);
        return { maxV, x, y, ideal, actual, area, ticks, labelEvery, actualDays, todayIdx, iw, ih };
    }, [days, today, W]);

    if (!model) {
        return <div className="pl-chart-empty">No burndown data yet — set sprint dates and estimate stories with points.</div>;
    }

    const { x, y, ideal, actual, area, ticks, labelEvery, actualDays, todayIdx } = model;
    const lastActual = actualDays[actualDays.length - 1];
    const lastIdeal = days[days.length - 1];
    const hovered = hover !== null ? days[hover] : null;
    const hoverActual = hovered && hovered.day <= today ? hovered.open_points : null;

    const onMove = (e) => {
        const svg = e.currentTarget.ownerSVGElement || e.currentTarget;
        const rect = svg.getBoundingClientRect();
        const px = ((e.clientX - rect.left) / rect.width) * W;
        const rel = (px - PAD.left) / (W - PAD.left - PAD.right);
        const i = Math.round(rel * (days.length - 1));
        setHover(Math.max(0, Math.min(days.length - 1, i)));
    };

    return (
        <div className="pl-chart">
            <div className="pl-chart-legend" aria-hidden="true">
                <span className="pl-legend-item"><span className="pl-legend-line is-actual" />Remaining points</span>
                <span className="pl-legend-item"><span className="pl-legend-line is-ideal" />Ideal burndown</span>
            </div>
            <div className="pl-chart-plot" ref={plotRef}>
                <svg viewBox={`0 0 ${W} ${H}`} className="pl-chart-svg" role="img" aria-label={`Burndown: ${fmtPoints(lastActual?.open_points)} points remaining of ${fmtPoints(days[0]?.optimal_points)}`}>
                    {ticks.map((t) => (
                        <g key={t}>
                            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="pl-grid" />
                            <text x={PAD.left - 8} y={y(t) + 4} className="pl-axis" textAnchor="end">{fmtPoints(t)}</text>
                        </g>
                    ))}
                    {days.map((d, i) => ((i % labelEvery === 0 && days.length - 1 - i >= labelEvery / 2) || i === days.length - 1) && (
                        <text key={d.day} x={x(i)} y={H - 10} className="pl-axis" textAnchor={i === 0 ? 'start' : i === days.length - 1 ? 'end' : 'middle'}>
                            {shortDate(d.day)}
                        </text>
                    ))}
                    <text x={12} y={PAD.top + model.ih / 2} className="pl-axis" textAnchor="middle" transform={`rotate(-90 12 ${PAD.top + model.ih / 2})`}>Points</text>
                    {todayIdx >= 0 && (
                        <g>
                            <line x1={x(todayIdx)} x2={x(todayIdx)} y1={PAD.top} y2={y(0)} className="pl-today" />
                            <text x={x(todayIdx)} y={PAD.top - 5} className="pl-axis" textAnchor="middle">Today</text>
                        </g>
                    )}
                    {area && <path d={area} className="pl-area" />}
                    <path d={ideal} className="pl-line-ideal" />
                    {actual && <path d={actual} className="pl-line-actual" />}
                    {actualDays.length <= 31 && actualDays.map((d) => (
                        <circle key={d.day} cx={x(d.i)} cy={y(d.open_points)} r={3.5} className="pl-dot-actual" />
                    ))}
                    {lastActual && (
                        <text x={x(lastActual.i) + 8} y={y(lastActual.open_points) - 8} className="pl-direct-label">
                            {fmtPoints(lastActual.open_points)} left
                        </text>
                    )}
                    <text x={W - PAD.right + 6} y={y(lastIdeal.optimal_points) + 4} className="pl-direct-label is-muted">Ideal</text>
                    {hovered && (
                        <g pointerEvents="none">
                            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={y(0)} className="pl-crosshair" />
                            {hoverActual !== null && hoverActual !== undefined && <circle cx={x(hover)} cy={y(hoverActual)} r={5} className="pl-dot-actual is-hover" />}
                            <circle cx={x(hover)} cy={y(hovered.optimal_points)} r={4} className="pl-dot-ideal" />
                        </g>
                    )}
                    <rect
                        x={PAD.left} y={PAD.top} width={W - PAD.left - PAD.right} height={H - PAD.top - PAD.bottom}
                        fill="transparent" onMouseMove={onMove} onMouseLeave={() => setHover(null)}
                    />
                </svg>
                {hovered && (
                    <div className="pl-tooltip" style={{ left: `${(x(hover) / W) * 100}%` }}>
                        <div className="pl-tooltip-title">{shortDate(hovered.day)}</div>
                        <div className="pl-tooltip-row"><span className="pl-legend-line is-actual" />Remaining <b>{hoverActual !== null && hoverActual !== undefined ? fmtPoints(hoverActual) : '—'}</b></div>
                        <div className="pl-tooltip-row"><span className="pl-legend-line is-ideal" />Ideal <b>{fmtPoints(hovered.optimal_points)}</b></div>
                    </div>
                )}
            </div>
            <details className="pl-chart-table">
                <summary>View data table</summary>
                <div className="table-wrap mt-2">
                    <table className="data-table">
                        <thead><tr><th>Day</th><th>Remaining</th><th>Ideal</th></tr></thead>
                        <tbody>
                            {days.map((d) => (
                                <tr key={d.day}>
                                    <td>{shortDate(d.day)}</td>
                                    <td className="tabular">{d.day <= today ? fmtPoints(d.open_points) : '—'}</td>
                                    <td className="tabular">{fmtPoints(d.optimal_points)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </details>
        </div>
    );
};

export default BurndownChart;

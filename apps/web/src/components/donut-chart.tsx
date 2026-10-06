'use client';

import { useState } from 'react';

export type DonutSlice = { key: string; label: string; value: number; color: string };

const SIZE = 168;
const R = 78;
const INNER = 50;
const C = SIZE / 2;

function point(radius: number, angle: number) {
  return [C + radius * Math.sin(angle), C - radius * Math.cos(angle)];
}

function arcPath(start: number, end: number) {
  const large = end - start > Math.PI ? 1 : 0;
  const [x1, y1] = point(R, start);
  const [x2, y2] = point(R, end);
  const [x3, y3] = point(INNER, end);
  const [x4, y4] = point(INNER, start);
  return `M${x1} ${y1}A${R} ${R} 0 ${large} 1 ${x2} ${y2}L${x3} ${y3}A${INNER} ${INNER} 0 ${large} 0 ${x4} ${y4}Z`;
}

const pct = (value: number, total: number) => (total ? Math.round((value / total) * 100) : 0);

export function DonutChart({ slices, label }: { slices: DonutSlice[]; label: string }) {
  const [active, setActive] = useState<string | null>(null);
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const visible = slices.filter((s) => s.value > 0);
  const focus = slices.find((s) => s.key === active && s.value > 0);

  let angle = 0;
  const arcs = visible.map((s) => {
    const start = angle;
    angle += (s.value / total) * Math.PI * 2;
    return { ...s, start, end: angle };
  });

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} role="img" aria-label={label}>
          {total === 0 ? (
            <circle cx={C} cy={C} r={(R + INNER) / 2} fill="none" stroke="#f1f5f9" strokeWidth={R - INNER} />
          ) : arcs.length === 1 ? (
            <circle
              cx={C}
              cy={C}
              r={(R + INNER) / 2}
              fill="none"
              stroke={arcs[0].color}
              strokeWidth={R - INNER}
              onMouseEnter={() => setActive(arcs[0].key)}
              onMouseLeave={() => setActive(null)}
            />
          ) : (
            arcs.map((a) => (
              <path
                key={a.key}
                d={arcPath(a.start, a.end)}
                fill={a.color}
                stroke="#ffffff"
                strokeWidth={2}
                strokeLinejoin="round"
                className="cursor-pointer transition-opacity"
                opacity={active && active !== a.key ? 0.35 : 1}
                onMouseEnter={() => setActive(a.key)}
                onMouseLeave={() => setActive(null)}
              >
                <title>{`${a.label}: ${a.value} (${pct(a.value, total)}%)`}</title>
              </path>
            ))
          )}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-semibold text-slate-900">{focus ? focus.value : total}</span>
          <span className="max-w-[5.5rem] truncate text-xs text-slate-500">
            {focus ? `${focus.label} · ${pct(focus.value, total)}%` : 'Total'}
          </span>
        </div>
      </div>

      <ul className="w-full min-w-0 flex-1 space-y-1">
        {slices.map((s) => (
          <li
            key={s.key}
            onMouseEnter={() => s.value > 0 && setActive(s.key)}
            onMouseLeave={() => setActive(null)}
            className={`grid grid-cols-[0.625rem_1fr_auto_2.75rem] items-center gap-2.5 rounded-md px-2 py-1 text-sm ${
              active === s.key ? 'bg-slate-50' : ''
            } ${s.value === 0 ? 'opacity-50' : ''}`}
          >
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
            <span className="truncate text-slate-600">{s.label}</span>
            <span className="text-right font-medium text-slate-900">{s.value}</span>
            <span className="text-right text-xs text-slate-500">{pct(s.value, total)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

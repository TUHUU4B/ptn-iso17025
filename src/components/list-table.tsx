'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

export type Row = { href: string; cells: string[]; muted?: boolean };

/** Bảng danh sách có ô lọc nhanh (lọc trên trình duyệt). */
export function ListTable({ headers, rows }: { headers: string[]; rows: Row[] }) {
  const [q, setQ] = useState('');
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? rows.filter((r) => r.cells.some((c) => c.toLowerCase().includes(s))) : rows;
  }, [q, rows]);

  return (
    <div className="space-y-3">
      <input className="input max-w-sm" placeholder="Lọc nhanh…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="table">
          <thead>
            <tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.href} className={r.muted ? 'text-slate-400' : ''}>
                {r.cells.map((c, i) => (
                  <td key={i}>{i === 0 ? <Link className="text-navy underline" href={r.href}>{c || '(trống)'}</Link> : c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted">{shown.length} / {rows.length} dòng</p>
    </div>
  );
}

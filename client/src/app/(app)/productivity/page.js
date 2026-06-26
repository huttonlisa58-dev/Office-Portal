'use client';
import { useCallback, useEffect, useState } from 'react';
import { Activity, Download } from 'lucide-react';
import PageBanner from '@/components/PageBanner';
import Loader from '@/components/Loader';
import { EmptyState } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { productivity as api } from '@/lib/db';

const hm = (sec) => { const h = Math.floor(sec / 3600); const m = Math.round((sec % 3600) / 60); return h ? `${h}h ${m}m` : `${m}m`; };
const CAT_TONE = { Productive: 'bg-emerald-500', Communication: 'bg-sky-500', Neutral: 'bg-slate-400', Distracting: 'bg-rose-500', Uncategorized: 'bg-slate-300' };

export default function ProductivityPage() {
  const { user } = useAuth();
  const canView = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR'].includes(user?.role);
  const [start, setStart] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10); });
  const [end, setEnd] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState(null);

  const load = useCallback(async () => { setRows(null); try { setRows(await api.appUsage(start, end)); } catch { setRows([]); } }, [start, end]);
  useEffect(() => { if (canView) load(); }, [canView, load]);

  if (!canView) {
    return (
      <>
        <PageBanner icon={Activity} title="Productivity analytics" />
        <div className="card px-5 py-10 text-center text-sm text-slate-500">This report is available to HR and admins only.</div>
      </>
    );
  }

  const exportCSV = () => {
    const lines = [['Employee', 'Code', 'Total', 'Category', 'Seconds']];
    (rows || []).forEach((r) => r.categories.forEach((c) => lines.push([`${r.employee?.firstName || ''} ${r.employee?.lastName || ''}`.trim(), r.employee?.employeeId || '', r.total, c.name, c.seconds])));
    const csv = lines.map((l) => l.map((x) => `"${String(x ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = `productivity_${start}_to_${end}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageBanner icon={Activity} title="Productivity analytics" />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input type="date" className="input h-9 w-auto py-1" value={start} max={end} onChange={(e) => setStart(e.target.value)} />
        <span className="text-xs text-slate-400">to</span>
        <input type="date" className="input h-9 w-auto py-1" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
        <button onClick={exportCSV} disabled={!rows?.length} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"><Download size={15} /> Export CSV</button>
      </div>

      <p className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800/60">Aggregate application-usage time per employee, derived from logged activity. This view shows summarised time only — no screenshots or keystroke capture.</p>

      {rows === null ? <Loader /> : rows.length === 0 ? (
        <EmptyState title="No activity data" subtitle="No application-usage has been recorded for this period." />
      ) : (
        <div className="space-y-4">
          {rows.map((r) => (
            <div key={r.employeeId} className="card p-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{r.employee ? `${r.employee.firstName} ${r.employee.lastName || ''}` : '—'}<span className="ml-2 text-xs text-slate-400">{r.employee?.employeeId}</span></div>
                <div className="text-sm font-semibold tabular-nums">{hm(r.total)}</div>
              </div>
              <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                {r.categories.map((c) => <div key={c.name} className={CAT_TONE[c.name] || 'bg-slate-300'} style={{ width: `${(c.seconds / r.total) * 100}%` }} title={`${c.name}: ${hm(c.seconds)}`} />)}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                {r.categories.map((c) => <span key={c.name} className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${CAT_TONE[c.name] || 'bg-slate-300'}`} />{c.name} · {hm(c.seconds)}</span>)}
              </div>
              {r.topApps.length > 0 && (
                <div className="mt-3 border-t pt-2 text-xs text-slate-500 dark:border-slate-700">
                  Top apps: {r.topApps.map((a) => `${a.name} (${hm(a.seconds)})`).join(' · ')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

'use client';
import { useCallback, useEffect, useState } from 'react';
import { Clock, Coffee, Monitor } from 'lucide-react';
import { punch, computeDay, WORK_TARGET_MS, BREAK_TARGET_MS } from '@/lib/db';

const hms = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${ss}`;
};
const hm = (ms) => {
  const mins = Math.max(0, Math.floor(ms / 60000));
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};
const time = (d) => d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

export default function CheckInOutCard({ employeeId }) {
  const [punches, setPunches] = useState([]);
  const [now, setNow] = useState(Date.now());

  const refresh = useCallback(async () => {
    if (!employeeId) return;
    try { setPunches(await punch.today(employeeId)); } catch { /* ignore */ }
  }, [employeeId]);
  useEffect(() => { refresh(); }, [refresh]);

  const day = computeDay(punches, now);
  useEffect(() => {
    if (!day.open) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [day.open]);

  if (!employeeId) return null;

  const workPct = Math.min(100, (day.workMs / WORK_TARGET_MS) * 100);
  const breakPct = Math.min(100, (day.breakMs / BREAK_TARGET_MS) * 100);
  const workLeft = Math.max(0, WORK_TARGET_MS - day.workMs);
  const status = day.open ? 'Working' : (day.count > 0 ? 'On break / Checked out' : 'Not started');
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="card mb-5 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3 dark:border-slate-700">
        <div>
          <div className="text-sm font-semibold">Check-in / Check-out</div>
          <div className="text-xs text-slate-400">{today}</div>
        </div>
        <span className={`badge ${day.open ? 'bg-emerald-50 text-emerald-700' : day.count > 0 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{status}</span>
      </div>

      {/* targets */}
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <div className="rounded-xl border p-4 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium"><Clock size={15} className="text-sky-500" /> Total in-time</div>
            <div className="text-xs text-slate-400">Target 8h</div>
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums">{hms(day.workMs)}</div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
            <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${workPct}%` }} />
          </div>
          <div className="mt-1.5 text-xs text-slate-400">{workLeft > 0 ? `${hm(workLeft)} left to reach 8h` : '8h complete ✓'}</div>
        </div>

        <div className="rounded-xl border p-4 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium"><Coffee size={15} className="text-amber-500" /> Break time</div>
            <div className="text-xs text-slate-400">Allowed 1h</div>
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums">{hms(day.breakMs)}</div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
            <div className={`h-full rounded-full transition-all ${day.breakMs > BREAK_TARGET_MS ? 'bg-rose-500' : 'bg-amber-500'}`} style={{ width: `${breakPct}%` }} />
          </div>
          <div className="mt-1.5 text-xs text-slate-400">{day.breakMs > BREAK_TARGET_MS ? `${hm(day.breakMs - BREAK_TARGET_MS)} over the 1h break` : `${hm(BREAK_TARGET_MS - day.breakMs)} break remaining`}</div>
        </div>
      </div>

      {/* sessions */}
      <div className="border-t px-5 py-3 dark:border-slate-700">
        <div className="mb-2 grid grid-cols-2 text-xs font-medium text-slate-400">
          <div>Check-in</div><div>Check-out</div>
        </div>
        {day.sessions.length === 0 && <div className="py-3 text-sm text-slate-400">No punches yet today. Use the CHECK IN button in the top bar to start.</div>}
        {day.sessions.map((s, i) => (
          <div key={i} className="grid grid-cols-2 border-t py-2.5 text-sm first:border-0 dark:border-slate-700">
            <div className="flex items-center gap-2"><Monitor size={14} className="text-slate-400" /> {time(s.in)} <span className="text-xs text-slate-400">(W)</span></div>
            <div className="flex items-center gap-2">{s.out ? <><Monitor size={14} className="text-slate-400" /> {time(s.out)} <span className="text-xs text-slate-400">(W)</span></> : <span className="text-xs text-emerald-600">in progress…</span>}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

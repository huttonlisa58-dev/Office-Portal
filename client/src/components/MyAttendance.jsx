'use client';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Turtle, Hand, Flame, X, Monitor, MapPin } from 'lucide-react';
import { attendance as attApi, punch, computeDay } from '@/lib/db';
import { useAuth } from '@/context/AuthContext';
import Loader from '@/components/Loader';

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WDF = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const fmtTime = (t) => t ? new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';
const fmtDur = (m) => m ? `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}:00` : '—';
const hhmm = (ms) => { const mins = Math.max(0, Math.floor(ms / 60000)); return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`; };
const clock = (d) => d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

const CODE = {
  P: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  A: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300',
  DO: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500',
  H: 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300',
  '': 'text-slate-300',
};

function DayDetailModal({ employeeId, date, user, onClose }) {
  const [punches, setPunches] = useState([]);
  const [loading, setLoading] = useState(true);
  const isToday = date === new Date().toISOString().slice(0, 10);

  useEffect(() => {
    let on = true;
    punch.forDate(employeeId, date).then((p) => { if (on) setPunches(p); }).catch(() => {}).finally(() => { if (on) setLoading(false); });
    return () => { on = false; };
  }, [employeeId, date]);

  const nowMs = isToday ? Date.now() : (punches.length ? new Date(punches[punches.length - 1].at).getTime() : Date.now());
  const day = computeDay(punches, nowMs);
  const dObj = new Date(date + 'T00:00:00');
  const status = day.workMs > 0 ? (day.open && isToday ? 'Working' : 'Present') : (date < new Date().toISOString().slice(0, 10) ? 'Absent' : 'Pending');

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40" onClick={onClose}>
      <div className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between bg-sky-500 px-6 py-4 text-white">
          <h2 className="text-lg font-semibold">Check-in / Check-out</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-white/20"><X size={20} /></button>
        </div>

        <div className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <div><span className="text-slate-400">Name</span><div className="font-medium">{user?.name || '—'}</div></div>
            <div className="text-right"><span className="text-slate-400">Employee id</span><div className="font-medium">{user?.employeeCode || '—'}</div></div>
            <div><span className="text-slate-400">Date</span><div className="font-medium">{dObj.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</div></div>
            <div className="text-right"><span className="text-slate-400">Day</span><div className="font-medium">{WDF[dObj.getDay()]}</div></div>
            <div><span className="text-slate-400">Total in-time</span><div className="font-semibold text-sky-600">{hhmm(day.workMs)}</div></div>
            <div className="text-right"><span className="text-slate-400">Total out-time (break)</span><div className="font-semibold text-amber-600">{hhmm(day.breakMs)}</div></div>
            <div><span className="text-slate-400">Status</span><div className="font-medium">{status}</div></div>
            <div className="text-right"><span className="text-slate-400">Sessions</span><div className="font-medium">{day.sessions.length}</div></div>
          </div>

          <div className="rounded-xl border dark:border-slate-700">
            <div className="grid grid-cols-2 border-b px-4 py-2.5 text-sm font-medium text-slate-500 dark:border-slate-700">
              <div>Check-in</div><div>Check-out</div>
            </div>
            {loading ? <div className="p-6"><Loader /></div> : day.sessions.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">No check-in / check-out records for this day.</div>
            ) : day.sessions.map((s, i) => (
              <div key={i} className="grid grid-cols-2 border-b px-4 py-3 text-sm last:border-0 dark:border-slate-700">
                <div className="space-y-1">
                  <div className="flex items-center gap-2"><Monitor size={14} className="text-slate-400" /> {clock(s.in)} <span className="text-xs text-slate-400">(W)</span></div>
                  <div className="flex items-center gap-2 text-xs text-slate-400"><MapPin size={12} /> NA</div>
                </div>
                <div className="space-y-1">
                  {s.out ? (<>
                    <div className="flex items-center gap-2"><Monitor size={14} className="text-slate-400" /> {clock(s.out)} <span className="text-xs text-slate-400">(W)</span></div>
                    <div className="flex items-center gap-2 text-xs text-slate-400"><MapPin size={12} /> NA</div>
                  </>) : <span className="text-xs text-emerald-600">in progress…</span>}
                </div>
              </div>
            ))}
          </div>

          <button onClick={onClose} className="w-full rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300">Close</button>
        </div>
      </div>
    </div>
  );
}

export default function MyAttendance({ employeeId }) {
  const { user } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [data, setData] = useState(null);
  const [punchMap, setPunchMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [dayModal, setDayModal] = useState(null);

  useEffect(() => {
    if (!employeeId) { setLoading(false); return; }
    setLoading(true);
    const last = new Date(year, month + 1, 0).getDate();
    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
    Promise.all([attApi.mine(employeeId, year, month), punch.month(employeeId, start, end)])
      .then(([d, pm]) => { setData(d); setPunchMap(pm || {}); })
      .catch(() => { setData(null); setPunchMap({}); })
      .finally(() => setLoading(false));
  }, [employeeId, year, month]);

  const days = useMemo(() => new Date(Date.UTC(year, month + 1, 0)).getUTCDate(), [year, month]);
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const punchStats = useMemo(() => {
    const out = {};
    for (const [date, sessions] of Object.entries(punchMap)) {
      if (!sessions.length) continue;
      const day = computeDay(sessions, Date.now());
      const ins = sessions.filter((s) => s.type === 'IN').map((s) => s.at);
      const outs = sessions.filter((s) => s.type === 'OUT').map((s) => s.at);
      out[date] = { workMin: Math.floor(day.workMs / 60000), first: ins[0] || null, last: outs[outs.length - 1] || null };
    }
    return out;
  }, [punchMap]);

  const cells = useMemo(() => {
    const byDate = new Map();
    (data?.rows || []).forEach((r) => byDate.set(r.date, r));
    const hol = new Set(data?.holidays || []);
    const out = [];
    for (let d = 1; d <= days; d++) {
      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dow = new Date(Date.UTC(year, month, d)).getUTCDay();
      const weekend = dow === 0 || dow === 6;
      const rec = byDate.get(date);
      let code = '';
      if (hol.has(date)) code = 'H';
      else if (punchStats[date]) code = 'P';
      else if (rec && ['PRESENT', 'LATE', 'HALF_DAY'].includes(rec.status)) code = 'P';
      else if (weekend) code = 'DO';
      else if (date < todayStr) code = 'A';
      out.push({ d, date, dow, code, late: rec?.isLate, manual: rec?.checkIn?.method === 'MANUAL', ot: rec?.overtimeMinutes > 0 });
    }
    return out;
  }, [data, days, year, month, todayStr, punchStats]);

  const firstLast = useMemo(() => Object.entries(punchStats)
    .map(([date, st]) => ({ date, first: st.first, last: st.last, total: st.workMin }))
    .sort((a, b) => b.date.localeCompare(a.date)), [punchStats]);

  const go = (delta) => { let m = month + delta, y = year; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } setMonth(m); setYear(y); };

  if (!employeeId) return <div className="card p-10 text-center text-sm text-slate-400">Your account isn&apos;t linked to an employee record, so personal attendance isn&apos;t available.</div>;

  return (
    <>
      <div className="card mb-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
          <div className="font-semibold">Attendance details</div>
          <div className="flex items-center gap-2">
            <button onClick={() => go(-1)} className="btn-ghost p-1.5"><ChevronLeft size={16} /></button>
            <span className="min-w-[150px] text-center text-sm font-medium">1 {MONTHS[month].slice(0, 3)} {year} – {days} {MONTHS[month].slice(0, 3)} {year}</span>
            <button onClick={() => go(1)} className="btn-ghost p-1.5"><ChevronRight size={16} /></button>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 px-5 py-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1"><Turtle size={14} className="text-rose-500" /> Late entry</span>
          <span className="inline-flex items-center gap-1"><Hand size={14} className="text-sky-500" /> Manual entry</span>
          <span className="inline-flex items-center gap-1"><Flame size={14} className="text-orange-500" /> OT (Overtime)</span>
          <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-rose-400" /> Pending</span>
          <span className="ml-auto text-slate-400">Tip: kisi din pe click karke detail dekho</span>
        </div>
        {loading ? <Loader /> : (
          <div className="overflow-x-auto px-3 pb-4">
            <div className="flex">
              {cells.map((c) => (
                <button key={c.d} onClick={() => setDayModal(c.date)} className="min-w-[58px] border-l text-left transition hover:bg-sky-50 first:border-l-0 dark:hover:bg-slate-800">
                  <div className={`px-1 py-2 text-center ${c.dow === 0 || c.dow === 6 ? 'bg-slate-50 dark:bg-slate-800/50' : ''}`}>
                    <div className="text-[11px] font-medium text-slate-500">{WD[c.dow]}</div>
                    <div className="text-[10px] text-slate-400">{MONTHS[month].slice(0, 3)} {String(c.d).padStart(2, '0')}</div>
                  </div>
                  <div className={`grid h-12 place-items-center text-xs font-bold ${CODE[c.code] || ''}`}>
                    <div>{c.code}</div>
                    <div className="flex gap-0.5">
                      {c.late && <Turtle size={11} className="text-rose-500" />}
                      {c.manual && <Hand size={11} className="text-sky-500" />}
                      {c.ot && <Flame size={11} className="text-orange-500" />}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="border-b px-5 py-3 font-semibold">First in / Last out</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-slate-400">
              <th className="px-5 py-3 font-medium">Date</th><th className="px-5 py-3 font-medium">First in</th>
              <th className="px-5 py-3 font-medium">Last out</th><th className="px-5 py-3 font-medium">Total in-time</th>
            </tr></thead>
            <tbody>
              {firstLast.length === 0 && <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-400">No punches this month.</td></tr>}
              {firstLast.map((r) => (
                <tr key={r.date} className="border-b last:border-0">
                  <td className="px-5 py-3 font-medium">{new Date(r.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td className="px-5 py-3 text-slate-500">{fmtTime(r.first)}</td>
                  <td className="px-5 py-3 text-slate-500">{fmtTime(r.last)}</td>
                  <td className="px-5 py-3 text-slate-500">{fmtDur(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {dayModal && <DayDetailModal employeeId={employeeId} date={dayModal} user={user} onClose={() => setDayModal(null)} />}
    </>
  );
}

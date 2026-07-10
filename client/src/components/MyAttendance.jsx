'use client';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Turtle, Hand, Flame, X, Monitor, MapPin, Trash2, Plus, ChevronDown } from 'lucide-react';
import { attendance as attApi, punch, computeDay, shifts as shiftApi, attendanceReq } from '@/lib/db';
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
  PEND: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  A: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300',
  DO: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500',
  H: 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300',
  '': 'text-slate-300',
};

function buildSessions(punches) {
  const sorted = [...punches].sort((a, b) => new Date(a.at) - new Date(b.at));
  const sessions = [];
  let open = null;
  for (const p of sorted) {
    if (p.type === 'IN') { if (open) sessions.push(open); open = { inId: p._id, inAt: p.at, outId: null, outAt: null, manual: p.method === 'MANUAL' }; }
    else { if (open) { open.outId = p._id; open.outAt = p.at; if (p.method === 'MANUAL') open.manual = true; sessions.push(open); open = null; } else sessions.push({ inId: null, inAt: null, outId: p._id, outAt: p.at, manual: p.method === 'MANUAL' }); }
  }
  if (open) sessions.push(open);
  return sessions;
}

const toTimeInput = (iso) => { const d = new Date(iso); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

function AddEntryModal({ initial, onSave, onCancel, busy }) {
  const [checkIn, setCheckIn] = useState(initial?.checkIn || '');
  const [checkOut, setCheckOut] = useState(initial?.checkOut || '');
  const [remarks, setRemarks] = useState('');
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between bg-sky-500 px-5 py-3 text-white">
          <h3 className="font-semibold">Add / Edit entries</h3>
          <button onClick={onCancel} className="rounded p-1 hover:bg-white/20"><X size={18} /></button>
        </div>
        <div className="space-y-3 p-5">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Check-in <span className="text-rose-400">*</span></label><input type="time" className="input" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} /></div>
            <div><label className="label">Check-out <span className="text-rose-400">*</span></label><input type="time" className="input" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} /></div>
          </div>
          <div><label className="label">Remarks</label><input className="input" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Reason for manual entry" /></div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onCancel} className="btn-outline">Cancel</button>
            <button onClick={() => onSave({ checkIn, checkOut, remarks })} disabled={busy || !checkIn} className="btn-primary">{busy ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DayDetailModal({ employeeId, companyId, date, user, onClose, onChanged, pending }) {
  const [punches, setPunches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [shift, setShift] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [addInit, setAddInit] = useState(null); // null = closed
  const [notice, setNotice] = useState('');
  const canApprove = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'MANAGER'].includes(user?.role);
  const isToday = date === new Date().toISOString().slice(0, 10);

  const reload = useCallback(() => {
    setLoading(true);
    return punch.forDate(employeeId, date).then((p) => setPunches(p)).catch(() => {}).finally(() => setLoading(false));
  }, [employeeId, date]);
  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { shiftApi.mine(employeeId).then((r) => setShift(r.shift)).catch(() => {}); }, [employeeId]);

  const nowMs = isToday ? Date.now() : (punches.length ? new Date(punches[punches.length - 1].at).getTime() : Date.now());
  const day = computeDay(punches, nowMs);
  const sessions = useMemo(() => buildSessions(punches), [punches]);
  const dObj = new Date(date + 'T00:00:00');
  const status = pending ? 'Pending approval' : (day.workMs > 0 ? (day.open && isToday ? 'Working' : 'Present') : (date < new Date().toISOString().slice(0, 10) ? 'Absent' : 'Pending'));
  const firstIn = sessions.find((s) => s.inAt)?.inAt || null;
  const lastOut = [...sessions].reverse().find((s) => s.outAt)?.outAt || null;
  const hhmmShift = (t) => t ? String(t).slice(0, 5) : '';

  const doDelete = async (s) => {
    setBusy(true);
    try { await punch.deletePunches([s.inId, s.outId]); await reload(); onChanged?.(); }
    catch (e) { alert(e.message || 'Could not delete'); } finally { setBusy(false); }
  };
  const doAdd = async ({ checkIn, checkOut, remarks }) => {
    setBusy(true);
    try {
      if (canApprove) {
        await punch.addEntry({ companyId, employeeId, date, checkIn, checkOut, remarks });
        setAddInit(null); await reload(); onChanged?.();
      } else {
        await attendanceReq.create({ companyId, employeeId, date, checkIn, checkOut, remarks });
        setAddInit(null); setNotice('Request sent to HR / Manager. Your attendance will update once it is approved.'); onChanged?.();
      }
    } catch (e) { alert(e.message || 'Could not save'); } finally { setBusy(false); }
  };
  const openAdd = (kind) => {
    setMenuOpen(false);
    if (kind === 'full') setAddInit({ checkIn: hhmmShift(shift?.start) || '09:00', checkOut: hhmmShift(shift?.end) || '18:00' });
    else if (kind === 'half') {
      const s = hhmmShift(shift?.start) || '09:00';
      const [h, m] = s.split(':').map(Number);
      const mid = `${String((h + 4) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      setAddInit({ checkIn: s, checkOut: mid });
    } else setAddInit({ checkIn: '', checkOut: '' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40" onClick={onClose}>
      <div className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between bg-sky-500 px-6 py-4 text-white">
          <h2 className="text-lg font-semibold">Check-in / Check-out</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-white/20"><X size={20} /></button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">✓ {notice}</div>}
          {!canApprove && <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-xs text-sky-700 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200">Note: your manual entry is added to attendance only after HR / Manager approval.</div>}
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <div><span className="text-slate-400">Name</span><div className="font-medium">{user?.name || '—'}</div></div>
            <div className="text-right"><span className="text-slate-400">Employee id</span><div className="font-medium">{user?.employeeCode || '—'}</div></div>
            <div><span className="text-slate-400">Date</span><div className="font-medium">{dObj.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</div></div>
            <div className="text-right"><span className="text-slate-400">Day</span><div className="font-medium">{WDF[dObj.getDay()]}</div></div>
            <div><span className="text-slate-400">Total in-time</span><div className="font-semibold text-sky-600">{hhmm(day.workMs)}</div></div>
            <div className="text-right"><span className="text-slate-400">Total out-time (break)</span><div className="font-semibold text-amber-600">{hhmm(day.breakMs)}</div></div>
            <div><span className="text-slate-400">Status</span><div className="font-medium">{status}</div></div>
            <div className="text-right"><span className="text-slate-400">Shift</span><div className="font-medium">{shift ? `${shift.name} (${hhmmShift(shift.start)}–${hhmmShift(shift.end)})` : '—'}</div></div>
            <div><span className="text-slate-400">First in</span><div className="font-medium">{clock(firstIn)}</div></div>
            <div className="text-right"><span className="text-slate-400">Last out</span><div className="font-medium">{clock(lastOut)}</div></div>
          </div>

          <div className="rounded-xl border dark:border-slate-700">
            <div className="grid grid-cols-[1fr_1fr_auto] border-b px-4 py-2.5 text-sm font-medium text-slate-500 dark:border-slate-700">
              <div>Check-in</div><div>Check-out</div><div className="w-8" />
            </div>
            {loading ? <div className="p-6"><Loader /></div> : sessions.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">No check-in / check-out records for this day.</div>
            ) : sessions.map((s, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center border-b px-4 py-3 text-sm last:border-0 dark:border-slate-700">
                <div className="space-y-1">
                  {s.inAt ? (<>
                    <div className="flex items-center gap-2"><Monitor size={14} className="text-slate-400" /> {clock(s.inAt)} <span className="text-xs text-slate-400">(W)</span>{s.manual && <Hand size={12} className="text-sky-500" />}</div>
                    <div className="flex items-center gap-2 text-xs text-slate-400"><MapPin size={12} /> NA</div>
                  </>) : <span className="text-xs text-slate-400">—</span>}
                </div>
                <div className="space-y-1">
                  {s.outAt ? (<>
                    <div className="flex items-center gap-2"><Monitor size={14} className="text-slate-400" /> {clock(s.outAt)} <span className="text-xs text-slate-400">(W)</span></div>
                    <div className="flex items-center gap-2 text-xs text-slate-400"><MapPin size={12} /> NA</div>
                  </>) : <span className="text-xs text-emerald-600">in progress…</span>}
                </div>
                <button onClick={() => doDelete(s)} disabled={busy} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-950/40" title="Delete entry"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        </div>

        {/* footer */}
        <div className="flex items-center justify-between gap-2 border-t px-6 py-4 dark:border-slate-700">
          <div className="relative">
            <button onClick={() => setMenuOpen((o) => !o)} className="btn-primary"><Plus size={15} /> Add entries <ChevronDown size={14} /></button>
            {menuOpen && (
              <div className="absolute bottom-12 left-0 z-10 w-52 overflow-hidden rounded-xl border bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                <button onClick={() => openAdd('full')} className="block w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700/40">Add full day entry</button>
                <button onClick={() => openAdd('half')} className="block w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700/40">Add half day entry</button>
                <button onClick={() => openAdd('manual')} className="block w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700/40">Add manual entry</button>
              </div>
            )}
          </div>
          <button onClick={onClose} className="rounded-lg bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300">Close</button>
        </div>
      </div>

      {addInit && <AddEntryModal initial={addInit} busy={busy} onSave={doAdd} onCancel={() => setAddInit(null)} />}
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
  const [pendingDates, setPendingDates] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [dayModal, setDayModal] = useState(null);

  const load = useCallback(() => {
    if (!employeeId) { setLoading(false); return; }
    setLoading(true);
    const last = new Date(year, month + 1, 0).getDate();
    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
    Promise.all([attApi.mine(employeeId, year, month), punch.month(employeeId, start, end), attendanceReq.list().catch(() => [])])
      .then(([d, pm, reqs]) => {
        setData(d); setPunchMap(pm || {});
        const mine = (reqs || []).filter((r) => r.status === 'PENDING' && (!user?.employeeCode || r.employee?.employeeId === user.employeeCode) && r.date >= start && r.date <= end);
        setPendingDates(new Set(mine.map((r) => r.date)));
      })
      .catch(() => { setData(null); setPunchMap({}); setPendingDates(new Set()); })
      .finally(() => setLoading(false));
  }, [employeeId, year, month, user?.employeeCode]);
  useEffect(() => { load(); }, [load]);

  const days = useMemo(() => new Date(Date.UTC(year, month + 1, 0)).getUTCDate(), [year, month]);
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const punchStats = useMemo(() => {
    const out = {};
    for (const [date, sessions] of Object.entries(punchMap)) {
      if (!sessions.length) continue;
      const day = computeDay(sessions, Date.now());
      // First check-in and last check-out come from the PAIRED sessions, not from two
      // independent IN/OUT lists — otherwise an overnight OUT (e.g. 05:00 next day) renders
      // as "Last out" earlier than "First in", making check-out look before check-in.
      const firstIn = day.sessions.find((s) => s.in)?.in || null;
      const lastSession = [...day.sessions].reverse().find((s) => s.out) || null;
      const lastOut = lastSession?.out || null;
      // flag when the last check-out falls on a later calendar day than the row's date
      const outDate = lastOut ? (() => { const d = new Date(lastOut); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })() : null;
      const spansMidnight = outDate ? outDate > date : false;
      out[date] = {
        workMin: Math.floor(day.workMs / 60000),
        first: firstIn, last: lastOut, spansMidnight,
        manual: sessions.some((s) => s.method === 'MANUAL'),
      };
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
      else if (pendingDates.has(date)) code = 'PEND';
      else if (punchStats[date]) code = 'P';
      else if (rec && ['PRESENT', 'LATE', 'HALF_DAY'].includes(rec.status)) code = 'P';
      else if (weekend) code = 'DO';
      else if (date < todayStr) code = 'A';
      out.push({ d, date, dow, code, late: rec?.isLate, manual: punchStats[date]?.manual || rec?.checkIn?.method === 'MANUAL', ot: rec?.overtimeMinutes > 0 });
    }
    return out;
  }, [data, days, year, month, todayStr, punchStats, pendingDates]);

  const firstLast = useMemo(() => Object.entries(punchStats)
    .map(([date, st]) => ({ date, first: st.first, last: st.last, total: st.workMin, spansMidnight: st.spansMidnight }))
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
          <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-amber-400" /> Pending approval</span>
          <span className="ml-auto text-slate-400">Tip: click a day to see details</span>
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
                    <div>{c.code === 'PEND' ? <span className="text-[9px] font-semibold leading-none">Pending</span> : c.code}</div>
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
                  <td className="px-5 py-3 text-slate-500">{fmtTime(r.last)}{r.spansMidnight && <span className="ml-1 rounded bg-slate-100 px-1 text-[10px] font-medium text-slate-500 dark:bg-slate-700" title="Checked out after midnight (next day)">+1d</span>}</td>
                  <td className="px-5 py-3 text-slate-500">{fmtDur(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {dayModal && <DayDetailModal employeeId={employeeId} companyId={user?.company} date={dayModal} user={user} pending={pendingDates.has(dayModal)} onClose={() => setDayModal(null)} onChanged={load} />}
    </>
  );
}

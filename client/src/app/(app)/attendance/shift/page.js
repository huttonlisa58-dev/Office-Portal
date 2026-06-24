'use client';
import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Repeat } from 'lucide-react';
import PageBanner from '@/components/PageBanner';
import Loader from '@/components/Loader';
import Modal from '@/components/Modal';
import { StatusBadge } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { cls } from '@/lib/format';
import { shifts as shiftApi, holidays as holidayApi, shiftRequests } from '@/lib/db';

const WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const hhmm = (t) => (t ? String(t).slice(0, 5) : '');
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function MyShiftPage() {
  const { user } = useAuth();
  const employeeId = user?.employee;
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [data, setData] = useState({ shift: null, weeklyOff: 0 });
  const [holidayMap, setHolidayMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [allShifts, setAllShifts] = useState([]);
  const [myReqs, setMyReqs] = useState([]);
  const [req, setReq] = useState({ open: false, shiftId: '', reason: '', busy: false, err: '' });

  const loadReqs = () => { if (employeeId) shiftRequests.mine(employeeId).then(setMyReqs).catch(() => {}); };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([shiftApi.mine(employeeId), holidayApi.all(), shiftApi.list().catch(() => []), shiftRequests.mine(employeeId).catch(() => [])])
      .then(([r, hs, sh, mr]) => { if (!alive) return; setData(r); const m = {}; (hs || []).forEach((h) => { m[h.date] = h.name; }); setHolidayMap(m); setAllShifts(sh || []); setMyReqs(mr || []); })
      .catch(() => {}).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [employeeId]);

  const submitReq = async () => {
    if (!req.shiftId || !employeeId) { setReq((r) => ({ ...r, err: 'Pick a shift' })); return; }
    setReq((r) => ({ ...r, busy: true, err: '' }));
    try {
      await shiftRequests.create({ company_id: user?.company, employee_id: employeeId, current_shift_id: data.shift?.id || null, requested_shift_id: req.shiftId, reason: req.reason });
      setReq({ open: false, shiftId: '', reason: '', busy: false, err: '' });
      loadReqs();
    } catch (e) { setReq((r) => ({ ...r, busy: false, err: e.message || 'Failed' })); }
  };

  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay()); // back to Sunday
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const move = (delta) => setCursor((c) => { const d = new Date(c.y, c.m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const goToday = () => { const d = new Date(); setCursor({ y: d.getFullYear(), m: d.getMonth() }); };

  const [pickOpen, setPickOpen] = useState(false);
  const [pickMode, setPickMode] = useState('month');
  const [pickYear, setPickYear] = useState(() => new Date().getFullYear());
  const yearBase = pickYear - (pickYear % 12);

  const { shift, weeklyOff } = data;

  return (
    <>
      <PageBanner icon={CalendarDays} title="My shift">
        <div className="flex items-center gap-2">
          <button onClick={() => move(-1)} className="grid h-8 w-8 place-items-center rounded-lg bg-white/20 hover:bg-white/30" aria-label="Previous month"><ChevronLeft size={18} /></button>
          <div className="relative">
            <button onClick={() => { setPickYear(cursor.y); setPickMode('month'); setPickOpen((o) => !o); }} className="min-w-[120px] rounded-lg bg-white px-3 py-1.5 text-center text-sm font-semibold text-sky-700 hover:bg-sky-50">{MONTHS[cursor.m]} {cursor.y}</button>
            {pickOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setPickOpen(false)} />
                <div className="absolute left-1/2 z-40 mt-2 w-72 -translate-x-1/2 rounded-2xl border bg-white p-3 text-slate-700 shadow-xl dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <div className="mb-2 flex items-center justify-between">
                    <button onClick={() => setPickYear((y) => (pickMode === 'year' ? y - 12 : y - 1))} className="grid h-7 w-7 place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><ChevronLeft size={16} /></button>
                    <button onClick={() => setPickMode((m) => (m === 'month' ? 'year' : 'month'))} className="rounded-lg px-3 py-1 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-700">{pickMode === 'month' ? pickYear : `${yearBase} – ${yearBase + 11}`}</button>
                    <button onClick={() => setPickYear((y) => (pickMode === 'year' ? y + 12 : y + 1))} className="grid h-7 w-7 place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><ChevronRight size={16} /></button>
                  </div>
                  {pickMode === 'month' ? (
                    <div className="grid grid-cols-3 gap-1.5">
                      {MONTHS.map((mn, mi) => {
                        const isCur = cursor.y === pickYear && cursor.m === mi;
                        const isThisMonth = today.getFullYear() === pickYear && today.getMonth() === mi;
                        return <button key={mn} onClick={() => { setCursor({ y: pickYear, m: mi }); setPickOpen(false); }} className={cls('rounded-lg px-2 py-2 text-sm', isCur ? 'bg-sky-500 font-semibold text-white' : isThisMonth ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/40' : 'hover:bg-slate-100 dark:hover:bg-slate-700')}>{mn.slice(0, 3)}</button>;
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-1.5">
                      {Array.from({ length: 12 }, (_, i) => yearBase + i).map((yy) => (
                        <button key={yy} onClick={() => { setPickYear(yy); setPickMode('month'); }} className={cls('rounded-lg px-2 py-2 text-sm', yy === cursor.y ? 'bg-sky-500 font-semibold text-white' : yy === today.getFullYear() ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/40' : 'hover:bg-slate-100 dark:hover:bg-slate-700')}>{yy}</button>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 border-t pt-2 text-center dark:border-slate-700">
                    <button onClick={() => { goToday(); setPickOpen(false); }} className="text-sm font-medium text-sky-600 hover:text-sky-700">Go to today</button>
                  </div>
                </div>
              </>
            )}
          </div>
          <button onClick={() => move(1)} className="grid h-8 w-8 place-items-center rounded-lg bg-white/20 hover:bg-white/30" aria-label="Next month"><ChevronRight size={18} /></button>
          {employeeId && <button onClick={() => setReq((r) => ({ ...r, open: true, err: '' }))} className="ml-2 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-sky-700 hover:bg-sky-50"><Repeat size={14} /> Request change</button>}
        </div>
      </PageBanner>

      {loading ? <Loader /> : (
        <div className="card overflow-hidden p-0">
          {/* legend */}
          <div className="flex flex-wrap items-center gap-4 border-b px-4 py-3 text-xs text-slate-500 dark:border-slate-700">
            {shift ? (
              <span className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded" style={{ background: shift.color }} /> {shift.code} · {shift.name} ({hhmm(shift.start)}–{hhmm(shift.end)})</span>
            ) : <span>No shift assigned.</span>}
            <span className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded bg-slate-300" /> Weekly off — {WEEK[weeklyOff]}</span>
            <span className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded bg-rose-300" /> Holiday</span>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              {/* weekday header */}
              <div className="grid grid-cols-7 border-b bg-slate-50 text-center text-sm font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
                {WEEK.map((w) => <div key={w} className="px-2 py-3">{w}</div>)}
              </div>
              {/* 6 weeks */}
              {Array.from({ length: 6 }, (_, wk) => (
                <div key={wk} className="grid grid-cols-7">
                  {cells.slice(wk * 7, wk * 7 + 7).map((d, i) => {
                    const inMonth = d.getMonth() === cursor.m;
                    const isOff = d.getDay() === weeklyOff;
                    const isToday = d.getTime() === today.getTime();
                    const holiday = holidayMap[ymd(d)];
                    return (
                      <div key={i} className={`min-h-[116px] border-b border-r p-2 align-top dark:border-slate-700 ${inMonth ? '' : 'bg-slate-50/60 dark:bg-slate-900/40'}`}>
                        <div className={`mb-1 text-right text-sm ${inMonth ? 'text-slate-500' : 'text-slate-300 dark:text-slate-600'}`}>
                          <span className={isToday ? 'inline-grid h-6 w-6 place-items-center rounded-full bg-sky-500 font-semibold text-white' : ''}>{d.getDate()}</span>
                        </div>
                        {inMonth && (holiday ? (
                          <div className="grid place-items-center rounded-md bg-rose-100 px-1 py-3 text-center text-xs font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" title={holiday}>{holiday}</div>
                        ) : isOff ? (
                          <div className="grid place-items-center rounded-md bg-slate-200 py-3 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">Day off</div>
                        ) : shift ? (
                          <div className="overflow-hidden rounded-md border" style={{ borderColor: shift.color }}>
                            <div className="flex items-center gap-2 px-2 py-1 text-xs font-bold text-slate-800" style={{ background: shift.color }}>
                              <span>{shift.code}</span><span className="font-medium">{hhmm(shift.start)} - {hhmm(shift.end)}</span>
                            </div>
                            <div className="bg-white px-2 py-1 text-[11px] text-slate-600 dark:bg-slate-900 dark:text-slate-300">{shift.name}</div>
                          </div>
                        ) : null)}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {myReqs.length > 0 && (
        <div className="card mt-4 p-5">
          <div className="mb-3 font-semibold">My shift change requests</div>
          <div className="space-y-2">
            {myReqs.map((r) => (
              <div key={r._id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/60">
                <span>{r.currentShift || '—'} <span className="text-slate-400">→</span> <span className="font-medium">{r.requestedShift || '—'}</span>{r.reason ? <span className="text-slate-400"> · {r.reason}</span> : ''}</span>
                <div className="flex items-center gap-3">
                  {r.decisionNote && <span className="text-xs text-slate-400">{r.decisionNote}</span>}
                  <StatusBadge status={r.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal open={req.open} onClose={() => setReq((r) => ({ ...r, open: false }))} title="Request shift change" width="max-w-md">
        <div className="space-y-3">
          {req.err && <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{req.err}</div>}
          <div className="text-sm text-slate-500">Current shift: <span className="font-medium text-slate-700 dark:text-slate-200">{data.shift?.name || 'None'}</span></div>
          <div>
            <label className="label">Requested shift</label>
            <select className="input" value={req.shiftId} onChange={(e) => setReq((r) => ({ ...r, shiftId: e.target.value, err: '' }))}>
              <option value="">— select —</option>
              {allShifts.filter((s) => s._id !== data.shift?.id).map((s) => <option key={s._id} value={s._id}>{s.name}{s.start ? ` (${String(s.start).slice(0, 5)}–${String(s.end).slice(0, 5)})` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Reason</label>
            <textarea className="input" rows={2} value={req.reason} onChange={(e) => setReq((r) => ({ ...r, reason: e.target.value }))} placeholder="Why do you need this change?" />
          </div>
          <div className="flex justify-end gap-2 border-t pt-3 dark:border-slate-700">
            <button className="btn-outline" onClick={() => setReq((r) => ({ ...r, open: false }))}>Cancel</button>
            <button className="btn-primary disabled:opacity-60" disabled={req.busy || !req.shiftId} onClick={submitReq}>{req.busy ? 'Sending…' : 'Send request'}</button>
          </div>
        </div>
      </Modal>
    </>
  );
}

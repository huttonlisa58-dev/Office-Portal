'use client';
import { useEffect, useMemo, useState } from 'react';
import { BarChart3, CalendarCheck, CalendarDays, ChevronLeft, ChevronRight, LogIn, LogOut, ArrowLeft, Plane, Download, Users, Turtle, Wallet } from 'lucide-react';
import PageBanner from '@/components/PageBanner';
import Loader from '@/components/Loader';
import { useAuth } from '@/context/AuthContext';
import { punch, computeDay, leaves as leaveApi, attendance as attApi, payroll as payApi } from '@/lib/db';
import { money } from '@/lib/format';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmtDur = (ms) => { if (!ms) return '—'; const m = Math.floor(ms / 60000); return `${Math.floor(m / 60)}h ${pad(m % 60)}m`; };
const fmtTime = (iso) => iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
const statusBadge = (s) => {
  const map = { PRESENT: 'bg-emerald-100 text-emerald-700', ABSENT: 'bg-rose-100 text-rose-700', APPROVED: 'bg-emerald-100 text-emerald-700', PENDING: 'bg-amber-100 text-amber-700', REJECTED: 'bg-rose-100 text-rose-700' };
  return map[s] || 'bg-slate-100 text-slate-600';
};

function MonthNav({ cursor, onMove }) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => onMove(-1)} className="grid h-8 w-8 place-items-center rounded-lg border hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" aria-label="Previous"><ChevronLeft size={16} /></button>
      <span className="min-w-[120px] text-center text-sm font-semibold">{MONTHS_FULL[cursor.m]} {cursor.y}</span>
      <button onClick={() => onMove(1)} className="grid h-8 w-8 place-items-center rounded-lg border hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" aria-label="Next"><ChevronRight size={16} /></button>
    </div>
  );
}
function useMonth() {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const move = (delta) => setCursor((c) => { const d = new Date(c.y, c.m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const range = useMemo(() => ({ start: ymd(new Date(cursor.y, cursor.m, 1)), end: ymd(new Date(cursor.y, cursor.m + 1, 0)), days: new Date(cursor.y, cursor.m + 1, 0).getDate() }), [cursor]);
  return { cursor, move, range };
}

/* ---------- Report: My Check-in / Check-out ---------- */
function CheckInOutReport({ employeeId }) {
  const { cursor, move, range } = useMonth();
  const [byDate, setByDate] = useState({});
  const [loading, setLoading] = useState(true);
  useEffect(() => { let a = true; setLoading(true); punch.month(employeeId, range.start, range.end).then((d) => { if (a) setByDate(d); }).catch(() => {}).finally(() => { if (a) setLoading(false); }); return () => { a = false; }; }, [employeeId, range.start, range.end]);
  const today = ymd(new Date());
  const rows = Array.from({ length: range.days }, (_, i) => {
    const date = `${cursor.y}-${pad(cursor.m + 1)}-${pad(i + 1)}`;
    const punches = (byDate[date] || []).map((p) => ({ at: p.at, type: p.type }));
    const day = computeDay(punches, Date.now());
    const first = day.sessions[0]?.in || null;
    const last = [...day.sessions].reverse().find((s) => s.out)?.out || null;
    const has = punches.length > 0;
    const status = has ? 'PRESENT' : (date < today ? 'ABSENT' : '');
    return { date, weekday: new Date(cursor.y, cursor.m, i + 1).toLocaleDateString([], { weekday: 'short' }), first, last, work: day.workMs, status, future: date > today };
  });
  return (
    <ReportShell title="My Check-in / Check-out" cursor={cursor} onMove={move}>
      {loading ? <Loader /> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="border-b text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-700">
              <th className="px-3 py-2.5">Date</th><th className="px-3 py-2.5">Day</th><th className="px-3 py-2.5">First in</th><th className="px-3 py-2.5">Last out</th><th className="px-3 py-2.5">Total hours</th><th className="px-3 py-2.5">Status</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.date} className={`border-b dark:border-slate-700 ${r.future ? 'opacity-40' : ''}`}>
                  <td className="whitespace-nowrap px-3 py-2.5">{r.date}</td>
                  <td className="px-3 py-2.5 text-slate-500">{r.weekday}</td>
                  <td className="px-3 py-2.5">{fmtTime(r.first)}</td>
                  <td className="px-3 py-2.5">{fmtTime(r.last)}</td>
                  <td className="px-3 py-2.5 tabular-nums">{r.status === 'PRESENT' ? fmtDur(r.work) : '—'}</td>
                  <td className="px-3 py-2.5">{r.status ? <span className={`badge ${statusBadge(r.status)}`}>{r.status}</span> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ReportShell>
  );
}

/* ---------- Report: Entry / Exit ---------- */
function EntryExitReport({ employeeId }) {
  const { cursor, move, range } = useMonth();
  const [byDate, setByDate] = useState({});
  const [loading, setLoading] = useState(true);
  useEffect(() => { let a = true; setLoading(true); punch.month(employeeId, range.start, range.end).then((d) => { if (a) setByDate(d); }).catch(() => {}).finally(() => { if (a) setLoading(false); }); return () => { a = false; }; }, [employeeId, range.start, range.end]);
  const events = Object.keys(byDate).sort().flatMap((date) => (byDate[date] || []).map((p) => ({ date, at: p.at, type: p.type }))).sort((a, b) => new Date(b.at) - new Date(a.at));
  return (
    <ReportShell title="Entry / Exit" cursor={cursor} onMove={move}>
      {loading ? <Loader /> : events.length === 0 ? <Empty text="No entry / exit records this month." /> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead><tr className="border-b text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-700">
              <th className="px-3 py-2.5">Date</th><th className="px-3 py-2.5">Time</th><th className="px-3 py-2.5">Event</th>
            </tr></thead>
            <tbody>
              {events.map((e, i) => (
                <tr key={i} className="border-b dark:border-slate-700">
                  <td className="whitespace-nowrap px-3 py-2.5">{e.date}</td>
                  <td className="px-3 py-2.5 tabular-nums">{fmtTime(e.at)}</td>
                  <td className="px-3 py-2.5">
                    {e.type === 'IN'
                      ? <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600"><LogIn size={14} /> Entry</span>
                      : <span className="inline-flex items-center gap-1.5 font-medium text-rose-600"><LogOut size={14} /> Exit</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ReportShell>
  );
}

/* ---------- Report: My leave summary ---------- */
function LeaveSummaryReport({ employeeId }) {
  const [bal, setBal] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { let a = true; setLoading(true); Promise.all([leaveApi.balance(employeeId), leaveApi.mine(employeeId)]).then(([b, l]) => { if (a) { setBal(b?.balances || null); setRows(l); } }).catch(() => {}).finally(() => { if (a) setLoading(false); }); return () => { a = false; }; }, [employeeId]);
  const cards = bal ? [['Casual', bal.CASUAL], ['Sick', bal.SICK], ['Earned', bal.EARNED]] : [];
  return (
    <ReportShell title="My leave summary" noNav>
      {loading ? <Loader /> : (
        <>
          {cards.length > 0 && (
            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {cards.map(([k, v]) => (
                <div key={k} className="rounded-xl border p-4 dark:border-slate-700">
                  <div className="text-xs uppercase tracking-wide text-slate-400">{k} leave</div>
                  <div className="mt-1 text-2xl font-bold text-sky-600">{v ?? 0}<span className="ml-1 text-sm font-normal text-slate-400">days left</span></div>
                </div>
              ))}
            </div>
          )}
          {rows.length === 0 ? <Empty text="No leave applications yet." /> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead><tr className="border-b text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-700">
                  <th className="px-3 py-2.5">Type</th><th className="px-3 py-2.5">From</th><th className="px-3 py-2.5">To</th><th className="px-3 py-2.5">Days</th><th className="px-3 py-2.5">Status</th>
                </tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r._id} className="border-b dark:border-slate-700">
                      <td className="px-3 py-2.5 capitalize">{String(r.type || '').toLowerCase()}</td>
                      <td className="whitespace-nowrap px-3 py-2.5">{r.from}</td>
                      <td className="whitespace-nowrap px-3 py-2.5">{r.to}</td>
                      <td className="px-3 py-2.5">{r.days}</td>
                      <td className="px-3 py-2.5"><span className={`badge ${statusBadge(r.status)}`}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </ReportShell>
  );
}

function Empty({ text }) { return <div className="grid place-items-center py-12 text-sm text-slate-400">{text}</div>; }

function sumAmt(arr) { return (arr || []).reduce((s, x) => s + Number(x.amount || 0), 0); }

function hm(min) { const h = Math.floor(min / 60), m = Math.round(min % 60); return h ? `${h}h ${m}m` : `${m}m`; }

function ActivityReport() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [start, setStart] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10); });
  const [end, setEnd] = useState(todayStr);
  const [rows, setRows] = useState(null);
  useEffect(() => {
    let a = true; setRows(null);
    attApi.activitySummary(start, end).then((d) => { if (a) setRows(d); }).catch(() => { if (a) setRows([]); });
    return () => { a = false; };
  }, [start, end]);

  const fmtDate = (d) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
  const fmtTime = (ts) => ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
  const exportCSV = () => {
    const header = ['Employee', 'Code', 'Date', 'First in', 'Last out', 'Sessions', 'Active (min)', 'Idle (min)'];
    const body = (rows || []).map((r) => [`${r.employee?.firstName || ''} ${r.employee?.lastName || ''}`.trim(), r.employee?.employeeId || '', r.date, fmtTime(r.firstIn), fmtTime(r.lastOut), r.sessions, r.activeMin, r.idleMin]);
    downloadCSV(`activity_idle_${start}_to_${end}.csv`, [header, ...body]);
  };

  return (
    <div className="card p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 dark:border-slate-700">
        <h3 className="font-semibold">Activity &amp; idle time</h3>
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" className="input h-9 w-auto py-1" value={start} max={end} onChange={(e) => setStart(e.target.value)} />
          <span className="text-xs text-slate-400">to</span>
          <input type="date" className="input h-9 w-auto py-1" value={end} min={start} max={todayStr} onChange={(e) => setEnd(e.target.value)} />
          <button onClick={exportCSV} disabled={!rows?.length} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"><Download size={15} /> Export CSV</button>
        </div>
      </div>
      <div className="p-3 sm:p-4">
        <p className="mb-3 text-xs text-slate-400">Active = time between matched check-in/out pairs. Idle = gaps between sessions during the day (breaks). Derived from attendance punches.</p>
        {rows === null ? <Loader /> : !rows.length ? <Empty text="No punch activity in range." /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead><tr className="border-b text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-700">
                <th className="px-3 py-2.5">Employee</th><th className="px-3 py-2.5">Date</th><th className="px-3 py-2.5">First in</th><th className="px-3 py-2.5">Last out</th><th className="px-3 py-2.5">Sessions</th><th className="px-3 py-2.5">Active</th><th className="px-3 py-2.5">Idle</th>
              </tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b dark:border-slate-700">
                    <td className="px-3 py-2.5"><div className="font-medium">{r.employee?.firstName} {r.employee?.lastName}</div><div className="text-[10px] text-slate-400">{r.employee?.employeeId}</div></td>
                    <td className="px-3 py-2.5 text-slate-500">{fmtDate(r.date)}</td>
                    <td className="px-3 py-2.5 tabular-nums">{fmtTime(r.firstIn)}</td>
                    <td className="px-3 py-2.5 tabular-nums">{fmtTime(r.lastOut)}</td>
                    <td className="px-3 py-2.5">{r.sessions}</td>
                    <td className="px-3 py-2.5 font-medium text-emerald-600">{hm(r.activeMin)}</td>
                    <td className="px-3 py-2.5 text-amber-600">{hm(r.idleMin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Form16Report() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [rows, setRows] = useState(null);
  useEffect(() => {
    let a = true; setRows(null);
    payApi.annualSummary(year).then((d) => { if (a) setRows(d); }).catch(() => { if (a) setRows([]); });
    return () => { a = false; };
  }, [year]);

  const exportCSV = () => {
    const header = ['Employee', 'Code', 'PAN', 'Months paid', 'Annual gross', 'Total TDS', 'Annual net'];
    const body = (rows || []).map((r) => [`${r.employee?.firstName || ''} ${r.employee?.lastName || ''}`.trim(), r.employee?.employeeId || '', r.pan || '', r.months, r.gross, r.tds, r.net]);
    downloadCSV(`form16_summary_${year}.csv`, [header, ...body]);
  };

  return (
    <div className="card p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 dark:border-slate-700">
        <h3 className="font-semibold">Form-16 / annual TDS summary</h3>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-slate-400">Year</label>
          <input type="number" className="input h-9 w-24 py-1" value={year} onChange={(e) => setYear(Number(e.target.value))} />
          <button onClick={exportCSV} disabled={!rows?.length} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"><Download size={15} /> Export CSV</button>
        </div>
      </div>
      <div className="p-3 sm:p-4">
        {rows === null ? <Loader /> : !rows.length ? <Empty text={`No payslips found for ${year}.`} /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead><tr className="border-b text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-700">
                <th className="px-3 py-2.5">Employee</th><th className="px-3 py-2.5">PAN</th><th className="px-3 py-2.5">Months</th><th className="px-3 py-2.5">Annual gross</th><th className="px-3 py-2.5">Total TDS</th><th className="px-3 py-2.5">Annual net</th>
              </tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.employeeId} className="border-b dark:border-slate-700">
                    <td className="px-3 py-2.5"><div className="font-medium">{r.employee?.firstName} {r.employee?.lastName}</div><div className="text-[10px] text-slate-400">{r.employee?.employeeId}</div></td>
                    <td className="px-3 py-2.5 text-slate-500">{r.pan || '—'}</td>
                    <td className="px-3 py-2.5">{r.months}</td>
                    <td className="px-3 py-2.5 font-medium">{money(r.gross, r.currency)}</td>
                    <td className="px-3 py-2.5 text-rose-600">{money(r.tds, r.currency)}</td>
                    <td className="px-3 py-2.5 font-semibold text-emerald-600">{money(r.net, r.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ManualEntryReport() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [start, setStart] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); });
  const [end, setEnd] = useState(todayStr);
  const [rows, setRows] = useState(null);
  useEffect(() => {
    let a = true; setRows(null);
    attApi.manualPunches(start, end).then((d) => { if (a) setRows(d); }).catch(() => { if (a) setRows([]); });
    return () => { a = false; };
  }, [start, end]);

  const fmtDate = (d) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  const fmtTime = (ts) => ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
  const exportCSV = () => {
    const header = ['Employee', 'Code', 'Date', 'Type', 'Time', 'Remarks'];
    const body = (rows || []).map((r) => [`${r.employee?.firstName || ''} ${r.employee?.lastName || ''}`.trim(), r.employee?.employeeId || '', r.date, r.type, fmtTime(r.at), r.remarks || '']);
    downloadCSV(`manual_entries_${start}_to_${end}.csv`, [header, ...body]);
  };

  return (
    <div className="card p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 dark:border-slate-700">
        <h3 className="font-semibold">Manual time entries</h3>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-slate-400">From</label>
          <input type="date" className="input h-9 w-auto py-1" value={start} max={end} onChange={(e) => setStart(e.target.value)} />
          <label className="text-xs text-slate-400">To</label>
          <input type="date" className="input h-9 w-auto py-1" value={end} min={start} max={todayStr} onChange={(e) => setEnd(e.target.value)} />
          <button onClick={exportCSV} disabled={!rows?.length} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"><Download size={15} /> Export CSV</button>
        </div>
      </div>
      <div className="p-3 sm:p-4">
        {rows === null ? <Loader /> : !rows.length ? <Empty text="No manual entries in range." /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead><tr className="border-b text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-700">
                <th className="px-3 py-2.5">Employee</th><th className="px-3 py-2.5">Date</th><th className="px-3 py-2.5">Type</th><th className="px-3 py-2.5">Time</th><th className="px-3 py-2.5">Remarks</th>
              </tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b dark:border-slate-700">
                    <td className="px-3 py-2.5"><div className="font-medium">{r.employee?.firstName} {r.employee?.lastName}</div><div className="text-[10px] text-slate-400">{r.employee?.employeeId}</div></td>
                    <td className="px-3 py-2.5 text-slate-500">{fmtDate(r.date)}</td>
                    <td className="px-3 py-2.5"><span className={`badge ${r.type === 'IN' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{r.type}</span></td>
                    <td className="px-3 py-2.5 tabular-nums">{fmtTime(r.at)}</td>
                    <td className="px-3 py-2.5 text-slate-500">{r.remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function CTCReport() {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    let a = true;
    payApi.allStructures().then((d) => { if (a) setRows(d); }).catch(() => { if (a) setRows([]); });
    return () => { a = false; };
  }, []);

  const data = useMemo(() => (rows || []).map((s) => {
    const allow = sumAmt(s.allowances);
    const ded = sumAmt(s.deductions);
    const gross = s.basic + allow;
    return { id: s.employeeId, name: `${s.employee?.firstName || ''} ${s.employee?.lastName || ''}`.trim(), code: s.employee?.employeeId || '', currency: s.currency, basic: s.basic, allow, ded, gross, annual: gross * 12 };
  }).sort((x, y) => y.annual - x.annual), [rows]);

  const exportCSV = () => {
    const header = ['Employee', 'Code', 'Basic (monthly)', 'Fixed allowance (monthly)', 'Monthly gross', 'Deductions (monthly)', 'Annual CTC'];
    const body = data.map((r) => [r.name, r.code, r.basic, r.allow, r.gross, r.ded, r.annual]);
    downloadCSV('ctc_report.csv', [header, ...body]);
  };

  return (
    <div className="card p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 dark:border-slate-700">
        <h3 className="font-semibold">CTC report</h3>
        <button onClick={exportCSV} disabled={!data.length} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"><Download size={15} /> Export CSV</button>
      </div>
      <div className="p-3 sm:p-4">
        {rows === null ? <Loader /> : !data.length ? <Empty text="No salary structures defined yet." /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead><tr className="border-b text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-700">
                <th className="px-3 py-2.5">Employee</th><th className="px-3 py-2.5">Basic</th><th className="px-3 py-2.5">Fixed allowance</th><th className="px-3 py-2.5">Monthly gross</th><th className="px-3 py-2.5">Deductions</th><th className="px-3 py-2.5">Annual CTC</th>
              </tr></thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.id} className="border-b dark:border-slate-700">
                    <td className="px-3 py-2.5"><div className="font-medium">{r.name}</div><div className="text-[10px] text-slate-400">{r.code}</div></td>
                    <td className="px-3 py-2.5">{money(r.basic, r.currency)}</td>
                    <td className="px-3 py-2.5 text-slate-500">{money(r.allow, r.currency)}</td>
                    <td className="px-3 py-2.5 font-medium">{money(r.gross, r.currency)}</td>
                    <td className="px-3 py-2.5 text-rose-600">{money(r.ded, r.currency)}</td>
                    <td className="px-3 py-2.5 font-semibold text-emerald-600">{money(r.annual, r.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const LEAVE_CODE = { CASUAL: 'CL', SICK: 'SL', EARNED: 'EL', UNPAID: 'LOP', MATERNITY: 'ML', PATERNITY: 'PL' };
function eachDateStr(from, to, cb) { const d = new Date(from + 'T00:00:00Z'); const end = new Date(to + 'T00:00:00Z'); while (d <= end) { cb(d.toISOString().slice(0, 10), d.getUTCDay()); d.setUTCDate(d.getUTCDate() + 1); } }
function downloadCSV(filename, rows) {
  const esc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = rows.map((r) => r.map(esc).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}

/* ---------- Report: Employee Attendance (date range + export) ---------- */
function EmployeeAttendanceReport({ viewer }) {
  const firstOfMonth = useMemo(() => { const d = new Date(); return ymd(new Date(d.getFullYear(), d.getMonth(), 1)); }, []);
  const todayStr = ymd(new Date());
  const [start, setStart] = useState(firstOfMonth);
  const [end, setEnd] = useState(todayStr);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!start || !end || start > end) return;
    let a = true; setLoading(true);
    attApi.range(start, end, viewer).then((d) => { if (a) setData(d); }).catch(() => { if (a) setData(null); }).finally(() => { if (a) setLoading(false); });
    return () => { a = false; };
  }, [start, end, viewer]);

  const summary = useMemo(() => {
    if (!data) return [];
    const att = new Map(); data.attendance.forEach((x) => att.set(`${x.employee_id}|${x.work_date}`, x.status));
    const leave = new Map(); data.leaves.forEach((l) => eachDateStr(l.from_date > data.start ? l.from_date : data.start, l.to_date < data.end ? l.to_date : data.end, (d) => leave.set(`${l.employee_id}|${d}`, l.leave_type)));
    const hol = new Set(data.holidays.map((h) => h.date));
    return data.employees.map((emp) => {
      let present = 0, leaveDays = 0, holiday = 0, weekoff = 0, absent = 0, workedOff = 0, late = 0;
      eachDateStr(data.start, data.end, (date, dow) => {
        const weekend = dow === 0 || dow === 6;
        const st = att.get(`${emp.id}|${date}`); const lv = leave.get(`${emp.id}|${date}`);
        const isHol = hol.has(date);
        const worked = st === 'PRESENT' || st === 'LATE' || st === 'HALF_DAY';
        if (worked) { present++; if (st === 'LATE') late++; if (isHol || weekend) workedOff++; }
        else if (isHol) holiday++;
        else if (lv) leaveDays++;
        else if (weekend) weekoff++;
        else if (date < todayStr) absent++; // past working day with no record
      });
      return { id: emp.id, name: emp.name, code: emp.code, present, absent, leaveDays, holiday, weekoff, workedOff, late };
    });
  }, [data, todayStr]);

  const exportCSV = () => {
    const header = ['Employee', 'Code', 'Present', 'Late', 'Absent', 'Leave', 'Holiday', 'Week-off', 'Worked on off-day'];
    const rows = [header, ...summary.map((s) => [s.name, s.code, s.present, s.late, s.absent, s.leaveDays, s.holiday, s.weekoff, s.workedOff])];
    downloadCSV(`attendance_${start}_to_${end}.csv`, rows);
  };

  return (
    <div className="card p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 dark:border-slate-700">
        <h3 className="font-semibold">Employee Attendance Report</h3>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-slate-400">From</label>
          <input type="date" className="input h-9 w-auto py-1" value={start} max={end} onChange={(e) => setStart(e.target.value)} />
          <label className="text-xs text-slate-400">To</label>
          <input type="date" className="input h-9 w-auto py-1" value={end} min={start} max={todayStr} onChange={(e) => setEnd(e.target.value)} />
          <button onClick={exportCSV} disabled={!summary.length} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"><Download size={15} /> Export CSV</button>
        </div>
      </div>
      <div className="p-3 sm:p-4">
        {loading ? <Loader /> : !summary.length ? <Empty text="No employees in range." /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead><tr className="border-b text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-700">
                <th className="px-3 py-2.5">Employee</th><th className="px-3 py-2.5">Present</th><th className="px-3 py-2.5"><span className="inline-flex items-center gap-1"><Turtle size={13} className="text-rose-500" />Late</span></th><th className="px-3 py-2.5">Absent</th><th className="px-3 py-2.5">Leave</th><th className="px-3 py-2.5">Holiday</th><th className="px-3 py-2.5">Week-off</th><th className="px-3 py-2.5">On off-day</th>
              </tr></thead>
              <tbody>
                {summary.map((s) => (
                  <tr key={s.id} className="border-b dark:border-slate-700">
                    <td className="px-3 py-2.5"><div className="font-medium">{s.name}</div><div className="text-[10px] text-slate-400">{s.code}</div></td>
                    <td className="px-3 py-2.5 font-semibold text-emerald-600">{s.present}</td>
                    <td className="px-3 py-2.5 text-rose-500">{s.late > 0 ? <span className="inline-flex items-center gap-1"><Turtle size={13} />{s.late}</span> : <span className="text-slate-300">0</span>}</td>
                    <td className="px-3 py-2.5 text-rose-600">{s.absent}</td>
                    <td className="px-3 py-2.5 text-violet-600">{s.leaveDays}</td>
                    <td className="px-3 py-2.5 text-sky-600">{s.holiday}</td>
                    <td className="px-3 py-2.5 text-slate-400">{s.weekoff}</td>
                    <td className="px-3 py-2.5 text-amber-600">{s.workedOff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
function ReportShell({ title, cursor, onMove, noNav, children }) {
  return (
    <div className="card p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 dark:border-slate-700">
        <h3 className="font-semibold">{title}</h3>
        {!noNav && cursor && <MonthNav cursor={cursor} onMove={onMove} />}
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </div>
  );
}

/* ---------- Directory ---------- */
const CATEGORIES = [
  { key: 'attendance', label: 'Attendance tracker reports', icon: CalendarCheck, reports: [
    { key: 'checkinout', label: 'My Check-in / Check-out' },
    { key: 'entryexit', label: 'Entry / Exit' },
    { key: 'empattendance', label: 'Employee Attendance Report' },
    { key: 'manualentry', label: 'Manual time entries', managerOnly: true },
    { key: 'activity', label: 'Activity & idle time', managerOnly: true },
  ] },
  { key: 'leave', label: 'Leave tracker reports', icon: Plane, reports: [
    { key: 'leavesummary', label: 'My leave summary' },
  ] },
  { key: 'payroll', label: 'Payroll reports', icon: Wallet, managerOnly: true, reports: [
    { key: 'ctc', label: 'CTC report' },
    { key: 'form16', label: 'Form-16 / annual TDS summary' },
  ] },
];

export default function ReportsPage() {
  const { user } = useAuth();
  const employeeId = user?.employee;
  const canManage = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR'].includes(user?.role);
  const CATEGORIES_VISIBLE = CATEGORIES.filter((c) => !c.managerOnly || canManage);
  const [cat, setCat] = useState('attendance');
  const [report, setReport] = useState(null);

  const activeCat = CATEGORIES_VISIBLE.find((c) => c.key === cat) || CATEGORIES_VISIBLE[0];

  return (
    <>
      <PageBanner icon={BarChart3} title="Reports" />
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        {/* left rail */}
        <div className="card h-fit p-2">
          {CATEGORIES_VISIBLE.map((c) => {
            const Icon = c.icon;
            return (
              <button key={c.key} onClick={() => { setCat(c.key); setReport(null); }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${cat === c.key ? 'bg-sky-500 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
                <Icon size={16} /> {c.label}
              </button>
            );
          })}
        </div>

        {/* content */}
        <div>
          {!report ? (
            <div className="card p-0">
              <div className="flex items-center gap-2 border-b px-4 py-3 dark:border-slate-700">
                {activeCat.icon && <activeCat.icon size={18} className="text-sky-500" />}
                <h3 className="text-base font-semibold">{activeCat.label}</h3>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 p-4">
                {activeCat.reports.filter((r) => !r.managerOnly || canManage).map((r) => (
                  <button key={r.key} onClick={() => setReport(r.key)} className="text-sm font-medium text-sky-600 hover:underline">{r.label}</button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <button onClick={() => setReport(null)} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-sky-600"><ArrowLeft size={15} /> Back to {activeCat.label}</button>
              {report === 'checkinout' && <CheckInOutReport employeeId={employeeId} />}
              {report === 'entryexit' && <EntryExitReport employeeId={employeeId} />}
              {report === 'empattendance' && <EmployeeAttendanceReport viewer={{ role: user?.role, employeeId: user?.employee }} />}
              {report === 'leavesummary' && <LeaveSummaryReport employeeId={employeeId} />}
              {report === 'ctc' && <CTCReport />}
              {report === 'manualentry' && <ManualEntryReport />}
              {report === 'activity' && <ActivityReport />}
              {report === 'form16' && <Form16Report />}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

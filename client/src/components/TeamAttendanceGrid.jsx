'use client';
import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarRange } from 'lucide-react';
import { attendance as attApi } from '@/lib/db';
import { useAuth } from '@/context/AuthContext';
import Loader from '@/components/Loader';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WD = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const LEAVE_CODE = { CASUAL: 'CL', SICK: 'SL', EARNED: 'EL', UNPAID: 'LOP', MATERNITY: 'ML', PATERNITY: 'PL' };

// Cell visual styles
const CELL = {
  P: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  L: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  HD: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  A: 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300',
  WO: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500',
  H: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
  CL: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
  SL: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/50 dark:text-fuchsia-300',
  EL: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300',
  LOP: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
  '': 'text-slate-300 dark:text-slate-700',
};

function eachDate(from, to, cb) {
  const d = new Date(from + 'T00:00:00Z');
  const end = new Date(to + 'T00:00:00Z');
  while (d <= end) { cb(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1); }
}

export default function TeamAttendanceGrid() {
  const { user } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    attApi.month(year, month, { role: user?.role, employeeId: user?.employee }).then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, [year, month, user]);

  const days = useMemo(() => new Date(Date.UTC(year, month + 1, 0)).getUTCDate(), [year, month]);
  const todayStr = now.toISOString().slice(0, 10);

  const matrix = useMemo(() => {
    if (!data) return null;
    const att = new Map();   // emp|date -> status
    data.attendance.forEach((a) => att.set(`${a.employee_id}|${a.work_date}`, a.status));
    const leave = new Map(); // emp|date -> type
    data.leaves.forEach((l) => eachDate(l.from_date > data.start ? l.from_date : data.start, l.to_date < data.end ? l.to_date : data.end, (d) => leave.set(`${l.employee_id}|${d}`, l.leave_type)));
    const holiday = new Set(data.holidays.map((h) => h.date));

    return data.employees.map((emp) => {
      const cells = [];
      for (let day = 1; day <= days; day++) {
        const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dow = new Date(Date.UTC(year, month, day)).getUTCDay();
        const weekend = dow === 0 || dow === 6;
        let code = '';
        const st = att.get(`${emp.id}|${date}`);
        const lv = leave.get(`${emp.id}|${date}`);
        if (holiday.has(date)) code = 'H';
        else if (lv) code = LEAVE_CODE[lv] || 'L';
        else if (st === 'PRESENT') code = 'P';
        else if (st === 'LATE') code = 'L';
        else if (st === 'HALF_DAY') code = 'HD';
        else if (weekend) code = 'WO';
        else if (date < todayStr) code = 'A';
        else code = '';
        cells.push({ date, code, weekend });
      }
      // simple present count
      const present = cells.filter((c) => c.code === 'P' || c.code === 'L' || c.code === 'HD').length;
      return { emp, cells, present };
    });
  }, [data, days, year, month, todayStr]);

  const go = (delta) => {
    let m = month + delta, y = year;
    if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
    setMonth(m); setYear(y);
  };

  const legend = [['P', 'Present'], ['L', 'Late'], ['A', 'Absent'], ['CL', 'Casual'], ['SL', 'Sick'], ['EL', 'Earned'], ['H', 'Holiday'], ['WO', 'Week off']];

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
        <div className="flex items-center gap-2 font-semibold"><CalendarRange size={17} className="text-sky-500" /> Team attendance</div>
        <div className="flex items-center gap-2">
          <button onClick={() => go(-1)} className="btn-ghost p-1.5" aria-label="Previous month"><ChevronLeft size={16} /></button>
          <span className="min-w-[140px] text-center text-sm font-medium">{MONTHS[month]} {year}</span>
          <button onClick={() => go(1)} className="btn-ghost p-1.5" aria-label="Next month"><ChevronRight size={16} /></button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 px-5 py-2.5 text-xs text-slate-500">
        {legend.map(([c, label]) => (
          <span key={c} className="inline-flex items-center gap-1.5">
            <span className={`grid h-4 w-4 place-items-center rounded text-[9px] font-bold ${CELL[c]}`}>{c}</span>{label}
          </span>
        ))}
      </div>

      {loading ? <Loader /> : !matrix ? (
        <div className="px-5 py-10 text-center text-sm text-slate-400">Could not load attendance.</div>
      ) : matrix.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-slate-400">No employees found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 min-w-[180px] border-b bg-white px-4 py-2 text-left font-medium text-slate-500 dark:bg-slate-900">Employee</th>
                {Array.from({ length: days }, (_, i) => {
                  const dow = new Date(Date.UTC(year, month, i + 1)).getUTCDay();
                  const weekend = dow === 0 || dow === 6;
                  return (
                    <th key={i} className={`border-b border-l px-0 py-1 text-center font-medium ${weekend ? 'bg-slate-50 text-slate-400 dark:bg-slate-800/60' : 'text-slate-500'}`} style={{ minWidth: 30 }}>
                      <div>{i + 1}</div><div className="text-[9px] font-normal text-slate-400">{WD[dow]}</div>
                    </th>
                  );
                })}
                <th className="border-b border-l px-3 py-1 text-center font-medium text-slate-500">P</th>
              </tr>
            </thead>
            <tbody>
              {matrix.map(({ emp, cells, present }) => (
                <tr key={emp.id}>
                  <td className="sticky left-0 z-10 border-b bg-white px-4 py-1.5 dark:bg-slate-900">
                    <div className="font-medium text-slate-800 dark:text-slate-100">{emp.name}</div>
                    <div className="text-[10px] text-slate-400">{emp.code}</div>
                  </td>
                  {cells.map((c, i) => (
                    <td key={i} className="border-b border-l p-0.5 text-center" style={{ minWidth: 30 }}>
                      <div className={`mx-auto grid h-6 w-7 place-items-center rounded text-[9px] font-bold ${CELL[c.code] || ''}`}>{c.code}</div>
                    </td>
                  ))}
                  <td className="border-b border-l px-3 text-center font-semibold text-emerald-600">{present}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

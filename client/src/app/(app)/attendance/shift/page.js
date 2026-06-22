'use client';
import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import PageBanner from '@/components/PageBanner';
import Loader from '@/components/Loader';
import { useAuth } from '@/context/AuthContext';
import { shifts as shiftApi, holidays as holidayApi } from '@/lib/db';

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

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([shiftApi.mine(employeeId), holidayApi.all()])
      .then(([r, hs]) => { if (!alive) return; setData(r); const m = {}; (hs || []).forEach((h) => { m[h.date] = h.name; }); setHolidayMap(m); })
      .catch(() => {}).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [employeeId]);

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

  const { shift, weeklyOff } = data;

  return (
    <>
      <PageBanner icon={CalendarDays} title="My shift">
        <div className="flex items-center gap-2">
          <button onClick={() => move(-1)} className="grid h-8 w-8 place-items-center rounded-lg bg-white/20 hover:bg-white/30" aria-label="Previous month"><ChevronLeft size={18} /></button>
          <button onClick={goToday} className="min-w-[120px] rounded-lg bg-white px-3 py-1.5 text-center text-sm font-semibold text-sky-700 hover:bg-sky-50">{MONTHS[cursor.m]} {cursor.y}</button>
          <button onClick={() => move(1)} className="grid h-8 w-8 place-items-center rounded-lg bg-white/20 hover:bg-white/30" aria-label="Next month"><ChevronRight size={18} /></button>
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
    </>
  );
}

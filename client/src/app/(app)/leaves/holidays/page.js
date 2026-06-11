'use client';
import { useEffect, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import PageBanner from '@/components/PageBanner';
import Loader from '@/components/Loader';
import { holidays as holApi } from '@/lib/db';

const fmt = (d) => new Date(d).toLocaleDateString(undefined, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

export default function HolidaysPage() {
  const [items, setItems] = useState(null);
  useEffect(() => { holApi.all().then(setItems).catch(() => setItems([])); }, []);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageBanner icon={CalendarDays} title="Holidays" />
      {!items ? <Loader /> : (
        <div className="card overflow-hidden">
          <div className="border-b px-5 py-3 font-semibold">Holiday calendar {new Date().getFullYear()}</div>
          {items.length === 0 ? <div className="px-5 py-10 text-center text-slate-400">No holidays configured.</div> : (
            <ul className="divide-y">
              {items.map((h) => {
                const upcoming = h.date >= today;
                return (
                  <li key={h._id} className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`grid h-10 w-10 place-items-center rounded-xl text-sm font-bold ${upcoming ? 'bg-sky-50 text-sky-600 dark:bg-sky-950/40' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>{new Date(h.date).getDate()}</div>
                      <div><div className="font-medium">{h.name}</div><div className="text-xs text-slate-400">{fmt(h.date)}</div></div>
                    </div>
                    {upcoming && <span className="badge bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">Upcoming</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </>
  );
}

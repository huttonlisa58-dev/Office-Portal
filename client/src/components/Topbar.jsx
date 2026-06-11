'use client';
import { useEffect, useState, useCallback } from 'react';
import { Menu, Sun, Moon, Bell, LogOut, LogIn, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { initials } from '@/lib/format';
import { notifications, attendance } from '@/lib/db';

function fmtHMS(totalSec) {
  const s = Math.max(0, Math.floor(totalSec));
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${ss}`;
}

function CheckInOut() {
  const { user, company } = useAuth();
  const employeeId = user?.employee;
  const tz = company?.timezone || 'UTC';
  const [record, setRecord] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  const refresh = useCallback(async () => {
    if (!employeeId) { setLoaded(true); return; }
    try { setRecord(await attendance.myToday(employeeId, tz)); }
    catch { /* ignore */ } finally { setLoaded(true); }
  }, [employeeId, tz]);

  useEffect(() => { refresh(); }, [refresh]);

  const running = record?.checkInAt && !record?.checkOutAt;
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);

  if (!employeeId || !loaded) return null;

  const punch = async (action) => {
    setBusy(true);
    try { await attendance.punch(action); await refresh(); }
    catch (e) { alert(e.message || 'Could not record attendance'); }
    finally { setBusy(false); }
  };

  // Checked out -> show total, disabled
  if (record?.checkOutAt) {
    const mins = record.workedMinutes || Math.round((new Date(record.checkOutAt) - new Date(record.checkInAt)) / 60000);
    return (
      <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
        <Clock size={15} /> {fmtHMS(mins * 60)} <span className="text-xs font-medium opacity-70">DONE</span>
      </div>
    );
  }

  // Checked in -> running timer + CHECK OUT
  if (running) {
    const elapsed = (now - new Date(record.checkInAt).getTime()) / 1000;
    return (
      <button
        onClick={() => punch('check-out')}
        disabled={busy}
        className="flex items-center gap-2 rounded-full border-2 border-sky-500 bg-sky-50 px-4 py-1.5 text-sm font-bold tracking-wide text-sky-700 transition hover:bg-sky-100 disabled:opacity-60 dark:bg-sky-950/40 dark:text-sky-300"
        title="Tap to check out"
      >
        <span className="tabular-nums">{fmtHMS(elapsed)}</span>
        <span className="text-xs">{busy ? '…' : 'CHECK OUT'}</span>
      </button>
    );
  }

  // Not checked in -> CHECK IN
  return (
    <button
      onClick={() => punch('check-in')}
      disabled={busy}
      className="flex items-center gap-2 rounded-full bg-sky-500 px-4 py-1.5 text-sm font-bold tracking-wide text-white transition hover:bg-sky-600 disabled:opacity-60"
      title="Tap to check in"
    >
      <LogIn size={15} /> {busy ? '…' : 'CHECK IN'}
    </button>
  );
}

export default function Topbar({ onMenu }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    notifications.list().then((r) => setUnread(r.unread)).catch(() => {});
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-white/80 px-4 backdrop-blur dark:bg-slate-900/80">
      <button className="btn-ghost p-2 lg:hidden" onClick={onMenu} aria-label="Open menu"><Menu size={20} /></button>
      <div className="flex-1" />

      <CheckInOut />

      <button className="btn-ghost p-2" onClick={toggle} aria-label="Toggle theme">
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <button className="relative btn-ghost p-2" aria-label="Notifications">
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <div className="flex items-center gap-3 border-l pl-3">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-orange-500 text-xs font-semibold text-white">
          {initials(user?.name || 'U')}
        </div>
        <div className="hidden sm:block">
          <div className="text-sm font-medium leading-tight">{user?.name}</div>
          <div className="text-xs text-slate-400">{user?.role?.replace('_', ' ').toLowerCase()}</div>
        </div>
        <button className="btn-ghost p-2" onClick={logout} aria-label="Sign out"><LogOut size={18} /></button>
      </div>
    </header>
  );
}

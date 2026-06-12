'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Sun, Moon, Bell, LogOut, LogIn, Clock, User, Mail, CheckCheck, Inbox as InboxIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { initials } from '@/lib/format';
import { notifications, punch, computeDay } from '@/lib/db';

function fmtHMS(totalSec) {
  const s = Math.max(0, Math.floor(totalSec));
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${ss}`;
}
const ago = (d) => {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

function CheckInOut() {
  const { user } = useAuth();
  const employeeId = user?.employee;
  const companyId = user?.company;
  const [punches, setPunches] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  const refresh = useCallback(async () => {
    if (!employeeId) { setLoaded(true); return; }
    try { setPunches(await punch.today(employeeId)); }
    catch { /* ignore */ } finally { setLoaded(true); }
  }, [employeeId]);
  useEffect(() => { refresh(); }, [refresh]);

  const day = computeDay(punches, now);
  useEffect(() => {
    if (!day.open) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [day.open]);

  if (!employeeId || !loaded) return null;

  const doPunch = async () => {
    setBusy(true);
    try { await punch.toggle(companyId, employeeId, day.open ? 'OUT' : 'IN'); await refresh(); }
    catch (e) { alert(e.message || 'Could not record attendance'); }
    finally { setBusy(false); }
  };

  if (day.open) {
    return (
      <button onClick={doPunch} disabled={busy}
        className="flex items-center gap-2 rounded-full border-2 border-sky-500 bg-sky-50 px-3 py-1.5 text-sm font-bold tracking-wide sm:px-4 text-sky-700 transition hover:bg-sky-100 disabled:opacity-60 dark:bg-sky-950/40 dark:text-sky-300" title="Tap to check out">
        <span className="tabular-nums">{fmtHMS(day.workMs / 1000)}</span>
        <span className="text-xs">{busy ? '…' : 'CHECK OUT'}</span>
      </button>
    );
  }
  return (
    <button onClick={doPunch} disabled={busy}
      className="flex items-center gap-2 rounded-full bg-sky-500 px-3 py-1.5 text-sm font-bold tracking-wide sm:px-4 text-white transition hover:bg-sky-600 disabled:opacity-60" title="Tap to check in">
      <LogIn size={15} /> {busy ? '…' : 'CHECK IN'}
      {day.count > 0 && <span className="rounded bg-white/20 px-1.5 text-xs tabular-nums">{fmtHMS(day.workMs / 1000)}</span>}
    </button>
  );
}

export default function Topbar({ onMenu }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef(null);

  const loadNotifs = useCallback(async () => {
    try { const r = await notifications.list(); setItems(r.items); setUnread(r.unread); } catch { /* ignore */ }
  }, []);
  useEffect(() => { loadNotifs(); }, [loadNotifs]);

  useEffect(() => {
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) { setNotifOpen(false); setMenuOpen(false); } };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const markAll = async () => { try { await notifications.markAllRead(); await loadNotifs(); } catch { /* ignore */ } };
  const go = (path) => { setMenuOpen(false); setNotifOpen(false); router.push(path); };

  return (
    <header ref={wrapRef} className="sticky top-0 z-20 flex h-16 items-center gap-1.5 border-b bg-white/80 px-2 backdrop-blur dark:bg-slate-900/80 sm:gap-3 sm:px-4">
      <button className="btn-ghost p-2 lg:hidden" onClick={onMenu} aria-label="Open menu"><Menu size={20} /></button>
      <div className="flex-1" />

      <CheckInOut />

      <button className="btn-ghost p-2" onClick={toggle} aria-label="Toggle theme">
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* Notifications */}
      <div className="relative">
        <button className="relative btn-ghost p-2" aria-label="Notifications"
          onClick={() => { setNotifOpen((o) => !o); setMenuOpen(false); }}>
          <Bell size={18} />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
        {notifOpen && (
          <div className="absolute right-0 top-12 z-30 w-[min(20rem,calc(100vw-1rem))] overflow-hidden rounded-xl border bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between border-b px-4 py-3 dark:border-slate-700">
              <div>
                <div className="text-sm font-semibold">Notifications</div>
                <div className="text-xs text-slate-400">{unread > 0 ? `You have ${unread} new` : 'No new notifications'}</div>
              </div>
              {unread > 0 && <button onClick={markAll} className="flex items-center gap-1 text-xs text-sky-600 hover:underline"><CheckCheck size={13} /> Mark all read</button>}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 && <div className="px-4 py-8 text-center text-sm text-slate-400">Nothing here yet.</div>}
              {items.map((n) => (
                <button key={n._id} onClick={() => go('/inbox')}
                  className={`flex w-full items-start gap-3 border-b px-4 py-3 text-left hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/40 ${!n.isRead ? 'bg-sky-50/50 dark:bg-sky-950/20' : ''}`}>
                  <span className={`mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full ${!n.isRead ? 'bg-sky-100 text-sky-600' : 'bg-slate-100 text-slate-400'}`}><Mail size={14} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium leading-tight">{n.title}</span>
                    {n.body && <span className="mt-0.5 block text-xs text-slate-500 leading-snug">{n.body}</span>}
                    <span className="mt-1 block text-[11px] text-slate-400">{ago(n.createdAt)}</span>
                  </span>
                  {!n.isRead && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-sky-500" />}
                </button>
              ))}
            </div>
            <button onClick={() => go('/inbox')} className="flex w-full items-center justify-center gap-2 border-t px-4 py-2.5 text-sm font-medium text-sky-600 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/40">
              <InboxIcon size={14} /> View all in Inbox
            </button>
          </div>
        )}
      </div>

      {/* Profile menu */}
      <div className="relative flex items-center gap-2 border-l pl-2 sm:gap-3 sm:pl-3">
        <button className="flex items-center gap-3" onClick={() => { setMenuOpen((o) => !o); setNotifOpen(false); }}>
          <div className="grid h-9 w-9 place-items-center rounded-full bg-orange-500 text-xs font-semibold text-white">
            {initials(user?.name || 'U')}
          </div>
          <div className="hidden text-left sm:block">
            <div className="text-sm font-medium leading-tight">{user?.name}</div>
            <div className="text-xs text-slate-400">{user?.role?.replace('_', ' ').toLowerCase()}</div>
          </div>
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-12 z-30 w-48 overflow-hidden rounded-xl border bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-800">
            <button onClick={() => go('/profile')} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/40"><User size={16} /> My Profile</button>
            <button onClick={() => go('/inbox')} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/40"><Mail size={16} /> Inbox</button>
            <button onClick={logout} className="flex w-full items-center gap-3 border-t px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 dark:border-slate-700 dark:hover:bg-rose-950/30"><LogOut size={16} /> Logout</button>
          </div>
        )}
      </div>
    </header>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { CalendarDays, Plus, Pencil, Trash2, Lock } from 'lucide-react';
import PageBanner from '@/components/PageBanner';
import Loader from '@/components/Loader';
import Modal from '@/components/Modal';
import { holidays as holApi } from '@/lib/db';
import { useAuth } from '@/context/AuthContext';

const fmt = (d) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
const periodOf = (d) => (d || '').slice(0, 7);

export default function HolidaysPage() {
  const { user } = useAuth();
  const canManage = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'MANAGER'].includes(user?.role);
  const [items, setItems] = useState(null);
  const [locked, setLocked] = useState(new Set());
  const [editing, setEditing] = useState(null); // holiday obj or {} for new
  const today = new Date().toISOString().slice(0, 10);

  const load = () => {
    holApi.all().then(setItems).catch(() => setItems([]));
    if (canManage) holApi.lockedPeriods().then(setLocked).catch(() => setLocked(new Set()));
  };
  useEffect(load, [canManage]); // eslint-disable-line react-hooks/exhaustive-deps

  const remove = async (h) => {
    if (!window.confirm(`Delete holiday “${h.name}” on ${fmt(h.date)}?`)) return;
    try { await holApi.remove(h._id); load(); }
    catch (e) { window.alert(e.message || 'Could not delete holiday'); }
  };

  return (
    <>
      <PageBanner icon={CalendarDays} title="Holidays" />
      {!items ? <Loader /> : (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b px-5 py-3">
            <span className="font-semibold">Holiday calendar {new Date().getFullYear()}</span>
            {canManage && <button className="btn-primary inline-flex items-center gap-1.5 text-sm" onClick={() => setEditing({})}><Plus size={15} /> Add holiday</button>}
          </div>
          {items.length === 0 ? <div className="px-5 py-10 text-center text-slate-400">No holidays configured.</div> : (
            <ul className="divide-y dark:divide-slate-700">
              {items.map((h) => {
                const upcoming = h.date >= today;
                const isLocked = locked.has(periodOf(h.date));
                return (
                  <li key={h._id} className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`grid h-10 w-10 place-items-center rounded-xl text-sm font-bold ${upcoming ? 'bg-sky-50 text-sky-600 dark:bg-sky-950/40' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>{new Date(`${h.date}T00:00:00`).getDate()}</div>
                      <div>
                        <div className="font-medium">{h.name} {h.isOptional && <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800">Optional</span>}</div>
                        <div className="text-xs text-slate-400">{fmt(h.date)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {upcoming && <span className="badge bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">Upcoming</span>}
                      {canManage && (isLocked ? (
                        <span title="Payroll for this month is processed — locked" className="inline-flex items-center gap-1 text-xs text-slate-400"><Lock size={13} /> Locked</span>
                      ) : (
                        <>
                          <button className="btn-ghost p-1.5 text-slate-500" title="Edit" onClick={() => setEditing(h)}><Pencil size={15} /></button>
                          <button className="btn-ghost p-1.5 text-rose-500" title="Delete" onClick={() => remove(h)}><Trash2 size={15} /></button>
                        </>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {canManage && <p className="border-t px-5 py-3 text-xs text-slate-400 dark:border-slate-700">Past and future holidays can be edited or deleted until that month’s payroll is processed, after which they lock automatically.</p>}
        </div>
      )}
      {editing && <HolidayModal holiday={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </>
  );
}

function HolidayModal({ holiday, onClose, onSaved }) {
  const isNew = !holiday._id;
  const [form, setForm] = useState({ name: holiday.name || '', date: holiday.date || '', isOptional: !!holiday.isOptional });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const save = async () => {
    if (!form.name.trim() || !form.date) { setErr('Name and date are required.'); return; }
    setBusy(true); setErr('');
    try { await holApi.save({ id: holiday._id || null, name: form.name.trim(), date: form.date, isOptional: form.isOptional }); onSaved(); }
    catch (e) { setErr(e.message || 'Could not save holiday'); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={isNew ? 'Add holiday' : 'Edit holiday'}
      footer={<><button className="btn-outline" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></>}>
      <div className="space-y-3">
        {err && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-950/40">{err}</div>}
        <div><label className="label">Holiday name</label><input className="input" value={form.name} onChange={set('name')} placeholder="e.g. Diwali" /></div>
        <div><label className="label">Date</label><input type="date" className="input" value={form.date} onChange={set('date')} /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isOptional} onChange={set('isOptional')} /> Optional holiday</label>
      </div>
    </Modal>
  );
}

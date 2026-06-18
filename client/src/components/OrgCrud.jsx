'use client';
import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import PageBanner from '@/components/PageBanner';
import Loader from '@/components/Loader';
import { useAuth } from '@/context/AuthContext';

export default function OrgCrud({ icon, title, singular, valueLabel, hasLevel, api }) {
  const { user } = useAuth();
  const canManage = ['COMPANY_ADMIN', 'HR', 'MANAGER'].includes(user?.role);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { mode: 'add' | 'edit', item }
  const [val, setVal] = useState('');
  const [lvl, setLvl] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await api.list()); } catch { /* ignore */ } finally { setLoading(false); }
  }, [api]);
  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setVal(''); setLvl(''); setErr(''); setModal({ mode: 'add' }); };
  const openEdit = (it) => { setVal(it[api.field] || ''); setLvl(it.level ?? ''); setErr(''); setModal({ mode: 'edit', item: it }); };

  const save = async () => {
    if (!val.trim()) { setErr(`${valueLabel} is required`); return; }
    setBusy(true); setErr('');
    try {
      const level = hasLevel ? (lvl === '' ? null : Number(lvl)) : undefined;
      if (modal.mode === 'add') await api.add(user.company, val.trim(), level);
      else await api.update(modal.item._id, val.trim(), level);
      setModal(null); load();
    } catch (e) { setErr(e.message || 'Failed'); } finally { setBusy(false); }
  };

  const del = async (it) => {
    if (!window.confirm(`Delete ${singular} "${it[api.field]}"? Employees assigned to it will keep their record but lose this link.`)) return;
    try { await api.del(it._id); load(); } catch (e) { window.alert(e.message || 'Delete failed'); }
  };

  return (
    <>
      <PageBanner icon={icon} title={title} />
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-3 dark:border-slate-700">
          <h2 className="font-semibold">{title}</h2>
          {canManage && (
            <button onClick={openAdd} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-sky-700">
              <Plus size={16} /> Add {singular}
            </button>
          )}
        </div>

        {loading ? <Loader /> : items.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-400">No {title.toLowerCase()} yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-400 dark:border-slate-700">
                  <th className="px-5 py-3 font-medium">{valueLabel}</th>
                  {hasLevel && <th className="px-5 py-3 font-medium">Level</th>}
                  {canManage && <th className="px-5 py-3 text-right font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it._id} className="border-b last:border-0 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3 font-medium">{it[api.field]}</td>
                    {hasLevel && <td className="px-5 py-3 text-slate-500">{it.level ?? '—'}</td>}
                    {canManage && (
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openEdit(it)} title="Edit" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"><Pencil size={15} /></button>
                          <button onClick={() => del(it)} title="Delete" className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !busy && setModal(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{modal.mode === 'add' ? `Add ${singular}` : `Edit ${singular}`}</h3>
              <button onClick={() => !busy && setModal(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"><X size={18} /></button>
            </div>
            <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">{valueLabel}</label>
            <input autoFocus value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-sky-500 dark:border-slate-600 dark:bg-slate-900" placeholder={valueLabel} />
            {hasLevel && (
              <>
                <label className="mb-1 mt-4 block text-sm font-medium text-slate-600 dark:text-slate-300">Level (optional)</label>
                <input type="number" value={lvl} onChange={(e) => setLvl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-sky-500 dark:border-slate-600 dark:bg-slate-900" placeholder="e.g. 1 (seniority)" />
              </>
            )}
            {err && <p className="mt-3 text-sm text-rose-600">{err}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setModal(null)} disabled={busy} className="rounded-lg border px-4 py-2 text-sm font-medium dark:border-slate-600">Cancel</button>
              <button onClick={save} disabled={busy} className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60">{busy ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

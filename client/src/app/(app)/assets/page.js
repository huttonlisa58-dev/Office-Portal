'use client';
import { useCallback, useEffect, useState } from 'react';
import { Package, Plus, Pencil, Trash2 } from 'lucide-react';
import PageBanner from '@/components/PageBanner';
import Loader from '@/components/Loader';
import Modal from '@/components/Modal';
import { useAuth } from '@/context/AuthContext';
import { assets as api, employees as empApi } from '@/lib/db';

const STATUSES = ['AVAILABLE', 'ASSIGNED', 'IN_REPAIR', 'RETIRED'];
const tone = (s) => ({ AVAILABLE: 'bg-emerald-50 text-emerald-700', ASSIGNED: 'bg-sky-50 text-sky-700', IN_REPAIR: 'bg-amber-50 text-amber-700', RETIRED: 'bg-slate-100 text-slate-500' }[s] || 'bg-slate-100 text-slate-500');

export default function AssetsPage() {
  const { user } = useAuth();
  const canManage = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'MANAGER'].includes(user?.role);
  const [items, setItems] = useState([]);
  const [emps, setEmps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(null); // null | {} (new) | asset

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await api.list()); } catch { /* ignore */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); empApi.list({ limit: 100 }).then((r) => setEmps(r.items)).catch(() => {}); }, [load]);

  const remove = async (id) => { if (!confirm('Delete this asset?')) return; try { await api.remove(id); load(); } catch (e) { alert(e.message); } };

  return (
    <>
      <PageBanner icon={Package} title="Assets">
        {canManage && <button className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-sky-600 hover:bg-sky-50" onClick={() => setEdit({})}><Plus size={15} className="mr-1 inline" />Add asset</button>}
      </PageBanner>

      {loading ? <Loader /> : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-slate-400">
                {['Asset', 'Tag', 'Category', 'Assigned to', 'Status'].map((h) => <th key={h} className="px-5 py-3 font-medium">{h}</th>)}
                {canManage && <th className="px-5 py-3 font-medium text-right">Actions</th>}
              </tr></thead>
              <tbody>
                {items.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">No assets yet.</td></tr>}
                {items.map((a) => (
                  <tr key={a._id} className="border-b last:border-0">
                    <td className="px-5 py-3 font-medium">{a.name}</td>
                    <td className="px-5 py-3 text-slate-500">{a.tag || '—'}</td>
                    <td className="px-5 py-3 text-slate-500">{a.category || '—'}</td>
                    <td className="px-5 py-3 text-slate-500">{a.employee ? `${a.employee.name} (${a.employee.code})` : '—'}</td>
                    <td className="px-5 py-3"><span className={`badge ${tone(a.status)}`}>{a.status}</span></td>
                    {canManage && <td className="px-5 py-3"><div className="flex justify-end gap-1">
                      <button className="btn-ghost p-1.5" onClick={() => setEdit(a)}><Pencil size={15} /></button>
                      <button className="btn-ghost p-1.5 text-rose-500" onClick={() => remove(a._id)}><Trash2 size={15} /></button>
                    </div></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {edit && <AssetModal asset={edit} emps={emps} companyId={user?.company} onClose={() => setEdit(null)} onDone={load} />}
    </>
  );
}

function AssetModal({ asset, emps, companyId, onClose, onDone }) {
  const isNew = !asset._id;
  const [form, setForm] = useState({ name: asset.name || '', tag: asset.tag || '', category: asset.category || '', status: asset.status || 'AVAILABLE', assignedTo: asset.assignedTo || '', notes: asset.notes || '' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const save = async () => {
    setErr('');
    if (!form.name.trim()) { setErr('Asset name is required.'); return; }
    setBusy(true);
    try {
      const payload = { name: form.name.trim(), tag: form.tag || null, category: form.category || null, status: form.status, assigned_to: form.assignedTo || null, notes: form.notes || null };
      if (isNew) await api.create({ ...payload, company_id: companyId });
      else await api.update(asset._id, payload);
      onClose(); onDone();
    } catch (e) { setErr(e.message || 'Could not save'); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={isNew ? 'Add asset' : 'Edit asset'}>
      <div className="space-y-3">
        {err && <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div>}
        <div><label className="label">Asset name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="MacBook Pro 14" /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="label">Tag / serial</label><input className="input" value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} /></div>
          <div><label className="label">Category</label><input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Laptop" /></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="label">Status</label><select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Serial number, condition, warranty…" /></div>
          <div><label className="label">Assigned to</label><select className="input" value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}><option value="">— none —</option>{emps.map((e) => <option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>)}</select></div>
        </div>
        <div className="flex justify-end gap-2 pt-1"><button className="btn-outline" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={busy || !form.name} onClick={save}>{isNew ? 'Add' : 'Save'}</button></div>
      </div>
    </Modal>
  );
}

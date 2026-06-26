'use client';
import { useCallback, useEffect, useState } from 'react';
import { MapPin, Plus, Pencil, Trash2, Crosshair } from 'lucide-react';
import PageBanner from '@/components/PageBanner';
import Loader from '@/components/Loader';
import Modal from '@/components/Modal';
import { useAuth } from '@/context/AuthContext';
import { org } from '@/lib/db';

const blank = { name: '', address: '', latitude: '', longitude: '', radiusM: 200, isActive: true };

export default function OfficeLocationsPage() {
  const { user } = useAuth();
  const canManage = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR'].includes(user?.role);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await org.officeLocations()); } catch { /* ignore */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const remove = async (l) => { if (!confirm(`Delete "${l.name}"?`)) return; try { await org.delOfficeLocation(l._id); load(); } catch (e) { alert(e.message); } };

  return (
    <>
      <PageBanner icon={MapPin} title="Office Locations">
        {canManage && <button className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-sky-600 hover:bg-sky-50" onClick={() => setEditing(blank)}><Plus size={15} className="mr-1 inline" />Add location</button>}
      </PageBanner>

      <p className="mb-4 text-sm text-slate-500">Set latitude, longitude and a radius to enable <b>geo-fenced attendance</b> — employees can only punch in when physically within the radius of an active office.</p>

      {loading ? <Loader /> : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-slate-400">
                {['Name', 'Address', 'Coordinates', 'Radius', 'Status'].map((h) => <th key={h} className="px-5 py-3 font-medium">{h}</th>)}
                {canManage && <th className="px-5 py-3 font-medium text-right">Actions</th>}
              </tr></thead>
              <tbody>
                {items.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">No office locations yet.</td></tr>}
                {items.map((l) => (
                  <tr key={l._id} className="border-b last:border-0">
                    <td className="px-5 py-3 font-medium">{l.name}</td>
                    <td className="px-5 py-3 text-slate-500">{l.address || '—'}</td>
                    <td className="px-5 py-3 text-slate-500">{l.latitude != null && l.longitude != null ? `${Number(l.latitude).toFixed(5)}, ${Number(l.longitude).toFixed(5)}` : <span className="text-amber-500">not set (no geo-fence)</span>}</td>
                    <td className="px-5 py-3 text-slate-500">{l.radiusM ? `${l.radiusM} m` : '—'}</td>
                    <td className="px-5 py-3"><span className={`rounded-lg px-2 py-1 text-xs font-medium ${l.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{l.isActive ? 'Active' : 'Inactive'}</span></td>
                    {canManage && <td className="px-5 py-3 text-right">
                      <button className="btn-ghost p-1.5" title="Edit" onClick={() => setEditing(l)}><Pencil size={15} /></button>
                      <button className="btn-ghost p-1.5 text-rose-500" title="Delete" onClick={() => remove(l)}><Trash2 size={15} /></button>
                    </td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && <LocationModal initial={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); load(); }} companyId={user?.company} />}
    </>
  );
}

function LocationModal({ initial, onClose, onDone, companyId }) {
  const [form, setForm] = useState({ ...blank, ...initial });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const useMyLocation = () => {
    if (!('geolocation' in navigator)) { setErr('Geolocation not available in this browser'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => setForm((f) => ({ ...f, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) })),
      () => setErr('Could not get current location (permission denied?)'),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };
  const save = async () => {
    setErr(''); setBusy(true);
    const payload = {
      name: form.name, address: form.address,
      latitude: form.latitude === '' ? null : Number(form.latitude),
      longitude: form.longitude === '' ? null : Number(form.longitude),
      radiusM: form.radiusM === '' ? null : Number(form.radiusM),
      isActive: form.isActive !== false,
    };
    try {
      if (initial?._id) await org.updOfficeLocation(initial._id, payload);
      else await org.addOfficeLocation(companyId, payload);
      onDone();
    } catch (e) { setErr(e.message || 'Could not save'); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={initial?._id ? 'Edit location' : 'Add location'}
      footer={<><button className="btn-outline" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={busy || !form.name} onClick={save}>{busy ? 'Saving…' : 'Save'}</button></>}>
      {err && <div className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div>}
      <div className="grid gap-4">
        <div><label className="label">Location name</label><input className="input" value={form.name} onChange={set('name')} placeholder="e.g. Head Office" /></div>
        <div><label className="label">Address</label><input className="input" value={form.address || ''} onChange={set('address')} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Latitude</label><input type="number" step="any" className="input" value={form.latitude ?? ''} onChange={set('latitude')} placeholder="12.900000" /></div>
          <div><label className="label">Longitude</label><input type="number" step="any" className="input" value={form.longitude ?? ''} onChange={set('longitude')} placeholder="80.200000" /></div>
        </div>
        <button type="button" onClick={useMyLocation} className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"><Crosshair size={15} /> Use my current location</button>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Geo-fence radius (m)</label><input type="number" className="input" value={form.radiusM ?? ''} onChange={set('radiusM')} placeholder="200" /></div>
          <div><label className="label">Status</label><select className="input" value={form.isActive !== false ? '1' : '0'} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.value === '1' }))}><option value="1">Active</option><option value="0">Inactive</option></select></div>
        </div>
        <p className="text-xs text-slate-400">Leave latitude/longitude blank to disable geo-fencing for this office (attendance allowed from anywhere).</p>
      </div>
    </Modal>
  );
}

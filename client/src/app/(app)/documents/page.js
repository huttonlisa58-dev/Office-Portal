'use client';
import { useCallback, useEffect, useState } from 'react';
import { FolderOpen, Plus, Paperclip, Trash2, AlertTriangle } from 'lucide-react';
import PageBanner from '@/components/PageBanner';
import Loader from '@/components/Loader';
import Modal from '@/components/Modal';
import { useAuth } from '@/context/AuthContext';
import { documents as api, employees as empApi } from '@/lib/db';

const CATEGORIES = ['ID proof', 'Address proof', 'Contract', 'Certificate', 'Visa / Work permit', 'Insurance', 'Other'];
const fmtDate = (d) => d ? new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const daysTo = (d) => d ? Math.round((new Date(`${d}T00:00:00`) - new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00')) / 86400000) : null;

export default function DocumentsPage() {
  const { user } = useAuth();
  const canManage = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR'].includes(user?.role);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await api.list()); } catch { /* ignore */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const view = async (p) => { try { const url = await api.fileUrl(p); if (url) window.open(url, '_blank', 'noopener'); } catch (e) { alert(e.message); } };
  const remove = async (d) => { if (!confirm('Delete this document?')) return; try { await api.remove(d._id); load(); } catch (e) { alert(e.message); } };

  return (
    <>
      <PageBanner icon={FolderOpen} title="Documents">
        {canManage && <button className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-sky-600 hover:bg-sky-50" onClick={() => setOpen(true)}><Plus size={15} className="mr-1 inline" />Upload document</button>}
      </PageBanner>

      {loading ? <Loader /> : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-slate-400">
                {['Employee', 'Document', 'Category', 'Expiry', 'File'].map((h) => <th key={h} className="px-5 py-3 font-medium">{h}</th>)}
                {canManage && <th className="px-5 py-3 font-medium text-right">Action</th>}
              </tr></thead>
              <tbody>
                {items.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">No documents uploaded.</td></tr>}
                {items.map((d) => {
                  const dt = daysTo(d.expiryDate);
                  const expiring = dt != null && dt <= 30 && dt >= 0;
                  const expired = dt != null && dt < 0;
                  return (
                    <tr key={d._id} className="border-b last:border-0">
                      <td className="px-5 py-3 font-medium">{d.employee?.firstName} {d.employee?.lastName} <span className="text-xs text-slate-400">({d.employee?.employeeId})</span></td>
                      <td className="px-5 py-3">{d.name}</td>
                      <td className="px-5 py-3 text-slate-500">{d.category || '—'}</td>
                      <td className="px-5 py-3">
                        {d.expiryDate ? (
                          <span className={`inline-flex items-center gap-1 ${expired ? 'text-rose-600' : expiring ? 'text-amber-600' : 'text-slate-500'}`}>
                            {(expired || expiring) && <AlertTriangle size={13} />}{fmtDate(d.expiryDate)}
                            {expired ? ' (expired)' : expiring ? ` (${dt}d)` : ''}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-5 py-3">{d.filePath ? <button className="inline-flex items-center gap-1 text-sky-600 hover:underline" onClick={() => view(d.filePath)}><Paperclip size={13} /> View</button> : <span className="text-slate-300">—</span>}</td>
                      {canManage && <td className="px-5 py-3 text-right"><button className="btn-ghost p-1.5 text-rose-500" title="Delete" onClick={() => remove(d)}><Trash2 size={15} /></button></td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {open && <UploadModal onClose={() => setOpen(false)} onDone={() => { setOpen(false); load(); }} companyId={user?.company} />}
    </>
  );
}

function UploadModal({ onClose, onDone, companyId }) {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({ employeeId: '', name: '', category: 'ID proof', expiryDate: '' });
  const [file, setFile] = useState(null);
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  useEffect(() => { empApi.list({ limit: 200 }).then((r) => setEmployees(r.items)).catch(() => {}); }, []);
  const save = async () => {
    setErr(''); setBusy(true);
    try {
      let filePath = null;
      if (file) {
        if (file.size > 10 * 1024 * 1024) { setErr('File too large (max 10MB)'); setBusy(false); return; }
        filePath = await api.upload(file, companyId);
      }
      await api.create({ companyId, employeeId: form.employeeId, name: form.name, category: form.category, filePath, expiryDate: form.expiryDate || null });
      onDone();
    } catch (e) { setErr(e.message || 'Could not save'); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title="Upload document"
      footer={<><button className="btn-outline" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={busy || !form.employeeId || !form.name} onClick={save}>{busy ? 'Saving…' : 'Save'}</button></>}>
      {err && <div className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div>}
      <div className="grid gap-4">
        <div><label className="label">Employee</label>
          <select className="input" value={form.employeeId} onChange={set('employeeId')}>
            <option value="">— select —</option>
            {employees.map((e) => <option key={e._id} value={e._id}>{e.firstName} {e.lastName} ({e.employeeId})</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Document name</label><input className="input" value={form.name} onChange={set('name')} placeholder="e.g. Passport" /></div>
          <div><label className="label">Category</label><select className="input" value={form.category} onChange={set('category')}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
        </div>
        <div><label className="label">Expiry date <span className="font-normal text-slate-400">(optional — triggers alerts)</span></label><input type="date" className="input" value={form.expiryDate} onChange={set('expiryDate')} /></div>
        <div><label className="label">File <span className="font-normal text-slate-400">(optional, max 10MB)</span></label>
          <input type="file" className="input" accept="image/*,application/pdf,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          {file && <p className="mt-1 text-xs text-slate-400">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</p>}
        </div>
      </div>
    </Modal>
  );
}

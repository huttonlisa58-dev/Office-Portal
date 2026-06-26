'use client';
import { useCallback, useEffect, useState } from 'react';
import { TrendingUp, Plus, ArrowRight } from 'lucide-react';
import PageBanner from '@/components/PageBanner';
import Loader from '@/components/Loader';
import Modal from '@/components/Modal';
import { useAuth } from '@/context/AuthContext';
import { money } from '@/lib/format';
import { salaryRevisions as api, employees as empApi } from '@/lib/db';

const fmtDate = (d) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
const pct = (o, n) => (o && n != null ? `${(((n - o) / o) * 100).toFixed(1)}%` : '—');

export default function SalaryRevisionsPage() {
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

  return (
    <>
      <PageBanner icon={TrendingUp} title="Salary revisions">
        {canManage && <button className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-sky-600 hover:bg-sky-50" onClick={() => setOpen(true)}><Plus size={15} className="mr-1 inline" />Add revision</button>}
      </PageBanner>

      {loading ? <Loader /> : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-slate-400">
                {['Employee', 'Effective date', 'Old CTC', 'New CTC', 'Change', 'Reason'].map((h) => <th key={h} className="px-5 py-3 font-medium">{h}</th>)}
              </tr></thead>
              <tbody>
                {items.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">No salary revisions recorded.</td></tr>}
                {items.map((r) => {
                  const up = r.oldCtc != null && r.newCtc > r.oldCtc;
                  const down = r.oldCtc != null && r.newCtc < r.oldCtc;
                  return (
                    <tr key={r._id} className="border-b last:border-0">
                      <td className="px-5 py-3 font-medium">{r.employee?.firstName} {r.employee?.lastName} <span className="text-xs text-slate-400">({r.employee?.employeeId})</span></td>
                      <td className="px-5 py-3 text-slate-500">{fmtDate(r.effectiveDate)}</td>
                      <td className="px-5 py-3 text-slate-500">{r.oldCtc != null ? money(r.oldCtc, 'INR') : '—'}</td>
                      <td className="px-5 py-3 font-semibold">{money(r.newCtc, 'INR')}</td>
                      <td className={`px-5 py-3 font-medium ${up ? 'text-emerald-600' : down ? 'text-rose-600' : 'text-slate-400'}`}>{up ? '▲' : down ? '▼' : ''} {pct(r.oldCtc, r.newCtc)}</td>
                      <td className="px-5 py-3 text-slate-500">{r.reason || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {open && <RevisionModal onClose={() => setOpen(false)} onDone={() => { setOpen(false); load(); }} companyId={user?.company} />}
    </>
  );
}

function RevisionModal({ onClose, onDone, companyId }) {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({ employeeId: '', effectiveDate: new Date().toISOString().slice(0, 10), oldCtc: '', newCtc: '', reason: '' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => { empApi.list({ limit: 200 }).then((r) => setEmployees(r.items)).catch(() => {}); }, []);
  // prefill old CTC from the most recent revision when picking an employee
  useEffect(() => {
    if (!form.employeeId) return;
    api.latestCtc(form.employeeId).then((c) => { if (c != null) setForm((f) => ({ ...f, oldCtc: f.oldCtc === '' ? String(c) : f.oldCtc })); }).catch(() => {});
  }, [form.employeeId]);

  const save = async () => {
    setErr(''); setBusy(true);
    try {
      await api.create({ companyId, employeeId: form.employeeId, effectiveDate: form.effectiveDate, oldCtc: form.oldCtc, newCtc: form.newCtc, reason: form.reason });
      onDone();
    } catch (e) { setErr(e.message || 'Could not save'); } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title="Add salary revision"
      footer={<><button className="btn-outline" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={busy || !form.employeeId || !form.newCtc} onClick={save}>{busy ? 'Saving…' : 'Save'}</button></>}>
      {err && <div className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div>}
      <div className="grid gap-4">
        <div><label className="label">Employee</label>
          <select className="input" value={form.employeeId} onChange={set('employeeId')}>
            <option value="">— select —</option>
            {employees.map((e) => <option key={e._id} value={e._id}>{e.firstName} {e.lastName} ({e.employeeId})</option>)}
          </select>
        </div>
        <div><label className="label">Effective date</label><input type="date" className="input" value={form.effectiveDate} onChange={set('effectiveDate')} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Old CTC (annual)</label><input type="number" className="input" value={form.oldCtc} onChange={set('oldCtc')} placeholder="auto" /></div>
          <div><label className="label">New CTC (annual)</label><input type="number" className="input" value={form.newCtc} onChange={set('newCtc')} /></div>
        </div>
        <div><label className="label">Reason</label><textarea className="input" rows={2} value={form.reason} onChange={set('reason')} placeholder="Annual appraisal, promotion, etc." /></div>
      </div>
    </Modal>
  );
}

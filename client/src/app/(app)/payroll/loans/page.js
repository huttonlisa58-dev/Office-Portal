'use client';
import { useCallback, useEffect, useState } from 'react';
import { Landmark, Plus, Check } from 'lucide-react';
import PageBanner from '@/components/PageBanner';
import Loader from '@/components/Loader';
import Modal from '@/components/Modal';
import { useAuth } from '@/context/AuthContext';
import { money } from '@/lib/format';
import { loans as api, employees as empApi } from '@/lib/db';

const TYPES = ['LOAN', 'ADVANCE'];
const fmtDate = (d) => d ? new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const tone = (s) => (s === 'CLOSED' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700');

export default function LoansPage() {
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

  const close = async (l) => { if (!confirm('Mark this loan as fully settled?')) return; try { await api.close(l._id); load(); } catch (e) { alert(e.message); } };

  return (
    <>
      <PageBanner icon={Landmark} title="Loans & advances">
        {canManage && <button className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-sky-600 hover:bg-sky-50" onClick={() => setOpen(true)}><Plus size={15} className="mr-1 inline" />New loan / advance</button>}
      </PageBanner>

      {loading ? <Loader /> : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-slate-400">
                {['Employee', 'Type', 'Principal', 'EMI', 'Outstanding', 'Started', 'Status'].map((h) => <th key={h} className="px-5 py-3 font-medium">{h}</th>)}
                {canManage && <th className="px-5 py-3 font-medium text-right">Action</th>}
              </tr></thead>
              <tbody>
                {items.length === 0 && <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-400">No loans or advances recorded.</td></tr>}
                {items.map((l) => (
                  <tr key={l._id} className="border-b last:border-0">
                    <td className="px-5 py-3 font-medium">{l.employee?.firstName} {l.employee?.lastName} <span className="text-xs text-slate-400">({l.employee?.employeeId})</span></td>
                    <td className="px-5 py-3 text-slate-500">{l.type === 'ADVANCE' ? 'Salary advance' : 'Loan'}</td>
                    <td className="px-5 py-3">{money(l.principal, l.currency)}</td>
                    <td className="px-5 py-3 text-slate-500">{l.emi ? money(l.emi, l.currency) : '—'}</td>
                    <td className="px-5 py-3 font-semibold">{money(l.outstanding, l.currency)}</td>
                    <td className="px-5 py-3 text-slate-500">{fmtDate(l.startDate)}</td>
                    <td className="px-5 py-3"><span className={`rounded-lg px-2 py-1 text-xs font-medium ${tone(l.status)}`}>{l.status}</span></td>
                    {canManage && <td className="px-5 py-3 text-right">
                      {l.status === 'ACTIVE' ? <button className="btn-ghost p-1.5 text-emerald-600" title="Mark settled" onClick={() => close(l)}><Check size={16} /></button> : <span className="text-xs text-slate-300">—</span>}
                    </td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {open && <LoanModal onClose={() => setOpen(false)} onDone={() => { setOpen(false); load(); }} companyId={user?.company} />}
    </>
  );
}

function LoanModal({ onClose, onDone, companyId }) {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({ employeeId: '', type: 'LOAN', principal: '', emi: '', startDate: new Date().toISOString().slice(0, 10), remarks: '' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  useEffect(() => { empApi.list({ limit: 200 }).then((r) => setEmployees(r.items)).catch(() => {}); }, []);
  const save = async () => {
    setErr('');
    if (!form.employeeId) { setErr('Pick an employee.'); return; }
    const principal = Number(form.principal || 0);
    const emi = Number(form.emi || 0);
    if (!(principal > 0)) { setErr('Principal must be greater than 0.'); return; }
    if (!(emi > 0)) { setErr('EMI must be greater than 0.'); return; }
    if (emi > principal) { setErr('EMI cannot be larger than the principal.'); return; }
    if (!form.startDate) { setErr('Pick a start date.'); return; }
    setBusy(true);
    try { await api.create({ companyId, ...form }); onDone(); }
    catch (e) { setErr(e.message || 'Could not save'); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title="New loan / advance"
      footer={<><button className="btn-outline" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={busy || !form.employeeId || !form.principal} onClick={save}>{busy ? 'Saving…' : 'Save'}</button></>}>
      {err && <div className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div>}
      <div className="grid gap-4">
        <div><label className="label">Employee</label>
          <select className="input" value={form.employeeId} onChange={set('employeeId')}>
            <option value="">— select —</option>
            {employees.map((e) => <option key={e._id} value={e._id}>{e.firstName} {e.lastName} ({e.employeeId})</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Type</label><select className="input" value={form.type} onChange={set('type')}>{TYPES.map((t) => <option key={t} value={t}>{t === 'ADVANCE' ? 'Salary advance' : 'Loan'}</option>)}</select></div>
          <div><label className="label">Start date</label><input type="date" className="input" value={form.startDate} onChange={set('startDate')} /></div>
          <div><label className="label">Principal</label><input type="number" className="input" value={form.principal} onChange={set('principal')} /></div>
          <div><label className="label">Monthly EMI</label><input type="number" className="input" value={form.emi} onChange={set('emi')} placeholder="auto-deducted in payroll" /></div>
        </div>
        <div><label className="label">Remarks</label><textarea className="input" rows={2} value={form.remarks} onChange={set('remarks')} /></div>
        <p className="text-xs text-slate-400">The EMI is automatically deducted on each payroll run and reduces the outstanding balance until it reaches zero.</p>
      </div>
    </Modal>
  );
}

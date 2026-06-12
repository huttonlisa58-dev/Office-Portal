'use client';
import { useCallback, useEffect, useState } from 'react';
import { Receipt, Plus, Check, X } from 'lucide-react';
import PageBanner from '@/components/PageBanner';
import Loader from '@/components/Loader';
import Modal from '@/components/Modal';
import { useAuth } from '@/context/AuthContext';
import { money } from '@/lib/format';
import { expenses as api } from '@/lib/db';

const CATS = ['Travel', 'Food', 'Accommodation', 'Office supplies', 'Software', 'Other'];
const tone = (s) => ({ PENDING: 'bg-amber-50 text-amber-700', APPROVED: 'bg-emerald-50 text-emerald-700', REJECTED: 'bg-rose-50 text-rose-700' }[s] || 'bg-slate-100 text-slate-500');
const fmt = (d) => new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });

export default function ExpensesPage() {
  const { user } = useAuth();
  const canDecide = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'MANAGER'].includes(user?.role);
  const hasEmployee = Boolean(user?.employee);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await api.list()); } catch { /* ignore */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const decide = async (id, status) => { try { await api.decide(id, status); load(); } catch (e) { alert(e.message); } };

  return (
    <>
      <PageBanner icon={Receipt} title="Expenses & reimbursement">
        {hasEmployee && <button className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-sky-600 hover:bg-sky-50" onClick={() => setOpen(true)}><Plus size={15} className="mr-1 inline" />Submit expense</button>}
      </PageBanner>

      {loading ? <Loader /> : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-slate-400">
                {['Date', 'Employee', 'Category', 'Amount', 'Description', 'Status'].map((h) => <th key={h} className="px-5 py-3 font-medium">{h}</th>)}
                {canDecide && <th className="px-5 py-3 font-medium text-right">Action</th>}
              </tr></thead>
              <tbody>
                {items.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">No expenses submitted.</td></tr>}
                {items.map((x) => (
                  <tr key={x._id} className="border-b last:border-0">
                    <td className="px-5 py-3 font-medium">{fmt(x.date)}</td>
                    <td className="px-5 py-3 text-slate-500">{x.employee?.name || '—'}</td>
                    <td className="px-5 py-3 text-slate-500">{x.category || '—'}</td>
                    <td className="px-5 py-3 font-semibold">{money(x.amount, x.currency)}</td>
                    <td className="px-5 py-3 text-slate-500">{x.description || '—'}</td>
                    <td className="px-5 py-3"><span className={`badge ${tone(x.status)}`}>{x.status}</span></td>
                    {canDecide && <td className="px-5 py-3"><div className="flex justify-end gap-1">
                      {x.status === 'PENDING' ? (<>
                        <button className="btn-ghost p-1.5 text-emerald-600" title="Approve" onClick={() => decide(x._id, 'APPROVED')}><Check size={16} /></button>
                        <button className="btn-ghost p-1.5 text-rose-500" title="Reject" onClick={() => decide(x._id, 'REJECTED')}><X size={16} /></button>
                      </>) : <span className="text-xs text-slate-300">—</span>}
                    </div></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {open && <ExpenseModal companyId={user?.company} employeeId={user?.employee} onClose={() => setOpen(false)} onDone={load} />}
    </>
  );
}

function ExpenseModal({ companyId, employeeId, onClose, onDone }) {
  const [form, setForm] = useState({ category: 'Travel', amount: '', currency: 'INR', date: new Date().toISOString().slice(0, 10), description: '' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const save = async () => {
    setErr(''); setBusy(true);
    try {
      await api.create({ company_id: companyId, employee_id: employeeId, category: form.category, amount: Number(form.amount || 0), currency: form.currency, expense_date: form.date, description: form.description || null, status: 'PENDING' });
      onClose(); onDone();
    } catch (e) { setErr(e.message || 'Could not submit'); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title="Submit expense">
      <div className="space-y-3">
        {err && <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="label">Category</label><select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATS.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
          <div><label className="label">Date</label><input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="label">Amount</label><input type="number" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
          <div><label className="label">Currency</label><select className="input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>{['INR', 'USD', 'EUR', 'GBP', 'AED'].map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
        </div>
        <div><label className="label">Description</label><textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div className="flex justify-end gap-2 pt-1"><button className="btn-outline" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={busy || !form.amount} onClick={save}>Submit</button></div>
      </div>
    </Modal>
  );
}

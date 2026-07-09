'use client';
import { useCallback, useEffect, useState } from 'react';
import { Receipt, Plus, Check, X, Paperclip } from 'lucide-react';
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
  const [filter, setFilter] = useState('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await api.list({ role: user?.role, employeeId: user?.employee })); } catch { /* ignore */ } finally { setLoading(false); }
  }, [user]);
  useEffect(() => { load(); }, [load]);

  const decide = async (id, status) => { try { await api.decide(id, status); load(); } catch (e) { alert(e.message); } };
  const openReceipt = async (path) => { try { const url = await api.receiptUrl(path); if (url) window.open(url, '_blank', 'noopener'); } catch (e) { alert(e.message || 'Could not open receipt'); } };

  const summary = items.reduce((a, x) => { a[x.status] = (a[x.status] || 0) + 1; if (x.status === 'APPROVED') a.approvedAmt += Number(x.amount || 0); if (x.status === 'PENDING') a.pendingAmt += Number(x.amount || 0); return a; }, { PENDING: 0, APPROVED: 0, REJECTED: 0, approvedAmt: 0, pendingAmt: 0 });
  const shown = filter === 'ALL' ? items : items.filter((x) => x.status === filter);

  return (
    <>
      <PageBanner icon={Receipt} title="Expenses & reimbursement">
        {hasEmployee && <button className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-sky-600 hover:bg-sky-50" onClick={() => setOpen(true)}><Plus size={15} className="mr-1 inline" />Submit expense</button>}
      </PageBanner>

      {loading ? <Loader /> : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="card p-4"><div className="text-xs text-slate-400">Pending</div><div className="mt-1 text-xl font-semibold text-amber-600">{summary.PENDING}</div><div className="text-[11px] text-slate-400">{money(summary.pendingAmt, 'INR')}</div></div>
            <div className="card p-4"><div className="text-xs text-slate-400">Approved</div><div className="mt-1 text-xl font-semibold text-emerald-600">{summary.APPROVED}</div><div className="text-[11px] text-slate-400">{money(summary.approvedAmt, 'INR')}</div></div>
            <div className="card p-4"><div className="text-xs text-slate-400">Rejected</div><div className="mt-1 text-xl font-semibold text-rose-600">{summary.REJECTED}</div></div>
            <div className="card p-4"><div className="text-xs text-slate-400">Total claims</div><div className="mt-1 text-xl font-semibold">{items.length}</div></div>
          </div>

          <div className="mb-3 flex flex-wrap gap-1.5">
            {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${filter === f ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}>{f[0] + f.slice(1).toLowerCase()}</button>
            ))}
          </div>

          <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-slate-400">
                {['Date', 'Employee', 'Category', 'Amount', 'Description', 'Receipt', 'Status'].map((h) => <th key={h} className="px-5 py-3 font-medium">{h}</th>)}
                {canDecide && <th className="px-5 py-3 font-medium text-right">Action</th>}
              </tr></thead>
              <tbody>
                {shown.length === 0 && <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-400">No expenses{filter !== 'ALL' ? ` (${filter.toLowerCase()})` : ' submitted'}.</td></tr>}
                {shown.map((x) => (
                  <tr key={x._id} className="border-b last:border-0">
                    <td className="px-5 py-3 font-medium">{fmt(x.date)}</td>
                    <td className="px-5 py-3 text-slate-500">{x.employee?.name || '—'}</td>
                    <td className="px-5 py-3 text-slate-500">{x.category || '—'}</td>
                    <td className="px-5 py-3 font-semibold">{money(x.amount, x.currency)}</td>
                    <td className="px-5 py-3 text-slate-500">{x.description || '—'}</td>
                    <td className="px-5 py-3">{x.receiptPath ? <button className="inline-flex items-center gap-1 text-sky-600 hover:underline" onClick={() => openReceipt(x.receiptPath)}><Paperclip size={13} /> View</button> : <span className="text-slate-300">—</span>}</td>
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
        </>
      )}

      {open && <ExpenseModal companyId={user?.company} employeeId={user?.employee} onClose={() => setOpen(false)} onDone={load} />}
    </>
  );
}

function ExpenseModal({ companyId, employeeId, onClose, onDone }) {
  const [form, setForm] = useState({ category: 'Travel', amount: '', currency: 'INR', date: new Date().toISOString().slice(0, 10), description: '' });
  const [file, setFile] = useState(null);
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const save = async () => {
    setErr('');
    if (!form.date) { setErr('Pick the expense date.'); return; }
    if (form.date > new Date().toISOString().slice(0, 10)) { setErr('Expense date cannot be in the future.'); return; }
    if (!(Number(form.amount) > 0)) { setErr('Amount must be greater than 0.'); return; }
    setBusy(true);
    try {
      let receipt_path = null;
      if (file) {
        if (file.size > 8 * 1024 * 1024) { setErr('File too large (max 8MB)'); setBusy(false); return; }
        receipt_path = await api.uploadReceipt(file, companyId);
      }
      await api.create({ company_id: companyId, employee_id: employeeId, category: form.category, amount: Number(form.amount || 0), currency: form.currency, expense_date: form.date, description: form.description || null, status: 'PENDING', receipt_path });
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
        <div><label className="label">Receipt <span className="font-normal text-slate-400">(optional, max 8MB)</span></label>
          <input type="file" className="input" accept="image/*,application/pdf,.csv,.xlsx,.xls,.doc,.docx,.zip" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          {file && <p className="mt-1 text-xs text-slate-400">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</p>}
        </div>
        <div className="flex justify-end gap-2 pt-1"><button className="btn-outline" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={busy || !form.amount} onClick={save}>Submit</button></div>
      </div>
    </Modal>
  );
}

'use client';
import { useCallback, useEffect, useState } from 'react';
import { Coins, Plus, Check, X } from 'lucide-react';
import PageBanner from '@/components/PageBanner';
import Loader from '@/components/Loader';
import Modal from '@/components/Modal';
import { EmptyState, StatusBadge } from '@/components/ui';
import { money } from '@/lib/format';
import { useAuth } from '@/context/AuthContext';
import { leaveEncashment as api, leaves as leaveApi } from '@/lib/db';

const TYPES = ['EARNED', 'CASUAL', 'SICK', 'COMPOFF'];
const fmt = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export default function EncashmentPage() {
  const { user } = useAuth();
  const canManage = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR'].includes(user?.role);
  const hasEmployee = !!user?.employee;
  const [items, setItems] = useState(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try { setItems(await api.list()); } catch { setItems([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const decide = async (row, approve) => {
    if (!window.confirm(`${approve ? 'Approve' : 'Reject'} encashment of ${row.days} day(s) ${row.leaveType} for ${row.employee?.firstName || ''}?${approve ? ' Approved days will be deducted from the balance.' : ''}`)) return;
    try { await api.decide(row._id, approve); load(); }
    catch (e) { window.alert(e.message || 'Action failed'); }
  };

  const mine = canManage ? items : (items || []).filter((r) => r.employee?.employeeId === user?.employeeCode);

  return (
    <>
      <PageBanner icon={Coins} title="Leave encashment">
        {hasEmployee && <button className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-sky-600 hover:bg-sky-50" onClick={() => setOpen(true)}><Plus size={15} className="mr-1 inline" />Request encashment</button>}
      </PageBanner>

      {items === null ? <Loader /> : (
        <div className="card overflow-hidden">
          <div className="border-b px-5 py-3 font-semibold dark:border-slate-700">{canManage ? 'All encashment requests' : 'My encashment requests'}</div>
          {(mine || []).length === 0 ? <EmptyState title="No encashment requests" subtitle="Convert unused leave to cash by raising a request." /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-slate-400 dark:border-slate-700">
                  {['Employee', 'Leave type', 'Days', 'Amount', 'Requested', 'Status'].map((h) => <th key={h} className="px-5 py-3 font-medium">{h}</th>)}
                  {canManage && <th className="px-5 py-3 text-right font-medium">Action</th>}
                </tr></thead>
                <tbody>
                  {(mine || []).map((r) => (
                    <tr key={r._id} className="border-b last:border-0 dark:border-slate-700">
                      <td className="px-5 py-3">{r.employee ? `${r.employee.firstName} ${r.employee.lastName || ''}` : '—'}<div className="text-[10px] text-slate-400">{r.employee?.employeeId}</div></td>
                      <td className="px-5 py-3">{r.leaveType}</td>
                      <td className="px-5 py-3">{r.days}</td>
                      <td className="px-5 py-3">{money(r.amount, 'INR')}</td>
                      <td className="px-5 py-3 text-slate-500">{fmt(r.requestedOn)}</td>
                      <td className="px-5 py-3"><StatusBadge status={r.status} /></td>
                      {canManage && <td className="px-5 py-3 text-right">
                        {r.status === 'PENDING' ? (
                          <div className="flex justify-end gap-1">
                            <button className="btn-ghost p-1.5 text-emerald-600" title="Approve" onClick={() => decide(r, true)}><Check size={16} /></button>
                            <button className="btn-ghost p-1.5 text-rose-500" title="Reject" onClick={() => decide(r, false)}><X size={16} /></button>
                          </div>
                        ) : <span className="text-xs text-slate-400">—</span>}
                      </td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {open && <RequestModal user={user} onClose={() => setOpen(false)} onDone={() => { setOpen(false); load(); }} />}
    </>
  );
}

function RequestModal({ user, onClose, onDone }) {
  const [bal, setBal] = useState(null);
  const [form, setForm] = useState({ leaveType: 'EARNED', days: '', amount: '' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { if (user?.employee) leaveApi.balance(user.employee).then(setBal).catch(() => setBal(null)); }, [user]);
  const available = bal?.balances ? (bal.balances[form.leaveType] ?? null) : null;

  const save = async () => {
    setErr('');
    const d = Number(form.days);
    if (!d || d <= 0) { setErr('Enter the number of days.'); return; }
    if (available != null && d > available) { setErr(`Only ${available} day(s) of ${form.leaveType} available.`); return; }
    setBusy(true);
    try { await api.request({ companyId: user.company, employeeId: user.employee, leaveType: form.leaveType, days: d, amount: form.amount }); onDone(); }
    catch (e) { setErr(e.message || 'Could not submit'); } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title="Request leave encashment"
      footer={<><button className="btn-outline" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={save} disabled={busy}>{busy ? 'Submitting…' : 'Submit request'}</button></>}>
      <div className="space-y-3">
        {err && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-950/40">{err}</div>}
        <div>
          <label className="label">Leave type</label>
          <select className="input" value={form.leaveType} onChange={(e) => setForm({ ...form, leaveType: e.target.value })}>{TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
          {available != null && <p className="mt-1 text-xs text-slate-400">Available: {available} day(s)</p>}
        </div>
        <div><label className="label">Days to encash</label><input type="number" min="0" step="0.5" className="input" value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} /></div>
        <div><label className="label">Amount <span className="font-normal text-slate-400">(₹, optional — HR confirms)</span></label><input type="number" min="0" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
      </div>
    </Modal>
  );
}

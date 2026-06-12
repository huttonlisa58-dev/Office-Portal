'use client';
import { useCallback, useEffect, useState } from 'react';
import { Plane, Plus, Check, X } from 'lucide-react';
import PageBanner from '@/components/PageBanner';
import Loader from '@/components/Loader';
import Modal from '@/components/Modal';
import { StatusBadge } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { leaves as leaveApi } from '@/lib/db';

const TYPES = ['CASUAL', 'SICK', 'EARNED', 'UNPAID'];
const fmt = (d) => d ? new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// quota per type (annual)
const CARDS = [
  { key: 'EARNED', label: 'Earned Leave', quota: 15, color: '#0ea5e9' },
  { key: 'SICK', label: 'Sick Leave', quota: 10, color: '#f97316' },
  { key: 'CASUAL', label: 'Casual Leave', quota: 12, color: '#14b8a6' },
  { key: 'COMPOFF', label: 'Comp-off', quota: 0, color: '#8b5cf6' },
];

function Donut({ available, quota, color }) {
  const r = 42, c = 2 * Math.PI * r;
  const pct = quota > 0 ? Math.min(available / quota, 1) : 0;
  return (
    <svg viewBox="0 0 100 100" className="h-28 w-28">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#e2e8f0" strokeWidth="9" className="dark:stroke-slate-700" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
        strokeDasharray={`${pct * c} ${c}`} transform="rotate(-90 50 50)" />
      <text x="50" y="48" textAnchor="middle" className="fill-slate-800 dark:fill-slate-100" style={{ fontSize: 16, fontWeight: 700 }}>{available}</text>
      <text x="50" y="62" textAnchor="middle" className="fill-slate-400" style={{ fontSize: 8 }}>days</text>
    </svg>
  );
}

function LegendRow({ color, label, value }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="flex items-center gap-1.5 text-slate-500"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />{label}</span>
      <span className="font-medium text-slate-700 dark:text-slate-200">{value}</span>
    </div>
  );
}

export default function LeavesPage() {
  const { user, company } = useAuth();
  const hasEmployee = Boolean(user?.employee);
  const [items, setItems] = useState([]);
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: 'CASUAL', from: '', to: '', reason: '' });
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const calls = [leaveApi.list()];
      if (hasEmployee) calls.push(leaveApi.balance(user?.employee));
      const [list, bal] = await Promise.all(calls);
      setItems(list);
      if (bal?.balances) setBalances(bal.balances);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [hasEmployee, user]);

  useEffect(() => { load(); }, [load]);

  const mine = hasEmployee ? items.filter((l) => l.employee && l.employee.employeeId === user?.employeeCode) : items;

  const submit = async () => {
    setErr('');
    if (!form.from || !form.to) { setErr('Pick both dates'); return; }
    try {
      await leaveApi.apply({ company_id: user?.company, employee_id: user?.employee, type: form.type, from: form.from, to: form.to, reason: form.reason });
      setOpen(false); setForm({ type: 'CASUAL', from: '', to: '', reason: '' }); load();
    } catch (e) { setErr(e.message || 'Could not apply'); }
  };

  const year = new Date().getFullYear();

  return (
    <>
      <PageBanner icon={Plane} title="My Leaves">
        <span className="hidden text-sm text-sky-100 sm:inline">1 Jan {year} – 31 Dec {year}</span>
        {hasEmployee && <button className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-sky-600 hover:bg-sky-50" onClick={() => setOpen(true)}><Plus size={15} className="mr-1 inline" />APPLY LEAVE</button>}
      </PageBanner>

      {loading ? <Loader /> : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {CARDS.map((cd) => {
              const available = cd.key === 'COMPOFF' ? 0 : (balances[cd.key] ?? 0);
              const consumed = Math.max(cd.quota - available, 0);
              return (
                <div key={cd.key} className="card p-5">
                  <h3 className="mb-3 text-center font-semibold">{cd.label}</h3>
                  <div className="flex items-center gap-3">
                    <Donut available={available} quota={cd.quota} color={cd.color} />
                    <div className="flex-1 space-y-1.5">
                      <LegendRow color={cd.color} label="Annual quota" value={cd.quota} />
                      <LegendRow color="#94a3b8" label="Available" value={available} />
                      <LegendRow color="#334155" label="Consumed" value={consumed} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card overflow-hidden">
            <div className="border-b px-5 py-3 font-semibold">Leave applications</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-slate-400">
                  {['Start date', 'End date', 'Leave type', 'Applied by', 'Approval status', 'Leave count', 'LOP days', 'Applied date'].map((h) => <th key={h} className="px-5 py-3 font-medium">{h}</th>)}
                </tr></thead>
                <tbody>
                  {mine.length === 0 && <tr><td colSpan={8} className="px-5 py-8 text-center text-slate-400">No leave applications yet.</td></tr>}
                  {mine.map((l) => (
                    <tr key={l._id} className="border-b last:border-0">
                      <td className="px-5 py-3 font-medium">{fmt(l.from)}</td>
                      <td className="px-5 py-3">{fmt(l.to)}</td>
                      <td className="px-5 py-3">{l.type}</td>
                      <td className="px-5 py-3 text-slate-500">{l.employee ? `${l.employee.firstName} ${l.employee.lastName || ''}` : '—'}</td>
                      <td className="px-5 py-3"><StatusBadge status={l.status} /></td>
                      <td className="px-5 py-3">{l.days} day(s)</td>
                      <td className="px-5 py-3 text-slate-400">-</td>
                      <td className="px-5 py-3 text-slate-500">{fmt(l.from)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Apply for leave">
        <div className="space-y-3">
          {err && <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div>}
          <div><label className="label">Leave type</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="label">From</label><input type="date" className="input" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} /></div>
            <div><label className="label">To</label><input type="date" className="input" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} /></div>
          </div>
          <div><label className="label">Reason</label><textarea className="input" rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
          <div className="flex justify-end gap-2 pt-1">
            <button className="btn-outline" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={submit}>Submit</button>
          </div>
        </div>
      </Modal>
    </>
  );
}

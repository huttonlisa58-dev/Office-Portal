'use client';
import { useCallback, useEffect, useState } from 'react';
import { Clock, Plus, Check, X } from 'lucide-react';
import PageBanner from '@/components/PageBanner';
import Loader from '@/components/Loader';
import Modal from '@/components/Modal';
import { useAuth } from '@/context/AuthContext';
import { attendanceReq as api } from '@/lib/db';

const tone = (s) => ({ PENDING: 'bg-amber-50 text-amber-700', APPROVED: 'bg-emerald-50 text-emerald-700', REJECTED: 'bg-rose-50 text-rose-700' }[s] || 'bg-slate-100 text-slate-500');
const fmtDate = (d) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
const fmtTime = (ts) => ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

export default function RegularizePage() {
  const { user } = useAuth();
  const canDecide = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'MANAGER'].includes(user?.role);
  const hasEmployee = Boolean(user?.employee);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let list = await api.list();
      if (!canDecide && user?.employee) list = list.filter((x) => x.employeeId === user.employee);
      setItems(list);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [canDecide, user]);
  useEffect(() => { load(); }, [load]);

  const decide = async (id, status) => { try { await api.decide(id, status); load(); } catch (e) { alert(e.message); } };

  return (
    <>
      <PageBanner icon={Clock} title="Attendance regularization">
        {hasEmployee && <button className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-sky-600 hover:bg-sky-50" onClick={() => setOpen(true)}><Plus size={15} className="mr-1 inline" />New request</button>}
      </PageBanner>

      {loading ? <Loader /> : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-slate-400">
                {['Date', 'Employee', 'Check-in', 'Check-out', 'Reason', 'Status'].map((h) => <th key={h} className="px-5 py-3 font-medium">{h}</th>)}
                {canDecide && <th className="px-5 py-3 font-medium text-right">Action</th>}
              </tr></thead>
              <tbody>
                {items.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">No regularization requests yet.</td></tr>}
                {items.map((x) => (
                  <tr key={x._id} className="border-b last:border-0">
                    <td className="px-5 py-3 font-medium">{fmtDate(x.date)}</td>
                    <td className="px-5 py-3 text-slate-500">{x.employee?.firstName} {x.employee?.lastName} <span className="text-xs text-slate-400">({x.employee?.employeeId})</span></td>
                    <td className="px-5 py-3">{fmtTime(x.checkIn)}</td>
                    <td className="px-5 py-3">{fmtTime(x.checkOut)}</td>
                    <td className="px-5 py-3 text-slate-500">{x.remarks || '—'}</td>
                    <td className="px-5 py-3"><span className={`rounded-lg px-2 py-1 text-xs font-medium ${tone(x.status)}`}>{x.status}</span></td>
                    {canDecide && <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        {x.status === 'PENDING' ? (<>
                          <button className="btn-ghost p-1.5 text-emerald-600" title="Approve" onClick={() => decide(x._id, 'APPROVED')}><Check size={16} /></button>
                          <button className="btn-ghost p-1.5 text-rose-500" title="Reject" onClick={() => decide(x._id, 'REJECTED')}><X size={16} /></button>
                        </>) : <span className="text-xs text-slate-300">—</span>}
                      </div>
                    </td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {open && <RequestModal onClose={() => setOpen(false)} onDone={() => { setOpen(false); load(); }} companyId={user?.company} employeeId={user?.employee} />}
    </>
  );
}

function RequestModal({ onClose, onDone, companyId, employeeId }) {
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), checkIn: '09:30', checkOut: '18:30', remarks: '' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const save = async () => {
    setErr(''); setBusy(true);
    try {
      await api.create({ companyId, employeeId, date: form.date, checkIn: form.checkIn, checkOut: form.checkOut || null, remarks: form.remarks });
      onDone();
    } catch (e) { setErr(e.message || 'Could not submit'); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title="Attendance regularization"
      footer={<><button className="btn-outline" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={busy || !form.date || !form.checkIn} onClick={save}>{busy ? 'Submitting…' : 'Submit'}</button></>}>
      {err && <div className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div>}
      <div className="grid gap-4">
        <div><label className="label">Date</label><input type="date" className="input" value={form.date} onChange={set('date')} max={new Date().toISOString().slice(0, 10)} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Check-in</label><input type="time" className="input" value={form.checkIn} onChange={set('checkIn')} /></div>
          <div><label className="label">Check-out</label><input type="time" className="input" value={form.checkOut} onChange={set('checkOut')} /></div>
        </div>
        <div><label className="label">Reason</label><textarea className="input" rows={2} value={form.remarks} onChange={set('remarks')} placeholder="Why does attendance need correcting?" /></div>
        <p className="text-xs text-slate-400">On approval, a manual punch (in/out) is recorded for that date.</p>
      </div>
    </Modal>
  );
}

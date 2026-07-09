'use client';
import { useCallback, useEffect, useState } from 'react';
import { Clock, Plus, Check, X } from 'lucide-react';
import PageBanner from '@/components/PageBanner';
import Loader from '@/components/Loader';
import Modal from '@/components/Modal';
import { useAuth } from '@/context/AuthContext';
import { timesheets as api } from '@/lib/db';

const tone = (s) => ({ SUBMITTED: 'bg-amber-50 text-amber-700', APPROVED: 'bg-emerald-50 text-emerald-700', REJECTED: 'bg-rose-50 text-rose-700' }[s] || 'bg-slate-100 text-slate-500');
const fmt = (d) => new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });

export default function TimesheetPage() {
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
  const totalHours = items.reduce((s, t) => s + Number(t.hours || 0), 0);

  return (
    <>
      <PageBanner icon={Clock} title="Timesheet">
        {hasEmployee && <button className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-sky-600 hover:bg-sky-50" onClick={() => setOpen(true)}><Plus size={15} className="mr-1 inline" />Log time</button>}
      </PageBanner>

      {loading ? <Loader /> : (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b px-5 py-3">
            <span className="font-semibold">Time entries</span>
            <span className="text-sm text-slate-500">Total: <b>{totalHours}</b> hrs</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-slate-400">
                {['Date', 'Employee', 'Project', 'Task', 'Hours', 'Status'].map((h) => <th key={h} className="px-5 py-3 font-medium">{h}</th>)}
                {canDecide && <th className="px-5 py-3 font-medium text-right">Action</th>}
              </tr></thead>
              <tbody>
                {items.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">No time logged yet.</td></tr>}
                {items.map((t) => (
                  <tr key={t._id} className="border-b last:border-0">
                    <td className="px-5 py-3 font-medium">{fmt(t.date)}</td>
                    <td className="px-5 py-3 text-slate-500">{t.employee?.name || '—'}</td>
                    <td className="px-5 py-3 text-slate-500">{t.project || '—'}</td>
                    <td className="px-5 py-3 text-slate-500">{t.task || '—'}</td>
                    <td className="px-5 py-3 font-semibold">{t.hours}</td>
                    <td className="px-5 py-3"><span className={`badge ${tone(t.status)}`}>{t.status}</span></td>
                    {canDecide && <td className="px-5 py-3"><div className="flex justify-end gap-1">
                      {t.status === 'SUBMITTED' ? (<>
                        <button className="btn-ghost p-1.5 text-emerald-600" title="Approve" onClick={() => decide(t._id, 'APPROVED')}><Check size={16} /></button>
                        <button className="btn-ghost p-1.5 text-rose-500" title="Reject" onClick={() => decide(t._id, 'REJECTED')}><X size={16} /></button>
                      </>) : <span className="text-xs text-slate-300">—</span>}
                    </div></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {open && <TimeModal companyId={user?.company} employeeId={user?.employee} onClose={() => setOpen(false)} onDone={load} />}
    </>
  );
}

function TimeModal({ companyId, employeeId, onClose, onDone }) {
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), project: '', task: '', hours: '' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const save = async () => {
    setErr('');
    if (!form.date) { setErr('Pick a work date.'); return; }
    const h = Number(form.hours || 0);
    if (!(h > 0)) { setErr('Enter hours greater than 0.'); return; }
    if (h > 24) { setErr('Hours cannot exceed 24 in a day.'); return; }
    setBusy(true);
    try {
      await api.create({ company_id: companyId, employee_id: employeeId, work_date: form.date, project: form.project || null, task: form.task || null, hours: Number(form.hours || 0), status: 'SUBMITTED' });
      onClose(); onDone();
    } catch (e) { setErr(e.message || 'Could not log time'); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title="Log time">
      <div className="space-y-3">
        {err && <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="label">Date</label><input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          <div><label className="label">Hours</label><input type="number" step="0.5" className="input" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} /></div>
        </div>
        <div><label className="label">Project</label><input className="input" value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} /></div>
        <div><label className="label">Task</label><input className="input" value={form.task} onChange={(e) => setForm({ ...form, task: e.target.value })} /></div>
        <div className="flex justify-end gap-2 pt-1"><button className="btn-outline" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={busy || !form.hours} onClick={save}>Submit</button></div>
      </div>
    </Modal>
  );
}

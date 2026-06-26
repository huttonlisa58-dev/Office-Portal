'use client';
import { useCallback, useEffect, useState } from 'react';
import { Phone, Plus, Trash2, PhoneIncoming, PhoneOutgoing, CalendarClock } from 'lucide-react';
import PageBanner from '@/components/PageBanner';
import Loader from '@/components/Loader';
import Modal from '@/components/Modal';
import { useAuth } from '@/context/AuthContext';
import { callLogs as api } from '@/lib/db';

const DIRECTIONS = ['OUTBOUND', 'INBOUND'];
const OUTCOMES = ['Connected', 'No answer', 'Busy', 'Follow-up scheduled', 'Not interested', 'Converted', 'Other'];
const fmtDate = (d) => d ? new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDT = (ts) => ts ? new Date(ts).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

export default function CallTrackerPage() {
  const { user } = useAuth();
  const canManageAll = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'MANAGER'].includes(user?.role);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await api.list({ role: user?.role, employeeId: user?.employee })); } catch { /* ignore */ } finally { setLoading(false); }
  }, [user]);
  useEffect(() => { load(); }, [load]);

  const remove = async (c) => { if (!confirm('Delete this call log?')) return; try { await api.remove(c._id); load(); } catch (e) { alert(e.message); } };

  return (
    <>
      <PageBanner icon={Phone} title="Call tracker">
        {user?.employee && <button className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-sky-600 hover:bg-sky-50" onClick={() => setOpen(true)}><Plus size={15} className="mr-1 inline" />Log a call</button>}
      </PageBanner>

      {loading ? <Loader /> : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-slate-400">
                {[canManageAll ? 'Employee' : null, 'Contact', 'Direction', 'Outcome', 'Duration', 'When', 'Follow-up'].filter(Boolean).map((h) => <th key={h} className="px-5 py-3 font-medium">{h}</th>)}
                <th className="px-5 py-3 font-medium text-right">Action</th>
              </tr></thead>
              <tbody>
                {items.length === 0 && <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-400">No calls logged yet.</td></tr>}
                {items.map((c) => (
                  <tr key={c._id} className="border-b align-top last:border-0">
                    {canManageAll && <td className="px-5 py-3 font-medium">{c.employee?.firstName} {c.employee?.lastName} <span className="text-xs text-slate-400">({c.employee?.employeeId})</span></td>}
                    <td className="px-5 py-3"><div className="font-medium">{c.contactName || '—'}</div><div className="text-xs text-slate-400">{c.contactNumber || ''}</div>{c.purpose && <div className="text-xs text-slate-400">{c.purpose}</div>}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${c.direction === 'INBOUND' ? 'text-emerald-600' : 'text-sky-600'}`}>
                        {c.direction === 'INBOUND' ? <PhoneIncoming size={13} /> : <PhoneOutgoing size={13} />}{c.direction === 'INBOUND' ? 'In' : 'Out'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{c.outcome || '—'}{c.notes && <div className="text-xs text-slate-400">{c.notes}</div>}</td>
                    <td className="px-5 py-3 text-slate-500">{c.durationMin != null ? `${c.durationMin} min` : '—'}</td>
                    <td className="px-5 py-3 text-slate-500">{fmtDT(c.calledAt)}</td>
                    <td className="px-5 py-3">{c.followUpDate ? <span className="inline-flex items-center gap-1 text-amber-600"><CalendarClock size={13} />{fmtDate(c.followUpDate)}</span> : <span className="text-slate-300">—</span>}</td>
                    <td className="px-5 py-3 text-right"><button className="btn-ghost p-1.5 text-rose-500" title="Delete" onClick={() => remove(c)}><Trash2 size={15} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {open && <CallModal onClose={() => setOpen(false)} onDone={() => { setOpen(false); load(); }} companyId={user?.company} employeeId={user?.employee} />}
    </>
  );
}

function CallModal({ onClose, onDone, companyId, employeeId }) {
  const nowLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const [form, setForm] = useState({ contactName: '', contactNumber: '', direction: 'OUTBOUND', purpose: '', outcome: 'Connected', durationMin: '', notes: '', followUpDate: '', calledAt: nowLocal });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const save = async () => {
    setErr(''); setBusy(true);
    try { await api.create({ companyId, employeeId, ...form }); onDone(); }
    catch (e) { setErr(e.message || 'Could not save'); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title="Log a call"
      footer={<><button className="btn-outline" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button></>}>
      {err && <div className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div>}
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Contact name</label><input className="input" value={form.contactName} onChange={set('contactName')} /></div>
          <div><label className="label">Contact number</label><input className="input" value={form.contactNumber} onChange={set('contactNumber')} placeholder="+91…" /></div>
          <div><label className="label">Direction</label><select className="input" value={form.direction} onChange={set('direction')}>{DIRECTIONS.map((d) => <option key={d} value={d}>{d === 'INBOUND' ? 'Inbound' : 'Outbound'}</option>)}</select></div>
          <div><label className="label">Duration (min)</label><input type="number" min="0" className="input" value={form.durationMin} onChange={set('durationMin')} /></div>
          <div><label className="label">Outcome</label><select className="input" value={form.outcome} onChange={set('outcome')}>{OUTCOMES.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
          <div><label className="label">When</label><input type="datetime-local" className="input" value={form.calledAt} onChange={set('calledAt')} /></div>
        </div>
        <div><label className="label">Purpose</label><input className="input" value={form.purpose} onChange={set('purpose')} placeholder="e.g. Sales follow-up, Support" /></div>
        <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={set('notes')} /></div>
        <div><label className="label">Follow-up date <span className="font-normal text-slate-400">(optional)</span></label><input type="date" className="input" value={form.followUpDate} onChange={set('followUpDate')} /></div>
      </div>
    </Modal>
  );
}

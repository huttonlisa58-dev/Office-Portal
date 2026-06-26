'use client';
import { useCallback, useEffect, useState } from 'react';
import { Activity, Plus, Star, CalendarRange } from 'lucide-react';
import PageBanner from '@/components/PageBanner';
import Loader from '@/components/Loader';
import Modal from '@/components/Modal';
import { useAuth } from '@/context/AuthContext';
import { performance as api, employees as empApi } from '@/lib/db';

const fmtDate = (d) => d ? new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const Stars = ({ value }) => {
  const n = Math.round(Number(value || 0));
  return <span className="inline-flex items-center gap-0.5 text-amber-500">{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={13} fill={i <= n ? 'currentColor' : 'none'} className={i <= n ? '' : 'text-slate-300'} />)}<span className="ml-1 text-xs text-slate-500">{value != null ? Number(value).toFixed(1) : '—'}</span></span>;
};

export default function PerformancePage() {
  const { user } = useAuth();
  const canManage = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'MANAGER'].includes(user?.role);
  const [reviews, setReviews] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revOpen, setRevOpen] = useState(false);
  const [cycOpen, setCycOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, c] = await Promise.all([
        api.reviews({ role: user?.role, employeeId: user?.employee }),
        api.cycles().catch(() => []),
      ]);
      setReviews(r); setCycles(c);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [user]);
  useEffect(() => { load(); }, [load]);

  return (
    <>
      <PageBanner icon={Activity} title="Performance & appraisals">
        {canManage && (
          <div className="flex gap-2">
            <button className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/25" onClick={() => setCycOpen(true)}><CalendarRange size={15} className="mr-1 inline" />New cycle</button>
            <button className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-sky-600 hover:bg-sky-50" onClick={() => setRevOpen(true)}><Plus size={15} className="mr-1 inline" />New review</button>
          </div>
        )}
      </PageBanner>

      {loading ? <Loader /> : (
        <div className="space-y-5">
          {cycles.length > 0 && (
            <div className="card p-4">
              <p className="mb-2 text-sm font-semibold">Appraisal cycles</p>
              <div className="flex flex-wrap gap-2">
                {cycles.map((c) => (
                  <span key={c._id} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs dark:bg-slate-800">
                    <b>{c.name}</b> · {fmtDate(c.startDate)}–{fmtDate(c.endDate)} · <span className={c.status === 'OPEN' ? 'text-emerald-600' : 'text-slate-400'}>{c.status}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-slate-400">
                  {['Employee', 'Period', 'Rating', 'Strengths', 'Areas to improve', 'Summary'].map((h) => <th key={h} className="px-5 py-3 font-medium">{h}</th>)}
                </tr></thead>
                <tbody>
                  {reviews.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">No performance reviews yet.</td></tr>}
                  {reviews.map((r) => (
                    <tr key={r._id} className="border-b align-top last:border-0">
                      <td className="px-5 py-3 font-medium">{r.employee?.firstName} {r.employee?.lastName} <span className="text-xs text-slate-400">({r.employee?.employeeId})</span></td>
                      <td className="px-5 py-3 text-slate-500">{r.period}</td>
                      <td className="px-5 py-3"><Stars value={r.rating} /></td>
                      <td className="px-5 py-3 max-w-[200px] text-slate-500">{r.strengths || '—'}</td>
                      <td className="px-5 py-3 max-w-[200px] text-slate-500">{r.improvements || '—'}</td>
                      <td className="px-5 py-3 max-w-[240px] text-slate-500">{r.summary || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {revOpen && <ReviewModal onClose={() => setRevOpen(false)} onDone={() => { setRevOpen(false); load(); }} companyId={user?.company} cycles={cycles} />}
      {cycOpen && <CycleModal onClose={() => setCycOpen(false)} onDone={() => { setCycOpen(false); load(); }} companyId={user?.company} />}
    </>
  );
}

function ReviewModal({ onClose, onDone, companyId, cycles }) {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({ employeeId: '', period: cycles?.[0]?.name || '', rating: '', strengths: '', improvements: '', summary: '' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  useEffect(() => { empApi.list({ limit: 200 }).then((r) => setEmployees(r.items)).catch(() => {}); }, []);
  const save = async () => {
    setErr(''); setBusy(true);
    try { await api.createReview({ companyId, ...form }); onDone(); }
    catch (e) { setErr(e.message || 'Could not save'); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title="New performance review"
      footer={<><button className="btn-outline" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={busy || !form.employeeId || !form.period} onClick={save}>{busy ? 'Saving…' : 'Save'}</button></>}>
      {err && <div className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div>}
      <div className="grid gap-4">
        <div><label className="label">Employee</label>
          <select className="input" value={form.employeeId} onChange={set('employeeId')}>
            <option value="">— select —</option>
            {employees.map((e) => <option key={e._id} value={e._id}>{e.firstName} {e.lastName} ({e.employeeId})</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Period / cycle</label>
            {cycles?.length ? (
              <select className="input" value={form.period} onChange={set('period')}>
                <option value="">— select —</option>
                {cycles.map((c) => <option key={c._id} value={c.name}>{c.name}</option>)}
              </select>
            ) : <input className="input" value={form.period} onChange={set('period')} placeholder="e.g. H1 2026" />}
          </div>
          <div><label className="label">Rating (1–5)</label><input type="number" step="0.5" min="1" max="5" className="input" value={form.rating} onChange={set('rating')} /></div>
        </div>
        <div><label className="label">Strengths</label><textarea className="input" rows={2} value={form.strengths} onChange={set('strengths')} /></div>
        <div><label className="label">Areas to improve</label><textarea className="input" rows={2} value={form.improvements} onChange={set('improvements')} /></div>
        <div><label className="label">Summary</label><textarea className="input" rows={2} value={form.summary} onChange={set('summary')} /></div>
      </div>
    </Modal>
  );
}

function CycleModal({ onClose, onDone, companyId }) {
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const save = async () => {
    setErr(''); setBusy(true);
    try { await api.createCycle({ companyId, ...form }); onDone(); }
    catch (e) { setErr(e.message || 'Could not save'); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title="New appraisal cycle"
      footer={<><button className="btn-outline" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={busy || !form.name} onClick={save}>{busy ? 'Saving…' : 'Save'}</button></>}>
      {err && <div className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div>}
      <div className="grid gap-4">
        <div><label className="label">Cycle name</label><input className="input" value={form.name} onChange={set('name')} placeholder="e.g. Annual Appraisal 2026" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Start date</label><input type="date" className="input" value={form.startDate} onChange={set('startDate')} /></div>
          <div><label className="label">End date</label><input type="date" className="input" value={form.endDate} onChange={set('endDate')} /></div>
        </div>
      </div>
    </Modal>
  );
}

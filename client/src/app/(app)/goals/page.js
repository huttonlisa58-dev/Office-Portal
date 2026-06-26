'use client';
import { useCallback, useEffect, useState } from 'react';
import { Target, Plus, Trash2, Gauge } from 'lucide-react';
import PageBanner from '@/components/PageBanner';
import Loader from '@/components/Loader';
import Modal from '@/components/Modal';
import { EmptyState, StatusBadge } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { goals as goalApi, kpis as kpiApi, employees as empApi } from '@/lib/db';

const fmt = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export default function GoalsPage() {
  const { user } = useAuth();
  const canManage = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR'].includes(user?.role);
  const hasEmployee = !!user?.employee;
  const [tab, setTab] = useState('goals');
  const [goals, setGoals] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [emps, setEmps] = useState([]);
  const [goalModal, setGoalModal] = useState(false);
  const [kpiModal, setKpiModal] = useState(null);

  const load = useCallback(async () => {
    try { setGoals(await goalApi.list()); } catch { setGoals([]); }
    try { setKpis(await kpiApi.list()); } catch { setKpis([]); }
  }, []);
  useEffect(() => { load(); if (canManage) empApi.list({ limit: 200 }).then((r) => setEmps(r.items)).catch(() => {}); }, [load, canManage]);

  const myGoals = canManage ? goals : (goals || []).filter((g) => g.employee?.employeeId === user?.employeeCode);
  const myKpis = canManage ? kpis : (kpis || []).filter((k) => k.employee?.employeeId === user?.employeeCode);

  const setProgress = async (g, p) => { try { await goalApi.setProgress(g._id, p); load(); } catch (e) { window.alert(e.message); } };
  const delGoal = async (g) => { if (!window.confirm('Delete this goal?')) return; try { await goalApi.remove(g._id); load(); } catch (e) { window.alert(e.message); } };
  const delKpi = async (k) => { if (!window.confirm('Delete this KPI?')) return; try { await kpiApi.remove(k._id); load(); } catch (e) { window.alert(e.message); } };

  return (
    <>
      <PageBanner icon={Target} title="Goals & KPIs">
        {tab === 'goals' && hasEmployee && <button className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-sky-600 hover:bg-sky-50" onClick={() => setGoalModal(true)}><Plus size={15} className="mr-1 inline" />Add goal</button>}
        {tab === 'kpis' && canManage && <button className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-sky-600 hover:bg-sky-50" onClick={() => setKpiModal({})}><Plus size={15} className="mr-1 inline" />Add KPI</button>}
      </PageBanner>

      <div className="mb-4 flex gap-1 border-b dark:border-slate-700">
        {[['goals', 'Goals'], ['kpis', 'KPIs']].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${tab === k ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>{label}</button>
        ))}
      </div>

      {tab === 'goals' ? (
        goals === null ? <Loader /> : (myGoals || []).length === 0 ? <EmptyState title="No goals yet" subtitle="Set objectives and track progress." /> : (
          <div className="space-y-3">
            {(myGoals || []).map((g) => {
              const canEditProgress = canManage || g.employee?.employeeId === user?.employeeCode;
              return (
                <div key={g._id} className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{g.title}</div>
                      {canManage && g.employee && <div className="text-xs text-slate-400">{g.employee.firstName} {g.employee.lastName || ''}</div>}
                      {g.description && <p className="mt-1 text-sm text-slate-500">{g.description}</p>}
                      <div className="mt-1 text-xs text-slate-400">Weight {g.weight}% · Target {fmt(g.targetDate)}</div>
                    </div>
                    <div className="flex items-center gap-2"><StatusBadge status={g.status} />{canManage && <button className="btn-ghost p-1.5 text-rose-400" onClick={() => delGoal(g)}><Trash2 size={15} /></button>}</div>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-sky-500" style={{ width: `${g.progress}%` }} /></div>
                    <span className="w-10 text-right text-sm font-semibold tabular-nums">{g.progress}%</span>
                  </div>
                  {canEditProgress && (
                    <input type="range" min="0" max="100" step="5" defaultValue={g.progress} onMouseUp={(e) => setProgress(g, e.target.value)} onTouchEnd={(e) => setProgress(g, e.target.value)} className="mt-2 w-full" />
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        kpis === null ? <Loader /> : (myKpis || []).length === 0 ? <EmptyState title="No KPIs yet" subtitle={canManage ? 'Define measurable KPIs for your team.' : 'No KPIs assigned to you yet.'} /> : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="border-b text-left text-slate-400 dark:border-slate-700">
                {(canManage ? ['Employee', 'KPI', 'Weight', 'Target', 'Actual', 'Score', ''] : ['KPI', 'Weight', 'Target', 'Actual', 'Score']).map((h) => <th key={h} className="px-5 py-3 font-medium">{h}</th>)}
              </tr></thead>
              <tbody>
                {(myKpis || []).map((k) => (
                  <tr key={k._id} className="border-b last:border-0 dark:border-slate-700">
                    {canManage && <td className="px-5 py-3 text-slate-500">{k.employee ? `${k.employee.firstName} ${k.employee.lastName || ''}` : '—'}</td>}
                    <td className="px-5 py-3 font-medium">{k.name}</td>
                    <td className="px-5 py-3">{k.weight}%</td>
                    <td className="px-5 py-3 text-slate-500">{k.target || '—'}</td>
                    <td className="px-5 py-3 text-slate-500">{k.actual || '—'}</td>
                    <td className="px-5 py-3"><span className="inline-flex items-center gap-1 font-semibold"><Gauge size={13} className="text-sky-500" />{k.score == null ? '—' : k.score}</span></td>
                    {canManage && <td className="px-5 py-3 text-right"><div className="flex justify-end gap-1"><button className="btn-ghost p-1.5" onClick={() => setKpiModal(k)}>Edit</button><button className="btn-ghost p-1.5 text-rose-400" onClick={() => delKpi(k)}><Trash2 size={14} /></button></div></td>}
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        )
      )}

      {goalModal && <GoalModal user={user} canManage={canManage} emps={emps} onClose={() => setGoalModal(false)} onDone={() => { setGoalModal(false); load(); }} />}
      {kpiModal && <KpiModal kpi={kpiModal} user={user} emps={emps} onClose={() => setKpiModal(null)} onDone={() => { setKpiModal(null); load(); }} />}
    </>
  );
}

function GoalModal({ user, canManage, emps, onClose, onDone }) {
  const [form, setForm] = useState({ employeeId: user?.employee || '', title: '', description: '', weight: '', targetDate: '' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!form.title.trim()) { setErr('Title is required.'); return; }
    const empId = canManage ? (form.employeeId || user?.employee) : user?.employee;
    if (!empId) { setErr('Select an employee.'); return; }
    setBusy(true); setErr('');
    try { await goalApi.create({ company_id: user.company, employee_id: empId, title: form.title.trim(), description: form.description, weight: form.weight, targetDate: form.targetDate }); onDone(); }
    catch (e) { setErr(e.message || 'Could not save'); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title="Add goal"
      footer={<><button className="btn-outline" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></>}>
      <div className="space-y-3">
        {err && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-950/40">{err}</div>}
        {canManage && <div><label className="label">Employee</label><select className="input" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}><option value="">— select —</option>{emps.map((e) => <option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>)}</select></div>}
        <div><label className="label">Title</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <div><label className="label">Description</label><textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Weight (%)</label><input type="number" min="0" max="100" className="input" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} /></div>
          <div><label className="label">Target date</label><input type="date" className="input" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} /></div>
        </div>
      </div>
    </Modal>
  );
}

function KpiModal({ kpi, user, emps, onClose, onDone }) {
  const isNew = !kpi._id;
  const [form, setForm] = useState({ employeeId: kpi.employeeId || '', name: kpi.name || '', weight: kpi.weight || '', target: kpi.target || '', actual: kpi.actual || '', score: kpi.score ?? '' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!form.name.trim()) { setErr('KPI name is required.'); return; }
    if (isNew && !form.employeeId) { setErr('Select an employee.'); return; }
    setBusy(true); setErr('');
    try {
      if (isNew) await kpiApi.create({ company_id: user.company, employee_id: form.employeeId, name: form.name.trim(), weight: form.weight, target: form.target, actual: form.actual, score: form.score });
      else await kpiApi.update(kpi._id, { name: form.name.trim(), weight: form.weight, target: form.target, actual: form.actual, score: form.score });
      onDone();
    } catch (e) { setErr(e.message || 'Could not save'); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={isNew ? 'Add KPI' : 'Edit KPI'}
      footer={<><button className="btn-outline" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></>}>
      <div className="space-y-3">
        {err && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-950/40">{err}</div>}
        {isNew && <div><label className="label">Employee</label><select className="input" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}><option value="">— select —</option>{emps.map((e) => <option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>)}</select></div>}
        <div><label className="label">KPI name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Weight (%)</label><input type="number" min="0" max="100" className="input" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} /></div>
          <div><label className="label">Score</label><input type="number" step="0.1" className="input" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} /></div>
          <div><label className="label">Target</label><input className="input" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} /></div>
          <div><label className="label">Actual</label><input className="input" value={form.actual} onChange={(e) => setForm({ ...form, actual: e.target.value })} /></div>
        </div>
      </div>
    </Modal>
  );
}

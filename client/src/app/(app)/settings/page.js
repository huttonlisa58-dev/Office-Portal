'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Building2, Layers, Briefcase, Clock, Trash2, Plus, Users, CalendarClock } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Loader from '@/components/Loader';
import { useAuth } from '@/context/AuthContext';
import { org, shifts as shiftApi, employees as empApi, leavePolicies as lpApi, leaves as leaveApi } from '@/lib/db';
import { supabase } from '@/lib/supabaseClient';

const WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function SettingsPage() {
  const { user, company, refresh } = useAuth();
  const companyId = company?._id || company?.id;
  const [depts, setDepts] = useState([]);
  const [desigs, setDesigs] = useState([]);
  const [shiftList, setShiftList] = useState([]);
  const [newShift, setNewShift] = useState({ name: '', start: '09:00', end: '18:00' });
  const [empList, setEmpList] = useState([]);
  const [bulk, setBulk] = useState({ shiftId: '', weeklyOff: '', filter: '', picked: [], busy: false, msg: '' });
  const [pol, setPol] = useState({});
  const [polBusy, setPolBusy] = useState(false);
  const [polMsg, setPolMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [newDept, setNewDept] = useState('');
  const [newDesig, setNewDesig] = useState('');
  const [work, setWork] = useState({ workdayStart: '09:00', lateAfterMinutes: 15, fullDayHours: 8 });
  const [savedMsg, setSavedMsg] = useState('');
  const savedTimer = useRef(null);
  useEffect(() => () => { if (savedTimer.current) clearTimeout(savedTimer.current); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, g, sh, em, lps] = await Promise.all([org.departments(), org.designations(), shiftApi.listAll(), empApi.all().catch(() => []), lpApi.list().catch(() => [])]);
      setDepts(d); setDesigs(g); setShiftList(sh); setEmpList(em || []);
      const pm = {};
      (lps || []).forEach((p) => { pm[p.leaveType] = { annualQuota: p.annualQuota, accrualPerMonth: p.accrualPerMonth, eligibilityMonths: p.eligibilityMonths, carryForwardCap: p.carryForwardCap ?? '', reasonRequiredDays: p.reasonRequiredDays ?? '' }; });
      ['EARNED', 'SICK', 'CASUAL'].forEach((t) => { if (!pm[t]) pm[t] = { annualQuota: 0, accrualPerMonth: 0, eligibilityMonths: 0, carryForwardCap: '', reasonRequiredDays: '' }; });
      setPol(pm);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (company?.workSettings) setWork((w) => ({ ...w, ...company.workSettings })); }, [company]);

  const addDept = async () => { if (!newDept || !companyId) return; await org.addDepartment(companyId, newDept); setNewDept(''); load(); };
  const delDept = async (id) => { await org.delDepartment(id); load(); };
  const addDesig = async () => { if (!newDesig || !companyId) return; await org.addDesignation(companyId, newDesig); setNewDesig(''); load(); };
  const delDesig = async (id) => { await org.delDesignation(id); load(); };
  const addShift = async () => {
    if (!newShift.name.trim() || !companyId) return;
    try { await shiftApi.add({ company_id: companyId, name: newShift.name.trim(), start: newShift.start, end: newShift.end }); setNewShift({ name: '', start: '09:00', end: '18:00' }); load(); }
    catch (e) { window.alert(e.message || 'Could not add shift'); }
  };
  const delShift = async (id) => { try { await shiftApi.del(id); load(); } catch (e) { window.alert(e.message || 'Could not delete'); } };

  const togglePick = (id) => setBulk((b) => ({ ...b, picked: b.picked.includes(id) ? b.picked.filter((x) => x !== id) : [...b.picked, id], msg: '' }));
  const filteredEmps = empList.filter((e) => `${e.firstName} ${e.lastName} ${e.employeeId}`.toLowerCase().includes(bulk.filter.toLowerCase()));
  const allPicked = filteredEmps.length > 0 && filteredEmps.every((e) => bulk.picked.includes(e._id));
  const toggleAll = () => setBulk((b) => ({ ...b, picked: allPicked ? b.picked.filter((id) => !filteredEmps.some((e) => e._id === id)) : [...new Set([...b.picked, ...filteredEmps.map((e) => e._id)])], msg: '' }));
  const applyBulk = async () => {
    if (!bulk.picked.length || (!bulk.shiftId && bulk.weeklyOff === '')) return;
    setBulk((b) => ({ ...b, busy: true, msg: '' }));
    try {
      const patch = {};
      if (bulk.shiftId) patch.shift_id = bulk.shiftId;
      if (bulk.weeklyOff !== '') patch.weekly_off = Number(bulk.weeklyOff);
      const n = await shiftApi.assignToEmployees(bulk.picked, patch);
      setBulk((b) => ({ ...b, busy: false, picked: [], msg: `Assigned to ${n} employee(s).` }));
    } catch (e) { setBulk((b) => ({ ...b, busy: false, msg: e.message || 'Failed' })); }
  };

  const setPolField = (type, key) => (e) => { const v = e.target.value; setPol((p) => ({ ...p, [type]: { ...p[type], [key]: v } })); setPolMsg(''); };
  const savePolicies = async () => {
    if (!company?.id) { setPolMsg('No company context'); return; }
    setPolBusy(true); setPolMsg('');
    try {
      for (const t of ['EARNED', 'SICK', 'CASUAL']) {
        const row = pol[t] || {};
        await lpApi.upsert(company.id, t, {
          annualQuota: Number(row.annualQuota) || 0,
          accrualPerMonth: Number(row.accrualPerMonth) || 0,
          eligibilityMonths: Number(row.eligibilityMonths) || 0,
          carryForwardCap: row.carryForwardCap === '' || row.carryForwardCap == null ? null : Number(row.carryForwardCap),
          reasonRequiredDays: row.reasonRequiredDays === '' || row.reasonRequiredDays == null ? null : Number(row.reasonRequiredDays),
        });
      }
      setPolMsg('Leave policies saved.');
    } catch (e) { setPolMsg(e.message || 'Save failed'); } finally { setPolBusy(false); }
  };

  const [cfBusy, setCfBusy] = useState(false);
  const runCarryForward = async () => {
    if (!window.confirm('Carry forward last year\u2019s remaining balances into this year (capped per policy)? This runs once per employee/type and is safe to repeat.')) return;
    setCfBusy(true); setPolMsg('');
    try {
      const res = await leaveApi.runCarryForward();
      setPolMsg(`Carry-forward done — ${res?.carried ?? 0} credit(s) across ${res?.employees_processed ?? 0} employee(s).`);
    } catch (e) { setPolMsg(e.message || 'Carry-forward failed'); } finally { setCfBusy(false); }
  };

  const saveWork = async () => {
    if (!companyId) return;
    const { error } = await supabase.from('companies').update({
      workday_start: work.workdayStart,
      late_after_minutes: Number(work.lateAfterMinutes),
      full_day_hours: Number(work.fullDayHours),
    }).eq('id', companyId);
    if (error) { setSavedMsg(error.message); return; }
    setSavedMsg('Work settings saved.'); refresh?.();
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSavedMsg(''), 3000);
  };

  if (loading) return <Loader />;

  return (
    <>
      <PageHeader title="Settings" subtitle="Organization structure and work policies" />
      <div className="grid gap-6 lg:grid-cols-2">
        <ListCard icon={Layers} title="Departments" value={newDept} setValue={setNewDept} onAdd={addDept}
          items={depts.map((d) => ({ id: d._id, label: d.name }))} onDelete={delDept} placeholder="e.g. Engineering" />
        <ListCard icon={Briefcase} title="Designations" value={newDesig} setValue={setNewDesig} onAdd={addDesig}
          items={desigs.map((d) => ({ id: d._id, label: d.title }))} onDelete={delDesig} placeholder="e.g. Senior Engineer" />

        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2"><Clock size={18} className="text-brand-600" /><span className="font-semibold">Work policy</span></div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div><label className="label">Workday start</label><input className="input" type="time" value={work.workdayStart} onChange={(e) => setWork((w) => ({ ...w, workdayStart: e.target.value }))} /></div>
            <div><label className="label">Late grace (minutes)</label><input className="input" type="number" value={work.lateAfterMinutes} onChange={(e) => setWork((w) => ({ ...w, lateAfterMinutes: e.target.value }))} /></div>
            <div><label className="label">Full day (hours)</label><input className="input" type="number" value={work.fullDayHours} onChange={(e) => setWork((w) => ({ ...w, fullDayHours: e.target.value }))} /></div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button className="btn-primary" onClick={saveWork}>Save work settings</button>
            {savedMsg && <span className="text-sm text-emerald-600">{savedMsg}</span>}
          </div>
        </div>

        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2"><Clock size={18} className="text-brand-600" /><span className="font-semibold">Shifts</span></div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input className="input min-w-[180px] flex-1" placeholder="Shift name (e.g. Day Shift / Night Shift)" value={newShift.name} onChange={(e) => setNewShift((s) => ({ ...s, name: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && addShift()} />
            <input className="input w-32" type="time" value={newShift.start} onChange={(e) => setNewShift((s) => ({ ...s, start: e.target.value }))} />
            <span className="text-slate-400">to</span>
            <input className="input w-32" type="time" value={newShift.end} onChange={(e) => setNewShift((s) => ({ ...s, end: e.target.value }))} />
            <button className="btn-primary" onClick={addShift}><Plus size={16} /></button>
          </div>
          <div className="space-y-2">
            {shiftList.length === 0 && <p className="text-sm text-slate-400">No shifts yet. Add a Day shift and a Night shift above.</p>}
            {shiftList.map((s) => (
              <div key={s._id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/60">
                <div className="flex items-center gap-2">
                  {s.color && <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />}
                  <span className="font-medium">{s.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-slate-500">{(s.start || '').slice(0, 5)} – {(s.end || '').slice(0, 5)}{s.end && s.start && s.end <= s.start ? ' (next day)' : ''}</span>
                  <button className="btn-ghost p-1 text-rose-500" onClick={() => delShift(s._id)}><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2"><Users size={18} className="text-brand-600" /><span className="font-semibold">Bulk shift assignment</span></div>
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <div className="min-w-[180px] flex-1">
              <label className="label">Shift</label>
              <select className="input" value={bulk.shiftId} onChange={(e) => setBulk((b) => ({ ...b, shiftId: e.target.value, msg: '' }))}>
                <option value="">— no change —</option>
                {shiftList.map((s) => <option key={s._id} value={s._id}>{s.name}{s.start ? ` (${String(s.start).slice(0, 5)}–${String(s.end).slice(0, 5)})` : ''}</option>)}
              </select>
            </div>
            <div className="w-44">
              <label className="label">Weekly off</label>
              <select className="input" value={bulk.weeklyOff} onChange={(e) => setBulk((b) => ({ ...b, weeklyOff: e.target.value, msg: '' }))}>
                <option value="">— no change —</option>
                {WEEK.map((w, i) => <option key={w} value={i}>{w}</option>)}
              </select>
            </div>
          </div>
          <input className="input mb-2" placeholder="Search employees…" value={bulk.filter} onChange={(e) => setBulk((b) => ({ ...b, filter: e.target.value }))} />
          <div className="mb-2 flex items-center justify-between text-sm">
            <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={allPicked} onChange={toggleAll} /> Select all ({filteredEmps.length})</label>
            <span className="text-slate-400">{bulk.picked.length} selected</span>
          </div>
          <div className="max-h-64 overflow-y-auto rounded-xl border dark:border-slate-700">
            {filteredEmps.length === 0 ? <p className="p-4 text-sm text-slate-400">No employees.</p> : filteredEmps.map((e) => (
              <label key={e._id} className="flex cursor-pointer items-center gap-3 border-b px-3 py-2 text-sm last:border-0 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/40">
                <input type="checkbox" checked={bulk.picked.includes(e._id)} onChange={() => togglePick(e._id)} />
                <span className="font-medium">{e.firstName} {e.lastName}</span>
                <span className="text-slate-400">{e.employeeId}</span>
              </label>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button className="btn-primary disabled:opacity-60" disabled={bulk.busy || !bulk.picked.length || (!bulk.shiftId && bulk.weeklyOff === '')} onClick={applyBulk}>{bulk.busy ? 'Assigning…' : `Assign to ${bulk.picked.length} selected`}</button>
            {bulk.msg && <span className="text-sm text-emerald-600">{bulk.msg}</span>}
          </div>
        </div>

        <div className="card p-5 lg:col-span-2">
          <div className="mb-1 flex items-center gap-2"><CalendarClock size={18} className="text-brand-600" /><span className="font-semibold">Leave policies</span></div>
          <p className="mb-4 text-sm text-slate-400">Drives the automatic monthly leave accrual. Eligibility = months of service completed before accrual begins.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-slate-400">
                <th className="py-2 pr-4 font-medium">Leave type</th><th className="py-2 pr-4 font-medium">Annual quota</th><th className="py-2 pr-4 font-medium">Accrual / month</th><th className="py-2 pr-4 font-medium">Eligibility (months)</th><th className="py-2 pr-4 font-medium">Carry-forward cap</th><th className="py-2 pr-4 font-medium">Reason required (≥ days)</th>
              </tr></thead>
              <tbody>
                {[['EARNED', 'Earned Leave'], ['SICK', 'Sick Leave'], ['CASUAL', 'Casual Leave']].map(([t, label]) => (
                  <tr key={t} className="border-t dark:border-slate-700">
                    <td className="py-2 pr-4 font-medium">{label}</td>
                    <td className="py-2 pr-4"><input type="number" step="0.5" min="0" className="input w-24" value={pol[t]?.annualQuota ?? ''} onChange={setPolField(t, 'annualQuota')} /></td>
                    <td className="py-2 pr-4"><input type="number" step="0.5" min="0" className="input w-24" value={pol[t]?.accrualPerMonth ?? ''} onChange={setPolField(t, 'accrualPerMonth')} /></td>
                    <td className="py-2 pr-4"><input type="number" step="1" min="0" className="input w-24" value={pol[t]?.eligibilityMonths ?? ''} onChange={setPolField(t, 'eligibilityMonths')} /></td>
                    <td className="py-2 pr-4"><input type="number" step="0.5" min="0" placeholder="none" className="input w-24" value={pol[t]?.carryForwardCap ?? ''} onChange={setPolField(t, 'carryForwardCap')} /></td>
                    <td className="py-2 pr-4"><input type="number" step="1" min="0" placeholder="off" className="input w-24" value={pol[t]?.reasonRequiredDays ?? ''} onChange={setPolField(t, 'reasonRequiredDays')} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button className="btn-primary disabled:opacity-60" disabled={polBusy} onClick={savePolicies}>{polBusy ? 'Saving…' : 'Save policies'}</button>
            <button className="btn-outline disabled:opacity-60" disabled={cfBusy} onClick={runCarryForward}>{cfBusy ? 'Running…' : 'Run carry-forward (last year → this year)'}</button>
            {polMsg && <span className="text-sm text-emerald-600">{polMsg}</span>}
          </div>
          <p className="mt-2 text-xs text-slate-400">Carry-forward also runs automatically on Jan 1. Leave the cap blank to disable carry-forward for a type.</p>
        </div>

        <div className="card p-5 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2"><Building2 size={18} className="text-brand-600" /><span className="font-semibold">Workspace</span></div>
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div><dt className="text-slate-400">Company</dt><dd className="font-medium">{company?.name || '—'}</dd></div>
            <div><dt className="text-slate-400">Plan</dt><dd className="font-medium">{company?.subscription?.plan || '—'}</dd></div>
            <div><dt className="text-slate-400">Your role</dt><dd className="font-medium">{user?.role?.replace('_', ' ')}</dd></div>
          </dl>
        </div>
      </div>
    </>
  );
}

function ListCard({ icon: Icon, title, items, value, setValue, onAdd, onDelete, placeholder }) {
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center gap-2"><Icon size={18} className="text-brand-600" /><span className="font-semibold">{title}</span></div>
      <div className="mb-3 flex gap-2">
        <input className="input" placeholder={placeholder} value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onAdd()} />
        <button className="btn-primary" onClick={onAdd}><Plus size={16} /></button>
      </div>
      <div className="space-y-2">
        {items.length === 0 && <p className="text-sm text-slate-400">None yet.</p>}
        {items.map((it) => (
          <div key={it.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/60">
            <span>{it.label}</span>
            <button className="btn-ghost p-1 text-rose-500" onClick={() => onDelete(it.id)}><Trash2 size={15} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

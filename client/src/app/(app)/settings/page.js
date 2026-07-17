'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Building2, Layers, Briefcase, Clock, Trash2, Plus, Users, CalendarClock, Timer, ArrowUp, ArrowDown, Image as ImageIcon, Upload } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Loader from '@/components/Loader';
import { useAuth } from '@/context/AuthContext';
import { org, shifts as shiftApi, employees as empApi, leavePolicies as lpApi, leaves as leaveApi, overtimePolicies as otApi } from '@/lib/db';
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
  const [work, setWork] = useState({ workdayStart: '09:00', lateAfterMinutes: 15, fullDayHours: 8, staffSeePeopleWidgets: true });
  const [savedMsg, setSavedMsg] = useState('');
  const savedTimer = useRef(null);
  useEffect(() => () => { if (savedTimer.current) clearTimeout(savedTimer.current); }, []);

  // ---- overtime policies ----
  const [otRows, setOtRows] = useState([]);
  const [otBusy, setOtBusy] = useState(false);
  const [otMsg, setOtMsg] = useState('');
  const setOtField = (i, k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setOtRows((rows) => rows.map((r, idx) => {
      if (idx !== i) return r;
      const next = { ...r, [k]: v };
      if (k === 'scopeType' && v === 'ALL') next.scopeId = null;
      return next;
    }));
  };
  const addOt = () => setOtRows((rows) => [...rows, { name: '', priority: (rows.length + 1) * 10, scopeType: 'ALL', scopeId: null, minMinutes: 30, dailyThresholdMinutes: '', rateMultiplier: 1.5, maxHoursPerMonth: '', compOffInstead: false, isActive: true }]);
  const removeOt = async (i) => {
    const row = otRows[i];
    if (row._id && !window.confirm(`Delete the "${row.name || 'untitled'}" overtime policy?`)) return;
    if (row._id) { try { await otApi.remove(row._id); } catch (e) { setOtMsg(e.message); return; } }
    setOtRows((rows) => rows.filter((_, idx) => idx !== i));
  };
  const moveOt = (i, dir) => setOtRows((rows) => {
    const next = [...rows]; const j = i + dir;
    if (j < 0 || j >= next.length) return rows;
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
  const saveOt = async () => {
    setOtMsg('');
    if (!companyId) { setOtMsg('No company context'); return; }
    for (const r of otRows) {
      if (!String(r.name || '').trim()) { setOtMsg('Give every overtime policy a name.'); return; }
      if (r.scopeType !== 'ALL' && !r.scopeId) { setOtMsg(`"${r.name}": pick who the policy applies to.`); return; }
      if (!(Number(r.rateMultiplier) > 0)) { setOtMsg(`"${r.name}": rate multiplier must be greater than 0.`); return; }
    }
    setOtBusy(true);
    try {
      // list order IS the priority order
      for (let i = 0; i < otRows.length; i++) await otApi.save(companyId, { ...otRows[i], priority: (i + 1) * 10 });
      const fresh = await otApi.list();
      setOtRows(fresh);
      setOtMsg('Overtime policies saved.');
    } catch (e) { setOtMsg(e.message || 'Save failed'); } finally { setOtBusy(false); }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, g, sh, em, lps, ots] = await Promise.all([org.departments(), org.designations(), shiftApi.listAll(), empApi.all().catch(() => []), lpApi.list().catch(() => []), otApi.list().catch(() => [])]);
      setDepts(d); setDesigs(g); setShiftList(sh); setEmpList(em || []); setOtRows(ots || []);
      const pm = {};
      (lps || []).forEach((p) => { pm[p.leaveType] = { annualQuota: p.annualQuota, accrualPerMonth: p.accrualPerMonth, eligibilityMonths: p.eligibilityMonths, carryForwardCap: p.carryForwardCap ?? '', reasonRequiredDays: p.reasonRequiredDays ?? '', expiryMode: p.expiryMode || 'NONE', expiryDay: p.expiryDay || '' }; });
      ['EARNED', 'SICK', 'CASUAL'].forEach((t) => { if (!pm[t]) pm[t] = { annualQuota: 0, accrualPerMonth: 0, eligibilityMonths: 0, carryForwardCap: '', reasonRequiredDays: '', expiryMode: 'NONE', expiryDay: '' }; });
      setPol(pm);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (company?.workSettings) setWork((w) => ({ ...w, ...company.workSettings })); }, [company]);
  useEffect(() => { if (company) { setBrand({ logo: company.logo || '', address: company.address || '' }); setLogoBroken(false); } }, [company]);

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
    if (!companyId) { setPolMsg('No company context'); return; }
    setPolBusy(true); setPolMsg('');
    try {
      for (const t of ['EARNED', 'SICK', 'CASUAL']) {
        const row = pol[t] || {};
        if (row.expiryMode === 'FIXED_DATE' && !/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(String(row.expiryDay || ''))) {
          setPolMsg(`${t}: enter the expiry date as MM-DD (e.g. 12-31).`); setPolBusy(false); return;
        }
      }
      for (const t of ['EARNED', 'SICK', 'CASUAL']) {
        const row = pol[t] || {};
        await lpApi.upsert(companyId, t, {
          annualQuota: Number(row.annualQuota) || 0,
          accrualPerMonth: Number(row.accrualPerMonth) || 0,
          eligibilityMonths: Number(row.eligibilityMonths) || 0,
          carryForwardCap: row.carryForwardCap === '' || row.carryForwardCap == null ? null : Number(row.carryForwardCap),
          expiryMode: row.expiryMode || 'NONE',
          expiryDay: row.expiryDay || '',
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

  // ---- company branding (logo + address shown in the sidebar and on payslips) ----
  const [brand, setBrand] = useState({ logo: '', address: '' });
  const [brandBusy, setBrandBusy] = useState(false);
  const [brandMsg, setBrandMsg] = useState('');
  const [logoBroken, setLogoBroken] = useState(false);

  const uploadLogo = async (file) => {
    if (!file || !companyId) return;
    if (!file.type.startsWith('image/')) { setBrandMsg('Pick an image file (PNG, JPG, WEBP or SVG).'); return; }
    if (file.size > 2 * 1024 * 1024) { setBrandMsg('Logo must be smaller than 2 MB.'); return; }
    setBrandBusy(true); setBrandMsg('');
    try {
      const ext = (file.name.split('.').pop() || 'png').toLowerCase();
      const path = `${companyId}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('branding').upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw new Error(upErr.message);
      const { data: pub } = supabase.storage.from('branding').getPublicUrl(path);
      setBrand((b) => ({ ...b, logo: pub.publicUrl }));
      setLogoBroken(false);
      setBrandMsg('Logo uploaded — remember to save.');
    } catch (e) { setBrandMsg(e.message || 'Upload failed'); } finally { setBrandBusy(false); }
  };

  const saveBrand = async () => {
    if (!companyId) { setBrandMsg('No company context'); return; }
    setBrandBusy(true); setBrandMsg('');
    const { error } = await supabase.from('companies').update({
      logo: brand.logo?.trim() ? brand.logo.trim() : null,
      address: brand.address?.trim() ? brand.address.trim() : null,
    }).eq('id', companyId);
    setBrandBusy(false);
    if (error) { setBrandMsg(error.message); return; }
    setBrandMsg('Branding saved.'); refresh?.();
  };

  const saveWork = async () => {
    if (!companyId) return;
    const { error } = await supabase.from('companies').update({
      workday_start: work.workdayStart,
      late_after_minutes: Number(work.lateAfterMinutes),
      full_day_hours: Number(work.fullDayHours),
      staff_see_people_widgets: !!work.staffSeePeopleWidgets,
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
        {/* ---- Company branding ---- */}
        <div className="card p-5 lg:col-span-2">
          <div className="mb-1 flex items-center gap-2"><ImageIcon size={18} className="text-brand-600" /><span className="font-semibold">Company branding</span></div>
          <p className="mb-4 text-xs text-slate-400">Your logo and address appear in the sidebar and on printed payslips.</p>
          {brandMsg && <div className="mb-3 text-sm text-emerald-600">{brandMsg}</div>}
          <div className="flex flex-wrap items-start gap-5">
            <div className="shrink-0">
              <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-xl border bg-white dark:border-slate-700">
                {brand.logo && !logoBroken ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={brand.logo} alt="Company logo" className="h-full w-full object-contain p-1" onError={() => setLogoBroken(true)} />
                ) : (
                  <span className="text-2xl font-extrabold text-brand-600">{company?.name ? company.name[0] : 'H'}</span>
                )}
              </div>
              {brand.logo && logoBroken && <p className="mt-1 w-20 text-[10px] leading-tight text-rose-500">Image didn&apos;t load</p>}
            </div>
            <div className="min-w-[16rem] flex-1 space-y-3">
              <div>
                <label className="label">Logo</label>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="btn-outline cursor-pointer">
                    <Upload size={15} /> {brandBusy ? 'Uploading…' : 'Upload image'}
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" disabled={brandBusy}
                      onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; uploadLogo(f); }} />
                  </label>
                  {brand.logo && <button className="btn-ghost text-rose-500" onClick={() => { setBrand((b) => ({ ...b, logo: '' })); setLogoBroken(false); }}><Trash2 size={15} /> Remove</button>}
                </div>
                <p className="mt-1 text-xs text-slate-400">PNG, JPG, WEBP or SVG, up to 2 MB. A square image works best.</p>
              </div>
              <div>
                <label className="label">Address</label>
                <textarea className="input min-h-[4.5rem]" placeholder="Registered address shown on payslips" value={brand.address} onChange={(e) => setBrand((b) => ({ ...b, address: e.target.value }))} />
              </div>
              <button className="btn-primary disabled:opacity-60" disabled={brandBusy} onClick={saveBrand}>{brandBusy ? 'Saving…' : 'Save branding'}</button>
            </div>
          </div>
        </div>

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
            <label className="col-span-full flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input type="checkbox" className="h-4 w-4" checked={work.staffSeePeopleWidgets} onChange={(e) => setWork((w) => ({ ...w, staffSeePeopleWidgets: e.target.checked }))} />
              Show people widgets (birthdays, new joiners, people on leave) to all staff on their dashboard. Managers &amp; HR always see them.
            </label>
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
                <th className="py-2 pr-4 font-medium">Leave type</th><th className="py-2 pr-4 font-medium">Annual quota</th><th className="py-2 pr-4 font-medium">Accrual / month</th><th className="py-2 pr-4 font-medium">Eligibility (months)</th><th className="py-2 pr-4 font-medium">Carry-forward cap</th><th className="py-2 pr-4 font-medium">Reason required (≥ days)</th><th className="py-2 pr-4 font-medium">Expiry</th>
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
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <select className="input w-44" value={pol[t]?.expiryMode || 'NONE'} onChange={setPolField(t, 'expiryMode')}>
                          <option value="NONE">Never expires</option>
                          <option value="END_OF_ACCRUAL_MONTH">At end of each month</option>
                          <option value="FIXED_DATE">On a date each year</option>
                        </select>
                        {pol[t]?.expiryMode === 'FIXED_DATE' && (
                          <input className="input w-24" placeholder="MM-DD" maxLength={5} value={pol[t]?.expiryDay || ''} onChange={setPolField(t, 'expiryDay')} title="Day each year when the balance lapses to the carry-forward cap, e.g. 12-31" />
                        )}
                      </div>
                    </td>
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

        {/* ---- Overtime policies ---- */}
        <div className="card p-5 lg:col-span-2">
          <div className="mb-1 flex items-center gap-2"><Timer size={18} className="text-brand-600" /><span className="font-semibold">Overtime policies</span></div>
          <p className="mb-3 text-xs text-slate-400">Overtime is measured from real check-in/out punches. When more than one policy matches an employee, the one highest in this list wins.</p>
          {otMsg && <div className="mb-3 text-sm text-emerald-600">{otMsg}</div>}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-sm">
              <thead className="text-left text-xs uppercase text-slate-400">
                <tr>
                  <th className="py-2 pr-2 font-medium">Order</th>
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Applies to</th>
                  <th className="py-2 pr-4 font-medium">Counts after</th>
                  <th className="py-2 pr-4 font-medium">Min OT (min)</th>
                  <th className="py-2 pr-4 font-medium">Rate</th>
                  <th className="py-2 pr-4 font-medium">Monthly cap (h)</th>
                  <th className="py-2 pr-4 font-medium">Comp-off</th>
                  <th className="py-2 pr-4 font-medium">Active</th>
                  <th className="py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {otRows.length === 0 && <tr><td colSpan={10} className="py-6 text-center text-slate-400">No overtime policies yet. Add one to start paying or banking overtime.</td></tr>}
                {otRows.map((r, i) => (
                  <tr key={r._id || `new-${i}`} className="border-t dark:border-slate-700">
                    <td className="py-2 pr-2">
                      <div className="flex items-center gap-0.5">
                        <button className="btn-ghost p-1 disabled:opacity-30" disabled={i === 0} onClick={() => moveOt(i, -1)} title="Higher priority"><ArrowUp size={13} /></button>
                        <button className="btn-ghost p-1 disabled:opacity-30" disabled={i === otRows.length - 1} onClick={() => moveOt(i, 1)} title="Lower priority"><ArrowDown size={13} /></button>
                      </div>
                    </td>
                    <td className="py-2 pr-4"><input className="input w-36" value={r.name} onChange={setOtField(i, 'name')} placeholder="e.g. Standard OT" /></td>
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-1">
                        <select className="input w-28" value={r.scopeType} onChange={setOtField(i, 'scopeType')}>
                          <option value="ALL">Everyone</option>
                          <option value="DEPARTMENT">Department</option>
                          <option value="DESIGNATION">Designation</option>
                          <option value="EMPLOYEE">Employee</option>
                        </select>
                        {r.scopeType !== 'ALL' && (
                          <select className="input w-36" value={r.scopeId || ''} onChange={setOtField(i, 'scopeId')}>
                            <option value="">— pick —</option>
                            {(r.scopeType === 'DEPARTMENT' ? depts.map((d) => [d._id, d.name])
                              : r.scopeType === 'DESIGNATION' ? desigs.map((d) => [d._id, d.title])
                              : empList.map((e) => [e._id, `${e.firstName} ${e.lastName || ''}`.trim()])
                            ).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                          </select>
                        )}
                      </div>
                    </td>
                    <td className="py-2 pr-4"><input type="number" min="1" max="1440" className="input w-28" placeholder="shift length" value={r.dailyThresholdMinutes ?? ''} onChange={setOtField(i, 'dailyThresholdMinutes')} title="Minutes worked in a day before overtime starts. Blank = the employee's shift length." /></td>
                    <td className="py-2 pr-4"><input type="number" min="0" className="input w-20" value={r.minMinutes ?? 0} onChange={setOtField(i, 'minMinutes')} title="Ignore overtime shorter than this" /></td>
                    <td className="py-2 pr-4"><input type="number" step="0.1" min="0.1" max="10" className="input w-20" value={r.rateMultiplier} onChange={setOtField(i, 'rateMultiplier')} title="Multiplier on the hourly rate" /></td>
                    <td className="py-2 pr-4"><input type="number" min="0" step="0.5" className="input w-20" placeholder="none" value={r.maxHoursPerMonth ?? ''} onChange={setOtField(i, 'maxHoursPerMonth')} /></td>
                    <td className="py-2 pr-4"><input type="checkbox" className="h-4 w-4" checked={!!r.compOffInstead} onChange={setOtField(i, 'compOffInstead')} title="Give comp-off instead of paying" /></td>
                    <td className="py-2 pr-4"><input type="checkbox" className="h-4 w-4" checked={r.isActive !== false} onChange={setOtField(i, 'isActive')} /></td>
                    <td className="py-2"><button className="btn-ghost p-1.5 text-rose-500" onClick={() => removeOt(i)} title="Delete policy"><Trash2 size={15} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button className="btn-outline" onClick={addOt}><Plus size={15} /> Add policy</button>
            <button className="btn-primary disabled:opacity-60" disabled={otBusy} onClick={saveOt}>{otBusy ? 'Saving…' : 'Save overtime policies'}</button>
          </div>
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

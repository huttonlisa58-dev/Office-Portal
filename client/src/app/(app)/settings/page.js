'use client';
import { useCallback, useEffect, useState } from 'react';
import { Building2, Layers, Briefcase, Clock, Trash2, Plus } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Loader from '@/components/Loader';
import { useAuth } from '@/context/AuthContext';
import { org } from '@/lib/db';
import { supabase } from '@/lib/supabaseClient';

export default function SettingsPage() {
  const { user, company, refresh } = useAuth();
  const companyId = company?._id || company?.id;
  const [depts, setDepts] = useState([]);
  const [desigs, setDesigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newDept, setNewDept] = useState('');
  const [newDesig, setNewDesig] = useState('');
  const [work, setWork] = useState({ workdayStart: '09:00', lateAfterMinutes: 15, fullDayHours: 8 });
  const [savedMsg, setSavedMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const [d, g] = await Promise.all([org.departments(), org.designations()]); setDepts(d); setDesigs(g); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (company?.workSettings) setWork((w) => ({ ...w, ...company.workSettings })); }, [company]);

  const addDept = async () => { if (!newDept || !companyId) return; await org.addDepartment(companyId, newDept); setNewDept(''); load(); };
  const delDept = async (id) => { await org.delDepartment(id); load(); };
  const addDesig = async () => { if (!newDesig || !companyId) return; await org.addDesignation(companyId, newDesig); setNewDesig(''); load(); };
  const delDesig = async (id) => { await org.delDesignation(id); load(); };

  const saveWork = async () => {
    if (!companyId) return;
    const { error } = await supabase.from('companies').update({
      workday_start: work.workdayStart,
      late_after_minutes: Number(work.lateAfterMinutes),
      full_day_hours: Number(work.fullDayHours),
    }).eq('id', companyId);
    if (error) { setSavedMsg(error.message); return; }
    setSavedMsg('Work settings saved.'); refresh?.(); setTimeout(() => setSavedMsg(''), 3000);
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

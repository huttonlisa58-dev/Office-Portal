'use client';
import { useCallback, useEffect, useState } from 'react';
import { FolderKanban, Plus, Pencil, Trash2, Users } from 'lucide-react';
import PageBanner from '@/components/PageBanner';
import Loader from '@/components/Loader';
import Modal from '@/components/Modal';
import { EmptyState } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { projects as api, employees as empApi } from '@/lib/db';

const STATUSES = ['ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'];
const tone = (s) => ({ ACTIVE: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300', ON_HOLD: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300', COMPLETED: 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300', ARCHIVED: 'bg-slate-100 text-slate-500 dark:bg-slate-800' }[s] || 'bg-slate-100 text-slate-500');

export default function ProjectsPage() {
  const { user } = useAuth();
  const canManage = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'MANAGER'].includes(user?.role);
  const [items, setItems] = useState(null);
  const [emps, setEmps] = useState([]);
  const [edit, setEdit] = useState(null);
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => { try { setItems(await api.list()); } catch { setItems([]); } }, []);
  useEffect(() => { load(); empApi.list({ limit: 200 }).then((r) => setEmps(r.items)).catch(() => {}); }, [load]);

  const remove = async (p) => { if (!window.confirm(`Delete project “${p.name}”? Tasks under it are kept but unlinked.`)) return; try { await api.remove(p._id); load(); } catch (e) { window.alert(e.message); } };

  return (
    <>
      <PageBanner icon={FolderKanban} title="Projects">
        {canManage && <button className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-sky-600 hover:bg-sky-50" onClick={() => setEdit({})}><Plus size={15} className="mr-1 inline" />New project</button>}
      </PageBanner>

      {items === null ? <Loader /> : items.length === 0 ? (
        <EmptyState title="No projects yet" subtitle="Group work into projects and track tasks and contributors." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <div key={p._id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <button className="text-left font-semibold hover:text-sky-600" onClick={() => setDetail(p)}>{p.name}</button>
                <span className={`badge ${tone(p.status)}`}>{p.status.replace('_', ' ')}</span>
              </div>
              {p.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{p.description}</p>}
              <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                <span>Owner: {p.owner ? `${p.owner.firstName} ${p.owner.lastName || ''}` : '—'}</span>
                <span>{p.doneCount}/{p.taskCount} tasks</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                <Users size={13} /> {p.contributors.length} contributor{p.contributors.length === 1 ? '' : 's'}
              </div>
              {canManage && (
                <div className="mt-3 flex justify-end gap-1 border-t pt-2 dark:border-slate-700">
                  <button className="btn-ghost p-1.5" title="Edit" onClick={() => setEdit(p)}><Pencil size={15} /></button>
                  <button className="btn-ghost p-1.5 text-rose-500" title="Delete" onClick={() => remove(p)}><Trash2 size={15} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {edit && <ProjectModal project={edit} emps={emps} companyId={user?.company} onClose={() => setEdit(null)} onDone={() => { setEdit(null); load(); }} />}
      {detail && <DetailModal project={detail} onClose={() => setDetail(null)} />}
    </>
  );
}

function ProjectModal({ project, emps, companyId, onClose, onDone }) {
  const isNew = !project._id;
  const [form, setForm] = useState({ name: project.name || '', description: project.description || '', ownerId: project.ownerId || '', status: project.status || 'ACTIVE' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!form.name.trim()) { setErr('Project name is required.'); return; }
    setBusy(true); setErr('');
    try {
      if (isNew) await api.create({ company_id: companyId, name: form.name.trim(), description: form.description, ownerId: form.ownerId, status: form.status });
      else await api.update(project._id, { name: form.name.trim(), description: form.description, ownerId: form.ownerId, status: form.status });
      onDone();
    } catch (e) { setErr(e.message || 'Could not save'); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={isNew ? 'New project' : 'Edit project'}
      footer={<><button className="btn-outline" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></>}>
      <div className="space-y-3">
        {err && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-950/40">{err}</div>}
        <div><label className="label">Project name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Website revamp" /></div>
        <div><label className="label">Description</label><textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div><label className="label">Owner</label><select className="input" value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })}><option value="">— none —</option>{emps.map((e) => <option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>)}</select></div>
          <div><label className="label">Status</label><select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select></div>
        </div>
      </div>
    </Modal>
  );
}

function DetailModal({ project, onClose }) {
  return (
    <Modal open onClose={onClose} title={project.name} footer={<button className="btn-outline" onClick={onClose}>Close</button>}>
      <div className="space-y-4">
        {project.description && <p className="text-sm text-slate-500">{project.description}</p>}
        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat label="Tasks" value={project.taskCount} />
          <Stat label="Completed" value={project.doneCount} />
          <Stat label="Contributors" value={project.contributors.length} />
        </div>
        <div>
          <div className="mb-2 text-sm font-semibold">Contributors</div>
          {project.contributors.length === 0 ? <p className="text-sm text-slate-400">No contributors yet — assign people to this project’s tasks.</p> : (
            <div className="flex flex-wrap gap-2">
              {project.contributors.map((c) => (
                <span key={c._id} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs dark:bg-slate-800">
                  {c.firstName} {c.lastName || ''} <span className="text-slate-400">{c.employeeId}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function Stat({ label, value }) {
  return <div className="rounded-xl bg-slate-50 px-3 py-3 dark:bg-slate-800/60"><div className="text-xl font-bold">{value}</div><div className="text-[11px] text-slate-400">{label}</div></div>;
}

'use client';
import { useCallback, useEffect, useState } from 'react';
import { ListChecks, Plus, Calendar, ChevronRight } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Loader from '@/components/Loader';
import Modal from '@/components/Modal';
import { EmptyState } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { tasks as taskApi, employees as empApi } from '@/lib/db';

const COLUMNS = [
  { key: 'TODO', label: 'To do' },
  { key: 'IN_PROGRESS', label: 'In progress' },
  { key: 'REVIEW', label: 'Review' },
  { key: 'DONE', label: 'Done' },
];
const NEXT = { TODO: 'IN_PROGRESS', IN_PROGRESS: 'REVIEW', REVIEW: 'DONE', DONE: 'DONE' };
const PRIORITY = { LOW: 'bg-slate-100 text-slate-600 dark:bg-slate-800', MEDIUM: 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300', HIGH: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300', URGENT: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' };

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const list = await taskApi.list(); setTasks(list); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const advance = async (t) => {
    try { await taskApi.advance(t._id, NEXT[t.status]); load(); }
    catch (e) { alert(e.message || 'Update failed'); }
  };

  return (
    <>
      <PageHeader title="Tasks" subtitle="Track work across your team"
        actions={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> New task</button>} />

      {loading ? <Loader /> : tasks.length === 0 ? (
        <EmptyState icon={ListChecks} title="No tasks yet" hint="Create your first task to start tracking work."
          action={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> New task</button>} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-4">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.key);
            return (
              <div key={col.key} className="rounded-2xl bg-slate-100/60 p-3 dark:bg-slate-900/40">
                <div className="mb-3 flex items-center justify-between px-1">
                  <span className="text-sm font-semibold">{col.label}</span>
                  <span className="badge bg-white text-slate-500 dark:bg-slate-800">{colTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {colTasks.map((t) => (
                    <div key={t._id} className="card p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-medium leading-snug">{t.title}</div>
                        {t.priority && <span className={`badge ${PRIORITY[t.priority] || PRIORITY.MEDIUM}`}>{t.priority}</span>}
                      </div>
                      {t.description && <p className="mt-1 text-xs text-slate-500 line-clamp-2">{t.description}</p>}
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                        <span className="flex items-center gap-1">{t.dueDate && <><Calendar size={12} /> {new Date(t.dueDate).toLocaleDateString()}</>}</span>
                        {t.status !== 'DONE' && <button className="inline-flex items-center gap-0.5 text-brand-600 hover:underline" onClick={() => advance(t)}>Advance <ChevronRight size={12} /></button>}
                      </div>
                      {t.assignees?.length > 0 && (
                        <div className="mt-2 flex -space-x-2">
                          {t.assignees.slice(0, 4).map((a) => (
                            <div key={a._id} className="grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-brand-600 text-[10px] font-semibold text-white dark:border-slate-900" title={`${a.firstName} ${a.lastName}`}>
                              {a.firstName?.[0]}{a.lastName?.[0]}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {colTasks.length === 0 && <div className="rounded-xl border border-dashed py-6 text-center text-xs text-slate-400">Nothing here</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {open && <CreateTask onClose={() => setOpen(false)} onSaved={() => { setOpen(false); load(); }} />}
    </>
  );
}

function CreateTask({ onClose, onSaved }) {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({ title: '', description: '', priority: 'MEDIUM', dueDate: '', assignees: [] });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { empApi.list({ limit: 100 }).then((r) => setEmployees(r.items)).catch(() => {}); }, []);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setBusy(true); setErr('');
    try {
      await taskApi.create({ company_id: user.company, created_by: user.id, title: form.title, description: form.description, priority: form.priority, dueDate: form.dueDate || null, assignees: form.assignees });
      onSaved();
    } catch (e) { setErr(e.message || 'Could not create task'); }
    finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title="New task"
      footer={<><button className="btn-outline" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={busy || !form.title} onClick={save}>{busy ? 'Creating…' : 'Create task'}</button></>}>
      {err && <div className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{err}</div>}
      <div className="grid gap-4">
        <div><label className="label">Title *</label><input className="input" value={form.title} onChange={set('title')} /></div>
        <div><label className="label">Description</label><textarea className="input" rows={3} value={form.description} onChange={set('description')} /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="label">Priority</label>
            <select className="input" value={form.priority} onChange={set('priority')}>{['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => <option key={p}>{p}</option>)}</select>
          </div>
          <div><label className="label">Due date</label><input className="input" type="date" value={form.dueDate} onChange={set('dueDate')} /></div>
        </div>
        <div>
          <label className="label">Assignees</label>
          <select className="input" multiple value={form.assignees} onChange={(e) => setForm((f) => ({ ...f, assignees: [...e.target.selectedOptions].map((o) => o.value) }))} size={Math.min(5, Math.max(2, employees.length))}>
            {employees.map((e) => <option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>)}
          </select>
          <p className="mt-1 text-xs text-slate-400">Hold Ctrl / Cmd to select multiple.</p>
        </div>
      </div>
    </Modal>
  );
}

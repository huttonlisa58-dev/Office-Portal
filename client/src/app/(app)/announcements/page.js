'use client';
import { useCallback, useEffect, useState } from 'react';
import { Megaphone, Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import PageBanner from '@/components/PageBanner';
import Loader from '@/components/Loader';
import Modal from '@/components/Modal';
import { EmptyState } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { announcements as api } from '@/lib/db';

const AUDIENCES = ['ALL', 'MANAGERS', 'EMPLOYEES'];
const audienceLabel = { ALL: 'Everyone', MANAGERS: 'Managers', EMPLOYEES: 'Employees' };
const fmt = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '');

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const canManage = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR'].includes(user?.role);
  const isManager = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'MANAGER'].includes(user?.role);
  const [items, setItems] = useState(null);
  const [edit, setEdit] = useState(null);

  const load = useCallback(async () => { try { setItems(await api.list()); } catch { setItems([]); } }, []);
  useEffect(() => { load(); }, [load]);

  // employees see only active announcements targeted to them
  const visible = (items || []).filter((a) => {
    if (canManage) return true;
    if (!a.isActive) return false;
    if (a.audience === 'MANAGERS') return isManager;
    if (a.audience === 'EMPLOYEES') return !isManager || user?.role === 'MANAGER';
    return true;
  });

  const remove = async (a) => { if (!window.confirm(`Delete announcement “${a.title}”?`)) return; try { await api.remove(a._id); load(); } catch (e) { window.alert(e.message); } };
  const toggle = async (a) => { try { await api.setActive(a._id, !a.isActive); load(); } catch (e) { window.alert(e.message); } };

  return (
    <>
      <PageBanner icon={Megaphone} title="Announcements">
        {canManage && <button className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-sky-600 hover:bg-sky-50" onClick={() => setEdit({})}><Plus size={15} className="mr-1 inline" />New announcement</button>}
      </PageBanner>

      {items === null ? <Loader /> : visible.length === 0 ? (
        <EmptyState title="No announcements" subtitle={canManage ? 'Publish company-wide updates here.' : 'Check back later for company updates.'} />
      ) : (
        <div className="mx-auto max-w-3xl space-y-4">
          {visible.map((a) => (
            <div key={a._id} className={`card p-5 ${!a.isActive ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{a.title}</h3>
                    {!a.isActive && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800">Inactive</span>}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-400">{fmt(a.publishedAt)}{a.authorName ? ` · ${a.authorName}` : ''} · {audienceLabel[a.audience] || a.audience}</div>
                </div>
                {canManage && (
                  <div className="flex shrink-0 gap-1">
                    <button className="btn-ghost p-1.5" title={a.isActive ? 'Make inactive' : 'Make active'} onClick={() => toggle(a)}>{a.isActive ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                    <button className="btn-ghost p-1.5" title="Edit" onClick={() => setEdit(a)}><Pencil size={15} /></button>
                    <button className="btn-ghost p-1.5 text-rose-500" title="Delete" onClick={() => remove(a)}><Trash2 size={15} /></button>
                  </div>
                )}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{a.body}</p>
            </div>
          ))}
        </div>
      )}

      {edit && <AnnouncementModal item={edit} companyId={user?.company} userId={user?.id} onClose={() => setEdit(null)} onDone={() => { setEdit(null); load(); }} />}
    </>
  );
}

function AnnouncementModal({ item, companyId, userId, onClose, onDone }) {
  const isNew = !item._id;
  const [form, setForm] = useState({ title: item.title || '', body: item.body || '', audience: item.audience || 'ALL' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!form.title.trim() || !form.body.trim()) { setErr('Title and body are required.'); return; }
    setBusy(true); setErr('');
    try {
      if (isNew) await api.create({ company_id: companyId, published_by: userId, title: form.title.trim(), body: form.body.trim(), audience: form.audience });
      else await api.update(item._id, { title: form.title.trim(), body: form.body.trim(), audience: form.audience });
      onDone();
    } catch (e) { setErr(e.message || 'Could not save'); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={isNew ? 'New announcement' : 'Edit announcement'}
      footer={<><button className="btn-outline" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Publish'}</button></>}>
      <div className="space-y-3">
        {err && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-950/40">{err}</div>}
        <div><label className="label">Title</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <div><label className="label">Message</label><textarea className="input min-h-[120px]" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
        <div><label className="label">Audience</label><select className="input" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>{AUDIENCES.map((a) => <option key={a} value={a}>{audienceLabel[a]}</option>)}</select></div>
      </div>
    </Modal>
  );
}

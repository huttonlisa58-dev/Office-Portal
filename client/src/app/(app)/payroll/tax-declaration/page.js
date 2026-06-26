'use client';
import { useCallback, useEffect, useState } from 'react';
import { ReceiptText, Plus, Check, X, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import PageBanner from '@/components/PageBanner';
import Loader from '@/components/Loader';
import Modal from '@/components/Modal';
import { EmptyState, StatusBadge } from '@/components/ui';
import { money } from '@/lib/format';
import { useAuth } from '@/context/AuthContext';
import { taxDeclarations as api } from '@/lib/db';

const SECTIONS = ['80C', '80CCD(1B) NPS', '80D Medical insurance', '80E Education loan', '80G Donations', '80TTA Savings interest', 'HRA', 'Home loan interest (24b)', 'LTA', 'Other'];
const currentFY = () => { const d = new Date(); const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1; return `${y}-${String((y + 1) % 100).padStart(2, '0')}`; };

export default function TaxDeclarationPage() {
  const { user } = useAuth();
  const canManage = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR'].includes(user?.role);
  const hasEmployee = !!user?.employee;
  const [items, setItems] = useState(null);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => { try { setItems(await api.list()); } catch { setItems([]); } }, []);
  useEffect(() => { load(); }, [load]);

  const mine = canManage ? items : (items || []).filter((d) => d.employee?.employeeId === user?.employeeCode);
  const decide = async (d, status) => { try { await api.decide(d._id, status); load(); } catch (e) { window.alert(e.message); } };
  const remove = async (d) => { if (!window.confirm('Delete this declaration?')) return; try { await api.remove(d._id); load(); } catch (e) { window.alert(e.message); } };

  return (
    <>
      <PageBanner icon={ReceiptText} title="Income-tax declaration">
        {hasEmployee && <button className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-sky-600 hover:bg-sky-50" onClick={() => setOpen(true)}><Plus size={15} className="mr-1 inline" />Declare investments</button>}
      </PageBanner>

      {items === null ? <Loader /> : (mine || []).length === 0 ? (
        <EmptyState title="No declarations yet" subtitle="Declare your tax-saving investments for the financial year." />
      ) : (
        <div className="card overflow-hidden">
          <div className="border-b px-5 py-3 font-semibold dark:border-slate-700">{canManage ? 'All declarations' : 'My declarations'}</div>
          <div className="divide-y dark:divide-slate-700">
            {(mine || []).map((d) => (
              <div key={d._id}>
                <div className="flex items-center justify-between px-5 py-3.5">
                  <button className="flex items-center gap-2 text-left" onClick={() => setExpanded(expanded === d._id ? null : d._id)}>
                    {expanded === d._id ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    <div>
                      <div className="font-medium">{canManage && d.employee ? `${d.employee.firstName} ${d.employee.lastName || ''} · ` : ''}FY {d.financialYear}</div>
                      <div className="text-xs text-slate-400">{d.regime === 'NEW' ? 'New regime' : 'Old regime'} · {d.items.length} item(s) · {money(d.totalDeclared, 'INR')}</div>
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={d.status} />
                    {canManage && d.status === 'PENDING' && (
                      <>
                        <button className="btn-ghost p-1.5 text-emerald-600" title="Approve" onClick={() => decide(d, 'APPROVED')}><Check size={16} /></button>
                        <button className="btn-ghost p-1.5 text-rose-500" title="Reject" onClick={() => decide(d, 'REJECTED')}><X size={16} /></button>
                      </>
                    )}
                    {canManage && <button className="btn-ghost p-1.5 text-rose-400" title="Delete" onClick={() => remove(d)}><Trash2 size={15} /></button>}
                  </div>
                </div>
                {expanded === d._id && (
                  <div className="bg-slate-50 px-5 py-3 dark:bg-slate-800/40">
                    <table className="w-full text-sm">
                      <tbody>
                        {d.items.map((it, i) => (
                          <tr key={i} className="border-b last:border-0 dark:border-slate-700">
                            <td className="py-1.5 text-slate-600 dark:text-slate-300">{it.section}{it.label ? ` — ${it.label}` : ''}</td>
                            <td className="py-1.5 text-right tabular-nums">{money(Number(it.amount || 0), 'INR')}</td>
                          </tr>
                        ))}
                        <tr className="font-semibold"><td className="py-1.5">Total declared</td><td className="py-1.5 text-right tabular-nums">{money(d.totalDeclared, 'INR')}</td></tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {open && <DeclareModal user={user} onClose={() => setOpen(false)} onDone={() => { setOpen(false); load(); }} />}
    </>
  );
}

function DeclareModal({ user, onClose, onDone }) {
  const [fy, setFy] = useState(currentFY());
  const [regime, setRegime] = useState('OLD');
  const [rows, setRows] = useState([{ section: '80C', label: '', amount: '' }]);
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);

  const setRow = (i, k, v) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const addRow = () => setRows((rs) => [...rs, { section: '80C', label: '', amount: '' }]);
  const delRow = (i) => setRows((rs) => rs.filter((_, idx) => idx !== i));

  const save = async () => {
    const items = rows.filter((r) => Number(r.amount || 0) > 0).map((r) => ({ section: r.section, label: r.label || null, amount: Number(r.amount) }));
    if (!items.length) { setErr('Add at least one investment with an amount.'); return; }
    setBusy(true); setErr('');
    try { await api.submit({ company_id: user.company, employee_id: user.employee, financialYear: fy, regime, items }); onDone(); }
    catch (e) { setErr(e.message || 'Could not submit'); } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title="Declare investments"
      footer={<><button className="btn-outline" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={save} disabled={busy}>{busy ? 'Submitting…' : 'Submit declaration'}</button></>}>
      <div className="space-y-3">
        {err && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-950/40">{err}</div>}
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Financial year</label><input className="input" value={fy} onChange={(e) => setFy(e.target.value)} placeholder="2025-26" /></div>
          <div><label className="label">Regime</label><select className="input" value={regime} onChange={(e) => setRegime(e.target.value)}><option value="OLD">Old</option><option value="NEW">New</option></select></div>
        </div>
        <div>
          <label className="label">Investments</label>
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <select className="input flex-1" value={r.section} onChange={(e) => setRow(i, 'section', e.target.value)}>{SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}</select>
                <input className="input flex-1" placeholder="Note (optional)" value={r.label} onChange={(e) => setRow(i, 'label', e.target.value)} />
                <input type="number" min="0" className="input w-28" placeholder="₹" value={r.amount} onChange={(e) => setRow(i, 'amount', e.target.value)} />
                {rows.length > 1 && <button className="btn-ghost p-1.5 text-rose-400" onClick={() => delRow(i)}><Trash2 size={14} /></button>}
              </div>
            ))}
          </div>
          <button className="mt-2 text-sm font-medium text-sky-600 hover:underline" onClick={addRow}>+ Add another</button>
        </div>
        <div className="flex justify-between border-t pt-2 font-semibold dark:border-slate-700"><span>Total declared</span><span>{money(total, 'INR')}</span></div>
      </div>
    </Modal>
  );
}

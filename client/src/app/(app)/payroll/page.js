'use client';
import { useCallback, useEffect, useState } from 'react';
import { Wallet, Plus, Download, BadgeCheck, Settings2, Play, Lock, LockOpen, Layers, Undo2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Loader from '@/components/Loader';
import Modal from '@/components/Modal';
import { EmptyState, StatusBadge } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { money } from '@/lib/format';
import { payroll as payApi, employees as empApi } from '@/lib/db';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function PayrollPage() {
  const { user, company } = useAuth();
  const canManage = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR'].includes(user?.role);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [genOpen, setGenOpen] = useState(false);
  const [structOpen, setStructOpen] = useState(false);
  const [runAllOpen, setRunAllOpen] = useState(false);
  const [payRunsOpen, setPayRunsOpen] = useState(false);
  const [q, setQ] = useState('');
  const [statusF, setStatusF] = useState('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    try { const list = await payApi.list({ role: user?.role, employeeId: user?.employee }); setItems(list); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const download = (p) => {
    const cur = p.currency || 'INR';
    const fmt = (n) => `${cur} ${Number(n || 0).toLocaleString()}`;
    const name = `${p.employee?.firstName || ''} ${p.employee?.lastName || ''}`.trim();
    const earnings = [{ label: 'Basic', amount: Number(p.basic || 0) }, ...(p.allowances || []).map((a) => ({ label: a.label || 'Allowance', amount: Number(a.amount || 0) }))];
    if (Number(p.bonus || 0) > 0) earnings.push({ label: 'Bonus', amount: Number(p.bonus) });
    const deductions = [...(p.deductions || []).map((d) => ({ label: d.label || 'Deduction', amount: Number(d.amount || 0) }))];
    if (Number(p.tax || 0) > 0) deductions.push({ label: 'Tax / TDS', amount: Number(p.tax) });
    const totalEarn = earnings.reduce((s, x) => s + x.amount, 0);
    const totalDed = deductions.reduce((s, x) => s + x.amount, 0);
    const employer = (p.employerContrib || []).map((x) => ({ label: x.label || 'Contribution', amount: Number(x.amount || 0) }));
    const totalEmp = employer.reduce((s, x) => s + x.amount, 0);
    const ctc = totalEarn + totalEmp;
    const rows = (arr) => arr.map((x) => `<tr><td>${x.label}</td><td class="r">${fmt(x.amount)}</td></tr>`).join('');
    const brand = `<div class="brand">${company?.logo ? `<img src="${company.logo}" alt="logo" class="logo"/>` : ''}<div><div class="cname">${company?.name || ''}</div>${company?.address ? `<div class="caddr">${company.address}</div>` : ''}</div></div>`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Payslip ${p.employee?.employeeId || ''} ${p.month}/${p.year}</title>
      <style>body{font-family:system-ui,Arial,sans-serif;color:#0f172a;max-width:720px;margin:32px auto;padding:0 16px}
      h1{font-size:20px;margin:0 0 4px}.muted{color:#64748b;font-size:13px}
      .brand{display:flex;align-items:center;gap:12px;margin-bottom:14px}.logo{height:44px;width:auto;object-fit:contain}
      .cname{font-size:17px;font-weight:700}.caddr{color:#64748b;font-size:12px;max-width:380px}
      table{width:100%;border-collapse:collapse;margin-top:18px;font-size:14px}
      td,th{padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:left}
      .r{text-align:right}.tot td{font-weight:700;border-top:2px solid #cbd5e1}
      .grid{display:flex;gap:24px;flex-wrap:wrap}.grid>div{flex:1;min-width:280px}
      .net{margin-top:20px;background:#f1f5f9;border-radius:12px;padding:14px 16px;display:flex;justify-content:space-between;font-size:17px;font-weight:700}
      .hd{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1f49f5;padding-bottom:12px}</style></head>
      <body>${brand}<div class="hd"><div><h1>Payslip</h1><div class="muted">${MONTHS[p.month - 1]} ${p.year}</div></div>
      <div class="muted r">${name}<br/>${p.employee?.employeeId || ''}${p.employee?.pan ? `<br/>PAN: ${p.employee.pan}` : ''}${p.employee?.uan ? `<br/>UAN: ${p.employee.uan}` : ''}${p.employee?.bankAccountNumber ? `<br/>A/C: ${p.employee.bankAccountNumber}${p.employee?.bankName ? ` (${p.employee.bankName})` : ''}` : ''}<br/>Status: ${p.status}</div></div>
      <div class="grid">
        <div><table><tr><th>Earnings</th><th class="r">Amount</th></tr>${rows(earnings)}<tr class="tot"><td>Gross</td><td class="r">${fmt(totalEarn)}</td></tr></table></div>
        <div><table><tr><th>Deductions</th><th class="r">Amount</th></tr>${deductions.length ? rows(deductions) : '<tr><td class="muted">None</td><td></td></tr>'}<tr class="tot"><td>Total deductions</td><td class="r">${fmt(totalDed)}</td></tr></table></div>
      </div>
      <div class="net"><span>Net pay</span><span>${fmt(p.netPay)}</span></div>
      ${employer.length ? `<table style="margin-top:18px"><tr><th>Employer contributions (not deducted)</th><th class="r">Amount</th></tr>${rows(employer)}<tr class="tot"><td>Cost to company (gross + employer)</td><td class="r">${fmt(ctc)}</td></tr></table>` : ''}
      <p class="muted" style="margin-top:24px">Generated by HRMS · This is a system-generated payslip. Use your browser's “Save as PDF”.</p>
      <script>window.onload=()=>window.print()</script></body></html>`;
    const w = window.open('', '_blank');
    if (!w) { alert('Allow pop-ups to view the payslip.'); return; }
    w.document.write(html); w.document.close();
  };

  const markPaid = async (p) => {
    try { await payApi.markPaid(p._id); load(); }
    catch (e) { alert(e.message || 'Action failed'); }
  };
  const toggleHold = async (p, withheld) => {
    try { await payApi.setWithheld(p._id, withheld); load(); }
    catch (e) { alert(e.message || 'Action failed'); }
  };
  const markUnpaid = async (p) => {
    try { await payApi.markUnpaid(p._id); load(); }
    catch (e) { alert(e.message || 'Action failed'); }
  };

  const needle = q.trim().toLowerCase();
  const shown = items.filter((p) => {
    if (statusF === 'HELD') { if (!p.isWithheld) return false; }
    else if (statusF !== 'ALL' && p.status !== statusF) return false;
    if (!needle) return true;
    const name = `${p.employee?.firstName || ''} ${p.employee?.lastName || ''}`.toLowerCase();
    const code = (p.employee?.employeeId || '').toLowerCase();
    return name.includes(needle) || code.includes(needle);
  });

  // Bank statement export: a salary-upload CSV for net-pay transfers.
  // Skips anyone without an account number + IFSC and tells you who was skipped,
  // so you never silently under-pay someone.
  const exportBank = () => {
    const payable = shown.filter((p) => p.employee?.bankAccountNumber && p.employee?.bankIfsc);
    const skipped = shown.filter((p) => !(p.employee?.bankAccountNumber && p.employee?.bankIfsc));
    if (!payable.length) {
      alert(`No payslips have bank details.\n\nAdd account number + IFSC on the employee (Edit employee → Bank details) before exporting.${skipped.length ? `\n\nMissing for: ${skipped.map((p) => p.employee?.employeeId || '?').join(', ')}` : ''}`);
      return;
    }
    const esc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const rows = [
      ['Beneficiary Name', 'Beneficiary Account Number', 'IFSC', 'Bank Name', 'Amount', 'Payment Ref', 'Remarks'],
      ...payable.map((p) => [
        p.employee?.bankAccountName || `${p.employee?.firstName || ''} ${p.employee?.lastName || ''}`.trim(),
        p.employee?.bankAccountNumber, p.employee?.bankIfsc, p.employee?.bankName || '',
        Number(p.netPay || 0).toFixed(2),
        `SAL-${p.employee?.employeeId || ''}-${String(p.month).padStart(2, '0')}${p.year}`,
        `Salary ${MONTHS[p.month - 1]} ${p.year}`,
      ]),
    ];
    const csv = rows.map((r) => r.map(esc).join(',')).join('\r\n');
    const total = payable.reduce((s, p) => s + Number(p.netPay || 0), 0);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `salary-bank-transfer-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    if (skipped.length) alert(`Exported ${payable.length} transfer(s) totalling ${total.toFixed(2)}.\n\nSkipped ${skipped.length} (no bank details): ${skipped.map((p) => p.employee?.employeeId || '?').join(', ')}`);
  };

  return (
    <>
      <PageHeader title="Payroll" subtitle="Generate runs, manage salary structures, and issue payslips"
        actions={canManage && (
          <div className="flex gap-2">
            <button className="btn-outline" onClick={() => setStructOpen(true)}><Settings2 size={16} /> Salary structure</button>
            <button className="btn-outline" onClick={exportBank} title="Download a bank salary-transfer file for the payslips shown"><Download size={16} /> Bank file</button>
            <button className="btn-outline" onClick={() => setRunAllOpen(true)}><Play size={16} /> Run for all</button>
            <button className="btn-outline" onClick={() => setPayRunsOpen(true)}><Layers size={16} /> Pay runs</button>
            <button className="btn-primary" onClick={() => setGenOpen(true)}><Plus size={16} /> Generate payroll</button>
          </div>
        )} />

      {loading ? <Loader /> : items.length === 0 ? (
        <EmptyState icon={Wallet} title="No payroll runs yet" hint={canManage ? 'Set a salary structure, then generate your first run.' : 'Your payslips will appear here.'}
          action={canManage && <button className="btn-primary" onClick={() => setGenOpen(true)}><Plus size={16} /> Generate payroll</button>} />
      ) : (
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3 dark:border-slate-700">
            <input className="input h-9 w-full max-w-xs py-1" placeholder="Search employee name or ID…" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="flex flex-wrap gap-1.5">
              {['ALL', 'GENERATED', 'PAID', 'HELD'].map((f) => (
                <button key={f} onClick={() => setStatusF(f)} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${statusF === f ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}>{f === 'ALL' ? 'All' : f[0] + f.slice(1).toLowerCase()}</button>
              ))}
            </div>
            <span className="ml-auto text-xs text-slate-400">{shown.length} of {items.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-slate-400">
                <th className="px-5 py-3 font-medium">Employee</th><th className="px-5 py-3 font-medium">Period</th>
                <th className="px-5 py-3 font-medium">Gross</th><th className="px-5 py-3 font-medium">Tax</th>
                <th className="px-5 py-3 font-medium">Net pay</th><th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr></thead>
              <tbody>
                {shown.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">No matching payslips.</td></tr>}
                {shown.map((p) => (
                  <tr key={p._id} className="border-b last:border-0">
                    <td className="px-5 py-3 font-medium">{p.employee?.firstName} {p.employee?.lastName} <span className="text-xs text-slate-400">({p.employee?.employeeId})</span></td>
                    <td className="px-5 py-3 text-slate-500">{MONTHS[p.month - 1]} {p.year}</td>
                    <td className="px-5 py-3">{money(p.gross, p.currency)}</td>
                    <td className="px-5 py-3 text-slate-500">{money(p.tax, p.currency)}</td>
                    <td className="px-5 py-3 font-semibold">{money(p.netPay, p.currency)}</td>
                    <td className="px-5 py-3"><div className="flex items-center gap-1.5"><StatusBadge status={p.status} />{p.isWithheld && <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">HELD</span>}</div></td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button className="btn-ghost p-1.5" title="Download payslip" onClick={() => download(p)}><Download size={16} /></button>
                        {canManage && (p.isWithheld
                          ? <button className="btn-ghost p-1.5 text-sky-600" title="Release withheld" onClick={() => toggleHold(p, false)}><LockOpen size={16} /></button>
                          : p.status !== 'PAID' && <button className="btn-ghost p-1.5 text-amber-600" title="Withhold (full & final)" onClick={() => toggleHold(p, true)}><Lock size={16} /></button>)}
                        {canManage && p.status !== 'PAID' && !p.isWithheld && <button className="btn-ghost p-1.5 text-emerald-600" title="Mark paid" onClick={() => markPaid(p)}><BadgeCheck size={16} /></button>}
                        {canManage && p.status === 'PAID' && <button className="btn-ghost p-1.5 text-slate-500" title="Mark unpaid" onClick={() => markUnpaid(p)}><Undo2 size={16} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {genOpen && <GeneratePayroll onClose={() => setGenOpen(false)} onSaved={() => { setGenOpen(false); load(); }} />}
      {runAllOpen && <RunAllModal onClose={() => setRunAllOpen(false)} onSaved={() => { setRunAllOpen(false); load(); }} />}
      {payRunsOpen && <PayRunsModal onClose={() => setPayRunsOpen(false)} onChanged={() => { load(); }} />}
      {structOpen && <StructureEditor onClose={() => setStructOpen(false)} />}
    </>
  );
}

function useEmployees() {
  const [employees, setEmployees] = useState([]);
  useEffect(() => { empApi.list({ limit: 100 }).then((r) => setEmployees(r.items)).catch(() => {}); }, []);
  return employees;
}

function RunAllModal({ onClose, onSaved }) {
  const now = new Date();
  const [form, setForm] = useState({ month: now.getMonth() + 1, year: now.getFullYear() });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const run = async () => {
    setBusy(true); setErr('');
    try { await payApi.runAll({ month: form.month, year: form.year }); onSaved(); }
    catch (e) { setErr(e.message || 'Run failed'); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title="Run payroll for all employees"
      footer={<><button className="btn-outline" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={busy} onClick={run}>{busy ? 'Running…' : 'Run'}</button></>}>
      {err && <div className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div>}
      <div className="grid grid-cols-2 gap-4">
        <div><label className="label">Month</label><select className="input" value={form.month} onChange={set('month')}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></div>
        <div><label className="label">Year</label><input className="input" type="number" value={form.year} onChange={set('year')} /></div>
      </div>
      <p className="mt-3 text-xs text-slate-400">Generates payslips for every active employee who has a salary structure. Existing payslips for that month are skipped.</p>
    </Modal>
  );
}

function GeneratePayroll({ onClose, onSaved }) {
  const employees = useEmployees();
  const now = new Date();
  const [form, setForm] = useState({ employeeId: '', month: now.getMonth() + 1, year: now.getFullYear(), bonus: 0, lopDays: 0 });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setBusy(true); setErr('');
    try {
      await payApi.generate({
        employee_id: form.employeeId, month: Number(form.month), year: Number(form.year),
        bonus: Number(form.bonus), lop_days: Number(form.lopDays),
      });
      onSaved();
    } catch (e) { setErr(e.message || 'Could not generate payroll'); }
    finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title="Generate payroll"
      footer={<><button className="btn-outline" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={busy || !form.employeeId} onClick={save}>{busy ? 'Generating…' : 'Generate'}</button></>}>
      {err && <div className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{err}</div>}
      <div className="grid gap-4">
        <div>
          <label className="label">Employee</label>
          <select className="input" value={form.employeeId} onChange={set('employeeId')}>
            <option value="">— select —</option>
            {employees.map((e) => <option key={e._id} value={e._id}>{e.firstName} {e.lastName} ({e.employeeId})</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="label">Month</label>
            <select className="input" value={form.month} onChange={set('month')}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
          </div>
          <div><label className="label">Year</label><input className="input" type="number" value={form.year} onChange={set('year')} /></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="label">Bonus</label><input className="input" type="number" value={form.bonus} onChange={set('bonus')} /></div>
          <div><label className="label">Loss-of-pay days</label><input className="input" type="number" value={form.lopDays} onChange={set('lopDays')} /></div>
        </div>
        <p className="text-xs text-slate-400">Tax is computed from the employee&apos;s salary-structure slabs. Set a structure first if none exists.</p>
      </div>
    </Modal>
  );
}

function StructureEditor({ onClose }) {
  const { user } = useAuth();
  const employees = useEmployees();
  const [employeeId, setEmployeeId] = useState('');
  const [form, setForm] = useState({ basic: 0, currency: 'USD', allowances: [], deductions: [], taxSlabs: [], taxRegime: 'CUSTOM', epfEnabled: false, esiEnabled: false });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!employeeId) return;
    payApi.getStructure(employeeId).then((s) => {
      if (s) setForm({ basic: s.basic, currency: s.currency || 'USD', allowances: s.allowances || [], deductions: s.deductions || [], taxSlabs: s.taxSlabs || [], taxRegime: s.taxRegime || 'CUSTOM', epfEnabled: !!s.epfEnabled, esiEnabled: !!s.esiEnabled });
      else setForm({ basic: 0, currency: 'USD', allowances: [], deductions: [], taxSlabs: [], taxRegime: 'CUSTOM', epfEnabled: false, esiEnabled: false });
    }).catch(() => {});
  }, [employeeId]);

  const addRow = (key, row) => setForm((f) => ({ ...f, [key]: [...f[key], row] }));
  const setRow = (key, i, patch) => setForm((f) => ({ ...f, [key]: f[key].map((r, idx) => idx === i ? { ...r, ...patch } : r) }));
  const delRow = (key, i) => setForm((f) => ({ ...f, [key]: f[key].filter((_, idx) => idx !== i) }));

  const save = async () => {
    setBusy(true); setMsg('');
    try {
      await payApi.saveStructure(user.company, employeeId, {
        basic: Number(form.basic), currency: form.currency,
        allowances: form.allowances.map((a) => ({ label: a.label, amount: Number(a.amount) })),
        deductions: form.deductions.map((d) => ({ label: d.label, amount: Number(d.amount) })),
        taxSlabs: form.taxSlabs.map((t) => ({ upTo: Number(t.upTo), rate: Number(t.rate) })),
        taxRegime: form.taxRegime, epfEnabled: form.epfEnabled, esiEnabled: form.esiEnabled,
      });
      setMsg('Saved.');
    } catch (e) { setMsg(e.message || 'Could not save'); }
    finally { setBusy(false); }
  };

  const Section = ({ title, k, fields }) => (
    <div>
      <div className="mb-2 flex items-center justify-between"><span className="text-sm font-medium">{title}</span>
        <button className="btn-ghost px-2 py-1 text-xs" onClick={() => addRow(k, fields.reduce((o, f) => ({ ...o, [f]: '' }), {}))}>+ Add</button></div>
      <div className="space-y-2">
        {form[k].map((row, i) => (
          <div key={i} className="flex gap-2">
            <input className="input" placeholder="Label" value={row.label || ''} onChange={(e) => setRow(k, i, { label: e.target.value })} />
            <input className="input w-32" type="number" placeholder={k === 'taxSlabs' ? 'rate %' : 'amount'} value={row.amount ?? row.rate ?? ''} onChange={(e) => setRow(k, i, k === 'taxSlabs' ? { rate: e.target.value } : { amount: e.target.value })} />
            {k === 'taxSlabs' && <input className="input w-32" type="number" placeholder="up to" value={row.upTo ?? ''} onChange={(e) => setRow(k, i, { upTo: e.target.value })} />}
            <button className="btn-ghost px-2 text-rose-500" onClick={() => delRow(k, i)}>×</button>
          </div>
        ))}
        {form[k].length === 0 && <p className="text-xs text-slate-400">None.</p>}
      </div>
    </div>
  );

  return (
    <Modal open onClose={onClose} title="Salary structure" width="max-w-2xl"
      footer={<><button className="btn-outline" onClick={onClose}>Close</button><button className="btn-primary" disabled={busy || !employeeId} onClick={save}>{busy ? 'Saving…' : 'Save structure'}</button></>}>
      <div className="space-y-5">
        <div>
          <label className="label">Employee</label>
          <select className="input" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">— select —</option>
            {employees.map((e) => <option key={e._id} value={e._id}>{e.firstName} {e.lastName} ({e.employeeId})</option>)}
          </select>
        </div>
        {employeeId && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="label">Basic salary</label><input className="input" type="number" value={form.basic} onChange={(e) => setForm((f) => ({ ...f, basic: e.target.value }))} /></div>
              <div><label className="label">Currency</label><select className="input" value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}>{['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD'].map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
            </div>
            <Section title="Allowances" k="allowances" fields={['label', 'amount']} />
            <Section title="Deductions" k="deductions" fields={['label', 'amount']} />
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <p className="mb-2 text-sm font-medium">Statutory deductions (auto-calculated)</p>
              <label className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" checked={form.epfEnabled} onChange={(e) => setForm((f) => ({ ...f, epfEnabled: e.target.checked }))} /> EPF — 12% of basic (employee share)</label>
              <label className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" checked={form.esiEnabled} onChange={(e) => setForm((f) => ({ ...f, esiEnabled: e.target.checked }))} /> ESI — 0.75% of gross (only when gross ≤ ₹21,000)</label>
            </div>
            <div>
              <label className="label">Tax regime</label>
              <select className="input" value={form.taxRegime} onChange={(e) => setForm((f) => ({ ...f, taxRegime: e.target.value }))}>
                <option value="CUSTOM">Custom slabs</option>
                <option value="NEW_115BAC">New regime u/s 115BAC (2023 slabs)</option>
              </select>
              {form.taxRegime === 'NEW_115BAC' && <p className="mt-1 text-xs text-slate-400">Applies statutory annual slabs: 0% ≤3L, 5% 3–6L, 10% 6–9L, 15% 9–12L, 20% 12–15L, 30% &gt;15L. Custom slabs below are ignored.</p>}
            </div>
            {form.taxRegime === 'CUSTOM' && <Section title="Tax slabs (progressive, monthly)" k="taxSlabs" fields={['upTo', 'rate']} />}
            {msg && <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800">{msg}</div>}
          </>
        )}
      </div>
    </Modal>
  );
}

function PayRunsModal({ onClose, onChanged }) {
  const [runs, setRuns] = useState(null);
  const [busy, setBusy] = useState('');
  const load = async () => { try { setRuns(await payApi.payRuns()); } catch { setRuns([]); } };
  useEffect(() => { load(); }, []);
  const del = async (r, isLatest) => {
    if (!isLatest) { alert('Only the latest pay run can be deleted.'); return; }
    if (!confirm(`Delete pay run ${r.period}? This removes its generated payslips and restores any loan EMI deducted in it.`)) return;
    setBusy(r._id);
    try { await payApi.deletePayRun(r._id); await load(); onChanged(); }
    catch (e) { alert(e.message || 'Could not delete'); } finally { setBusy(''); }
  };
  return (
    <Modal open onClose={onClose} title="Pay runs"
      footer={<button className="btn-outline" onClick={onClose}>Close</button>}>
      {runs === null ? <div className="py-8 text-center text-sm text-slate-400">Loading…</div>
        : !runs.length ? <div className="py-8 text-center text-sm text-slate-400">No pay runs yet. Use “Run for all” to create one.</div>
        : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-slate-400">
                {['Period', 'Run date', 'Employees', 'Total', 'Status', ''].map((h, i) => <th key={i} className="px-3 py-2 font-medium">{h}</th>)}
              </tr></thead>
              <tbody>
                {runs.map((r, i) => (
                  <tr key={r._id} className="border-b last:border-0">
                    <td className="px-3 py-2 font-medium">{r.period}</td>
                    <td className="px-3 py-2 text-slate-500">{r.runDate}</td>
                    <td className="px-3 py-2">{r.count}</td>
                    <td className="px-3 py-2">{money(r.total, 'INR')}</td>
                    <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
                    <td className="px-3 py-2 text-right">
                      <button className="btn-ghost p-1.5 text-rose-500 disabled:opacity-40" title={i === 0 ? 'Delete latest pay run' : 'Only the latest run can be deleted'} disabled={i !== 0 || busy === r._id} onClick={() => del(r, i === 0)}><Undo2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-slate-400">Deleting the latest run removes its generated payslips and adds back any loan EMI it had deducted. To revert a single paid payslip, use the “Mark unpaid” action in the list.</p>
          </div>
        )}
    </Modal>
  );
}

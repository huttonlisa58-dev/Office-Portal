'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Plus, Search, List, Network, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import PageBanner from '@/components/PageBanner';
import Loader from '@/components/Loader';
import Modal from '@/components/Modal';
import EditEmployeeModal from '@/components/EditEmployeeModal';
import { useAuth } from '@/context/AuthContext';
import { initials, cls } from '@/lib/format';
import { employees as empApi, org } from '@/lib/db';

const AVA = ['bg-orange-500', 'bg-sky-500', 'bg-violet-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500'];
const col = (s = '') => AVA[(s.charCodeAt(0) || 0) % AVA.length];
const ROLE_LABEL = { SUPER_ADMIN: 'Super admin', COMPANY_ADMIN: 'Company admin', HR: 'HR', MANAGER: 'Manager', EMPLOYEE: 'Employee' };

const GENDERS = ['Male', 'Female', 'Other'];
const BLOODS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const MARITALS = ['Single', 'Married', 'Divorced', 'Widowed'];
const EMP_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'PERMANENT'];
const STATUSES = ['ACTIVE', 'INACTIVE', 'TERMINATED'];
const SectionLabel = ({ children }) => <div className="border-t pt-3 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:border-slate-700">{children}</div>;
const Fld = ({ label, req, children }) => <div><label className="label">{label}{req && <span className="text-rose-400"> *</span>}</label>{children}</div>;

export default function EmployeesPage() {
  const { user } = useAuth();
  const canManage = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR'].includes(user?.role);
  const [mode, setMode] = useState('list');

  return (
    <>
      <PageBanner icon={Users} title={mode === 'org' ? 'Employees Org Chart' : 'Employees'}>
        <div className="flex items-center gap-1 rounded-xl bg-white/15 p-1">
          <button onClick={() => setMode('list')} className={cls('rounded-lg p-1.5', mode === 'list' ? 'bg-white text-sky-600' : 'text-white')}><List size={16} /></button>
          <button onClick={() => setMode('org')} className={cls('rounded-lg p-1.5', mode === 'org' ? 'bg-white text-sky-600' : 'text-white')}><Network size={16} /></button>
        </div>
      </PageBanner>
      {mode === 'org' ? <OrgChart /> : <EmployeeList canManage={canManage} user={user} />}
    </>
  );
}

function EmployeeList({ canManage, user }) {
  const router = useRouter();
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await empApi.list({ q, page, limit: 10 })); } catch { /* ignore */ } finally { setLoading(false); }
  }, [q, page]);
  useEffect(() => { const t = setTimeout(load, q ? 300 : 0); return () => clearTimeout(t); }, [load, q]);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="relative max-w-md flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Search by name, ID, band or division" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
        {canManage && <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> Add employee</button>}
      </div>

      <div className="card overflow-hidden">
        {loading ? <Loader /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-slate-400">
                {['Employee ID', 'First name, Last name', 'Location', 'Job title', 'Department', 'Role', 'Employment type', 'Employee status'].map((h) => <th key={h} className="px-5 py-3 font-medium">{h}</th>)}
                {canManage && <th className="px-5 py-3 font-medium">Actions</th>}
              </tr></thead>
              <tbody>
                {data.items.length === 0 && <tr><td colSpan={canManage ? 9 : 8} className="px-5 py-10 text-center text-slate-400">No employees found.</td></tr>}
                {data.items.map((e) => (
                  <tr key={e._id} onClick={() => router.push(`/employees/${e._id}`)} className="cursor-pointer border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3 text-slate-500">{e.employeeId}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className={cls('grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold text-white', col(e.firstName))}>{initials(`${e.firstName} ${e.lastName || ''}`)}</div>
                        <span className="font-medium">{e.firstName} {e.lastName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{e.location || '—'}</td>
                    <td className="px-5 py-3 text-slate-500">{e.designation?.title || '—'}</td>
                    <td className="px-5 py-3 text-slate-500">{e.department?.name || '—'}</td>
                    <td className="px-5 py-3 text-slate-500">{ROLE_LABEL[e.role] || 'Employee'}</td>
                    <td className="px-5 py-3 text-slate-500">{e.employmentType || 'Permanent'}</td>
                    <td className="px-5 py-3"><span className="badge bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">{e.status === 'ACTIVE' ? 'Active' : e.status}</span></td>
                    {canManage && <td className="px-5 py-3"><button className="btn-ghost p-1.5" onClick={(ev) => { ev.stopPropagation(); setEditing(e); }} title="Edit employee"><Pencil size={15} /></button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-end gap-3 border-t px-5 py-3 text-sm text-slate-500">
          <span>{data.total === 0 ? 0 : (data.page - 1) * 10 + 1} - {Math.min(data.page * 10, data.total)} of {data.total}</span>
          <button className="btn-ghost p-1.5 disabled:opacity-40" disabled={data.page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={16} /></button>
          <button className="btn-ghost p-1.5 disabled:opacity-40" disabled={data.page >= data.pages} onClick={() => setPage((p) => p + 1)}><ChevronRight size={16} /></button>
        </div>
      </div>

      <AddEmployee open={open} onClose={() => setOpen(false)} user={user} onDone={load} />
      <EditEmployeeModal emp={editing} onClose={() => setEditing(null)} onDone={load} />
    </>
  );
}

const ORG_CSS = `
.org-tree ul { position: relative; padding: 24px 0 0 0; margin: 0; display: flex; justify-content: center; }
.org-tree li { list-style: none; position: relative; padding: 24px 12px 0 12px; text-align: center; }
.org-tree li::before, .org-tree li::after { content: ''; position: absolute; top: 0; right: 50%; border-top: 1px solid #cbd5e1; width: 50%; height: 24px; }
.org-tree li::after { right: auto; left: 50%; border-left: 1px solid #cbd5e1; }
.org-tree li:only-child::before, .org-tree li:only-child::after { display: none; }
.org-tree li:first-child::before, .org-tree li:last-child::after { border: 0 none; }
.org-tree li:last-child::before { border-right: 1px solid #cbd5e1; border-radius: 0 6px 0 0; }
.org-tree li:first-child::after { border-radius: 6px 0 0 0; }
.org-tree ul ul::before { content: ''; position: absolute; top: 0; left: 50%; border-left: 1px solid #cbd5e1; width: 0; height: 24px; }
.org-tree > ul { padding-top: 0; }
.org-tree > ul > li { padding-top: 0; }
.org-tree > ul > li::before, .org-tree > ul > li::after { display: none; }
.org-tree .node { display: inline-block; vertical-align: top; }
`;

function OrgCard({ e }) {
  return (
    <div className="inline-flex w-40 flex-col items-center rounded-xl border bg-white p-2.5 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className={cls('grid h-10 w-10 place-items-center rounded-full text-xs font-semibold text-white', col(e.firstName))}>{initials(`${e.firstName} ${e.lastName || ''}`)}</div>
      <div className="mt-1.5 w-full truncate text-xs font-semibold" title={`${e.firstName} ${e.lastName || ''}`}>{e.firstName} {e.lastName}</div>
      <div className="w-full truncate text-[10px] text-slate-400" title={e.designation?.title || ''}>{e.designation?.title || 'Employee'}</div>
      {e.department?.name && <div className="w-full truncate text-[10px] text-slate-300 dark:text-slate-500">{e.department.name}</div>}
    </div>
  );
}

function OrgNode({ e, childrenMap, seen }) {
  if (seen.has(e._id)) return null;
  const next = new Set(seen); next.add(e._id);
  const kids = childrenMap[e._id] || [];
  return (
    <li>
      <div className="node"><OrgCard e={e} /></div>
      {kids.length > 0 && <ul>{kids.map((k) => <OrgNode key={k._id} e={k} childrenMap={childrenMap} seen={next} />)}</ul>}
    </li>
  );
}

function OrgChart() {
  const { company } = useAuth();
  const [emps, setEmps] = useState(null);
  useEffect(() => { empApi.orgData().then(setEmps).catch(() => setEmps([])); }, []);
  if (!emps) return <Loader />;
  if (emps.length === 0) return <div className="card p-10 text-center text-slate-400">No active employees to chart.</div>;

  const ids = new Set(emps.map((e) => e._id));
  const childrenMap = {};
  emps.forEach((e) => {
    const hasMgr = e.managerId && e.managerId !== e._id && ids.has(e.managerId);
    const key = hasMgr ? e.managerId : '__root__';
    (childrenMap[key] = childrenMap[key] || []).push(e);
  });
  const roots = childrenMap.__root__ || [];

  return (
    <div className="card overflow-x-auto p-8">
      <style>{ORG_CSS}</style>
      <div className="org-tree min-w-max">
        <ul>
          <li>
            <div className="node">
              <div className="inline-flex w-44 flex-col items-center rounded-xl border-2 border-sky-300 bg-sky-50 p-2.5 text-center text-sky-700 shadow-sm dark:bg-sky-950/40 dark:text-sky-300">
                <div className="text-sm font-semibold leading-tight">{company?.name || 'Company'}</div>
                <div className="text-[10px] text-sky-500">{emps.length} employees</div>
              </div>
            </div>
            <ul>{roots.map((r) => <OrgNode key={r._id} e={r} childrenMap={childrenMap} seen={new Set()} />)}</ul>
          </li>
        </ul>
      </div>
    </div>
  );
}

function CredRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-slate-400">{label}</span>
      <span className="flex items-center gap-2 font-medium">
        <code className="rounded bg-white px-2 py-0.5 dark:bg-slate-900">{value}</code>
        <button className="text-sky-500 hover:text-sky-600" onClick={() => { try { navigator.clipboard?.writeText(value); } catch { /* ignore */ } }} title="Copy">copy</button>
      </span>
    </div>
  );
}

function AddEmployee({ open, onClose, user, onDone }) {
  const empty = {
    firstName: '', middleName: '', lastName: '', nickName: '', email: '', password: '',
    phone: '', gender: '', dob: '', bloodGroup: '', maritalStatus: '', smoker: 'No', address: '',
    employmentType: 'FULL_TIME', status: 'ACTIVE', dateOfJoining: '',
  };
  const [form, setForm] = useState(empty);
  const [depts, setDepts] = useState([]); const [desigs, setDesigs] = useState([]); const [mgrs, setMgrs] = useState([]);
  const [deptId, setDeptId] = useState(''); const [desigId, setDesigId] = useState(''); const [managerId, setManagerId] = useState('');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  useEffect(() => {
    if (open) {
      org.departments().then(setDepts); org.designations().then(setDesigs); empApi.all().then(setMgrs).catch(() => {});
      setCreated(null); setErr('');
    }
  }, [open]);

  const submit = async () => {
    setErr(''); setBusy(true);
    try {
      const res = await empApi.create({
        first_name: form.firstName, middle_name: form.middleName || null, last_name: form.lastName, nick_name: form.nickName || null,
        email: form.email, password: form.password || undefined,
        phone: form.phone || null, gender: form.gender || null, dob: form.dob || null,
        blood_group: form.bloodGroup || null, marital_status: form.maritalStatus || null, smoker: form.smoker === 'Yes',
        address: form.address || null, date_of_joining: form.dateOfJoining || null,
        department_id: deptId || null, designation_id: desigId || null, manager_id: managerId || null,
        employment_type: form.employmentType, status: form.status,
      });
      setCreated({ code: res.employee?.employee_code, login: res.login, warning: res.warning });
      setForm(empty); setDeptId(''); setDesigId(''); setManagerId('');
      onDone();
    } catch (e) { setErr(e.message || 'Could not create'); } finally { setBusy(false); }
  };
  const close = () => { setCreated(null); onClose(); };

  return (
    <Modal open={open} onClose={close} title={created ? 'Employee created' : 'Add employee'} width="max-w-2xl">
      {created ? (
        <div className="space-y-4">
          <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">✓ Employee <b>{created.code}</b> added.</div>
          {created.login ? (
            <div className="space-y-2">
              <p className="text-sm text-slate-500">Share these login details with the employee:</p>
              <div className="rounded-xl border bg-slate-50 p-4 text-sm dark:bg-slate-800/50">
                <CredRow label="Login ID" value={created.login.id} />
                <CredRow label="Password" value={created.login.password} />
              </div>
              {created.login.note && <p className="text-xs text-amber-600">{created.login.note}</p>}
            </div>
          ) : <p className="text-sm text-amber-600">{created.warning || 'No login created — add an email to generate one.'}</p>}
          <div className="flex justify-end"><button className="btn-primary" onClick={close}>Done</button></div>
        </div>
      ) : (
        <div className="space-y-3">
          {err && <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div>}

          <SectionLabel>Basic details</SectionLabel>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Fld label="First name" req><input className="input" value={form.firstName} onChange={set('firstName')} /></Fld>
            <Fld label="Middle name"><input className="input" value={form.middleName} onChange={set('middleName')} /></Fld>
            <Fld label="Last name"><input className="input" value={form.lastName} onChange={set('lastName')} /></Fld>
            <Fld label="Nick name"><input className="input" value={form.nickName} onChange={set('nickName')} /></Fld>
          </div>
          <Fld label="Email (login ID)"><input className="input" type="email" value={form.email} onChange={set('email')} placeholder="employee@company.com" /></Fld>
          <Fld label="Temporary password"><input className="input" value={form.password} onChange={set('password')} placeholder="Defaults to Welcome@123" /><p className="mt-1 text-xs text-slate-400">A login is created automatically from the email. The employee can change it after their first login.</p></Fld>

          <SectionLabel>Personal</SectionLabel>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Fld label="Gender"><select className="input" value={form.gender} onChange={set('gender')}><option value="">—</option>{GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}</select></Fld>
            <Fld label="Date of birth"><input className="input" type="date" value={form.dob} onChange={set('dob')} /></Fld>
            <Fld label="Blood group"><select className="input" value={form.bloodGroup} onChange={set('bloodGroup')}><option value="">—</option>{BLOODS.map((b) => <option key={b} value={b}>{b}</option>)}</select></Fld>
            <Fld label="Marital status"><select className="input" value={form.maritalStatus} onChange={set('maritalStatus')}><option value="">—</option>{MARITALS.map((m) => <option key={m} value={m}>{m}</option>)}</select></Fld>
            <Fld label="Smoker"><select className="input" value={form.smoker} onChange={set('smoker')}><option>No</option><option>Yes</option></select></Fld>
            <Fld label="Phone"><input className="input" value={form.phone} onChange={set('phone')} placeholder="+91…" /></Fld>
          </div>
          <Fld label="Address"><textarea className="input" rows={2} value={form.address} onChange={set('address')} /></Fld>

          <SectionLabel>Work</SectionLabel>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Fld label="Department"><select className="input" value={deptId} onChange={(e) => setDeptId(e.target.value)}><option value="">—</option>{depts.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}</select></Fld>
            <Fld label="Designation"><select className="input" value={desigId} onChange={(e) => setDesigId(e.target.value)}><option value="">—</option>{desigs.map((d) => <option key={d._id} value={d._id}>{d.title}</option>)}</select></Fld>
            <Fld label="Reporting manager"><select className="input" value={managerId} onChange={(e) => setManagerId(e.target.value)}><option value="">—</option>{mgrs.map((m) => <option key={m._id} value={m._id}>{m.firstName} {m.lastName} ({m.employeeId})</option>)}</select></Fld>
            <Fld label="Date of joining"><input className="input" type="date" value={form.dateOfJoining} onChange={set('dateOfJoining')} /></Fld>
            <Fld label="Employment type"><select className="input" value={form.employmentType} onChange={set('employmentType')}>{EMP_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}</select></Fld>
            <Fld label="Employee status"><select className="input" value={form.status} onChange={set('status')}>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></Fld>
          </div>

          <div className="flex justify-end gap-2 border-t pt-3 dark:border-slate-700">
            <button className="btn-outline" onClick={close}>Cancel</button>
            <button className="btn-primary" disabled={busy || !form.firstName} onClick={submit}>{busy ? 'Creating…' : 'Create'}</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

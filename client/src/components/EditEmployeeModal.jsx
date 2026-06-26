'use client';
import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import Loader from '@/components/Loader';
import { employees as empApi, org, shifts as shiftApi } from '@/lib/db';

const GENDERS = ['Male', 'Female', 'Other'];
const WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const BLOODS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const MARITALS = ['Single', 'Married', 'Divorced', 'Widowed'];
const EMP_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'PERMANENT'];
const STATUSES = ['ACTIVE', 'INACTIVE', 'TERMINATED'];

const SectionLabel = ({ children }) => <div className="border-t pt-3 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:border-slate-700">{children}</div>;
const Fld = ({ label, req, children }) => <div><label className="label">{label}{req && <span className="text-rose-400"> *</span>}</label>{children}</div>;

export default function EditEmployeeModal({ emp, onClose, onDone }) {
  const open = !!emp;
  const [form, setForm] = useState({});
  const [depts, setDepts] = useState([]); const [desigs, setDesigs] = useState([]); const [mgrs, setMgrs] = useState([]); const [shiftOpts, setShiftOpts] = useState([]);
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    if (!emp) return;
    setErr(''); setLoading(true);
    org.departments().then(setDepts); org.designations().then(setDesigs); empApi.all().then(setMgrs).catch(() => {}); shiftApi.list().then(setShiftOpts).catch(() => {});
    empApi.getOne(emp._id).then((d) => {
      const e = d || emp;
      setForm({
        firstName: e.firstName || '', middleName: e.middleName || '', lastName: e.lastName || '', nickName: e.nickName || '',
        email: e.email || '', newPassword: '',
        phone: e.phone || '', gender: e.gender || '', dob: e.dob || '', bloodGroup: e.bloodGroup || '',
        maritalStatus: e.maritalStatus || '', smoker: e.smoker ? 'Yes' : 'No', address: e.address || '',
        employmentType: e.employmentType || 'FULL_TIME', status: e.status || 'ACTIVE',
        dateOfJoining: e.dateOfJoining || '', deptId: e.departmentId || '', desigId: e.designationId || '', managerId: '',
        shiftId: e.shiftId || '', weeklyOff: e.weeklyOff ?? '',
        pan: e.pan || '', uan: e.uan || '', pfNumber: e.pfNumber || '', esiNumber: e.esiNumber || '',
        accessUntil: e.accessUntil || '',
        bankAccountName: e.bankAccountName || '', bankAccountNumber: e.bankAccountNumber || '', bankIfsc: e.bankIfsc || '', bankName: e.bankName || '',
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, [emp]);

  const save = async () => {
    setErr(''); setBusy(true);
    try {
      await empApi.update(emp._id, {
        first_name: form.firstName, middle_name: form.middleName || null, last_name: form.lastName, nick_name: form.nickName || null,
        phone: form.phone || null, gender: form.gender || null, dob: form.dob || null,
        blood_group: form.bloodGroup || null, marital_status: form.maritalStatus || null, smoker: form.smoker === 'Yes',
        address: form.address || null, date_of_joining: form.dateOfJoining || null,
        employment_type: form.employmentType, status: form.status,
        department_id: form.deptId || null, designation_id: form.desigId || null,
        shift_id: form.shiftId || null, weekly_off: form.weeklyOff === '' ? null : Number(form.weeklyOff),
        pan: form.pan || null, uan: form.uan || null, pf_number: form.pfNumber || null, esi_number: form.esiNumber || null,
        access_until: form.accessUntil || null,
        bank_account_name: form.bankAccountName || null, bank_account_number: form.bankAccountNumber || null, bank_ifsc: form.bankIfsc || null, bank_name: form.bankName || null,
        ...(form.managerId ? { manager_id: form.managerId } : {}),
      });

      // Email / password go through the auth-aware edge function so the login stays in sync.
      const newEmail = (form.email || '').trim();
      const emailChanged = newEmail && newEmail.toLowerCase() !== (emp.email || '').trim().toLowerCase();
      if (emailChanged || form.newPassword) {
        await empApi.updateLogin({
          employee_id: emp._id,
          ...(emailChanged ? { email: newEmail } : {}),
          ...(form.newPassword ? { password: form.newPassword } : {}),
        });
      }
      onClose(); onDone();
    } catch (e) { setErr(e.message || 'Could not save'); } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Edit ${emp?.firstName || 'employee'}`} width="max-w-2xl">
      {loading ? <Loader /> : (
      <div className="space-y-3">
        {err && <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div>}

        <SectionLabel>Basic details</SectionLabel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Fld label="First name" req><input className="input" value={form.firstName || ''} onChange={set('firstName')} /></Fld>
          <Fld label="Middle name"><input className="input" value={form.middleName || ''} onChange={set('middleName')} /></Fld>
          <Fld label="Last name"><input className="input" value={form.lastName || ''} onChange={set('lastName')} /></Fld>
          <Fld label="Nick name"><input className="input" value={form.nickName || ''} onChange={set('nickName')} /></Fld>
          <Fld label="Phone"><input className="input" value={form.phone || ''} onChange={set('phone')} placeholder="+91…" /></Fld>
        </div>

        <SectionLabel>Login &amp; access</SectionLabel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Fld label="Email (login ID)"><input className="input" type="email" value={form.email || ''} onChange={set('email')} placeholder="employee@company.com" /></Fld>
          <Fld label="New password"><input className="input" type="text" value={form.newPassword || ''} onChange={set('newPassword')} placeholder="Leave blank to keep current" /></Fld>
        </div>
        <p className="text-xs text-slate-400">Changing the email updates the login ID. Set a new password to reset the login. Leave blank to keep the current one.</p>

        <SectionLabel>Personal</SectionLabel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Fld label="Gender"><select className="input" value={form.gender || ''} onChange={set('gender')}><option value="">—</option>{GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}</select></Fld>
          <Fld label="Date of birth"><input className="input" type="date" value={form.dob || ''} onChange={set('dob')} /></Fld>
          <Fld label="Blood group"><select className="input" value={form.bloodGroup || ''} onChange={set('bloodGroup')}><option value="">—</option>{BLOODS.map((b) => <option key={b} value={b}>{b}</option>)}</select></Fld>
          <Fld label="Marital status"><select className="input" value={form.maritalStatus || ''} onChange={set('maritalStatus')}><option value="">—</option>{MARITALS.map((m) => <option key={m} value={m}>{m}</option>)}</select></Fld>
          <Fld label="Smoker"><select className="input" value={form.smoker || 'No'} onChange={set('smoker')}><option>No</option><option>Yes</option></select></Fld>
        </div>
        <Fld label="Address"><textarea className="input" rows={2} value={form.address || ''} onChange={set('address')} /></Fld>

        <SectionLabel>Work</SectionLabel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Fld label="Department"><select className="input" value={form.deptId || ''} onChange={set('deptId')}><option value="">—</option>{depts.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}</select></Fld>
          <Fld label="Designation"><select className="input" value={form.desigId || ''} onChange={set('desigId')}><option value="">—</option>{desigs.map((d) => <option key={d._id} value={d._id}>{d.title}</option>)}</select></Fld>
          <Fld label="Reporting manager"><select className="input" value={form.managerId || ''} onChange={set('managerId')}><option value="">— keep current —</option>{mgrs.filter((m) => m._id !== emp?._id).map((m) => <option key={m._id} value={m._id}>{m.firstName} {m.lastName} ({m.employeeId})</option>)}</select></Fld>
          <Fld label="Date of joining"><input className="input" type="date" value={form.dateOfJoining || ''} onChange={set('dateOfJoining')} /></Fld>
          <Fld label="Employment type"><select className="input" value={form.employmentType || 'FULL_TIME'} onChange={set('employmentType')}>{EMP_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}</select></Fld>
          <Fld label="Employee status"><select className="input" value={form.status || 'ACTIVE'} onChange={set('status')}>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></Fld>
          <Fld label="Shift"><select className="input" value={form.shiftId || ''} onChange={set('shiftId')}><option value="">— none —</option>{shiftOpts.map((s) => <option key={s._id} value={s._id}>{s.name}{s.start ? ` (${String(s.start).slice(0, 5)}–${String(s.end).slice(0, 5)})` : ''}</option>)}</select></Fld>
          <Fld label="Weekly off"><select className="input" value={form.weeklyOff === '' ? '' : String(form.weeklyOff)} onChange={set('weeklyOff')}><option value="">— none —</option>{WEEK.map((w, i) => <option key={w} value={i}>{w}</option>)}</select></Fld>
          <Fld label="Portal access until"><input type="date" className="input" value={form.accessUntil || ''} onChange={set('accessUntil')} /></Fld>
        </div>

        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Statutory &amp; bank details</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Fld label="PAN"><input className="input" value={form.pan || ''} onChange={set('pan')} placeholder="ABCDE1234F" /></Fld>
          <Fld label="UAN (PF)"><input className="input" value={form.uan || ''} onChange={set('uan')} /></Fld>
          <Fld label="PF number"><input className="input" value={form.pfNumber || ''} onChange={set('pfNumber')} /></Fld>
          <Fld label="ESI number"><input className="input" value={form.esiNumber || ''} onChange={set('esiNumber')} /></Fld>
          <Fld label="Bank account holder"><input className="input" value={form.bankAccountName || ''} onChange={set('bankAccountName')} /></Fld>
          <Fld label="Bank account number"><input className="input" value={form.bankAccountNumber || ''} onChange={set('bankAccountNumber')} /></Fld>
          <Fld label="IFSC"><input className="input" value={form.bankIfsc || ''} onChange={set('bankIfsc')} /></Fld>
          <Fld label="Bank name"><input className="input" value={form.bankName || ''} onChange={set('bankName')} /></Fld>
        </div>

        <div className="flex justify-end gap-2 border-t pt-3 dark:border-slate-700">
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={busy || !form.firstName} onClick={save}>{busy ? 'Saving…' : 'Save changes'}</button>
        </div>
      </div>
      )}
    </Modal>
  );
}

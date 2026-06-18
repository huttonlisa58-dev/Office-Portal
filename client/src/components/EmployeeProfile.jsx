'use client';
import {
  IdCard, Briefcase, GraduationCap, History, Contact, Users, Plane, Share2,
  Car, FolderClosed, Landmark, FileText, Wallet, Receipt, Calculator, Pencil,
} from 'lucide-react';
import { initials } from '@/lib/format';

const SKIP = new Set(['id', 'employee_id', 'company_id', 'created_at', 'updated_at']);
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v);
const fmtDate = (d) => { try { return new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'long', year: 'numeric' }); } catch { return d; } };
const humanize = (k) => k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const has = (v) => v !== null && v !== undefined && v !== '' && v !== '—';

function fmtVal(v) {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (isDate(v)) return fmtDate(v);
  if (typeof v === 'object') { try { return JSON.stringify(v); } catch { return String(v); } }
  return String(v);
}

// Tenure since date of joining, e.g. "17 day(s)", "5 month(s)", "2 yr 3 mo".
function tenure(doj) {
  if (!doj) return '';
  const days = Math.floor((Date.now() - new Date(doj).getTime()) / 86400000);
  if (days < 0) return '';
  if (days < 31) return `${days} day(s)`;
  const months = Math.floor(days / 30.44);
  if (months < 12) return `${months} month(s)`;
  const years = Math.floor(months / 12); const rem = months % 12;
  return rem ? `${years} yr ${rem} mo` : `${years} year(s)`;
}

function Field({ label, value, required }) {
  return (
    <div className="rounded-xl border px-3.5 py-2.5 dark:border-slate-700">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}{required && <span className="text-rose-400"> *</span>}</div>
      <div className="mt-0.5 break-words text-sm font-medium text-slate-800 dark:text-slate-100">{has(value) ? value : '—'}</div>
    </div>
  );
}

function FieldGrid({ fields, compact }) {
  const rows = compact ? fields.filter((f) => has(f.value)) : fields;
  if (rows.length === 0) return <p className="text-sm text-slate-400">No details on record.</p>;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {rows.map((f) => f.full
        ? <div key={f.label} className="sm:col-span-2"><Field label={f.label} value={f.value} required={f.required} /></div>
        : <Field key={f.label} label={f.label} value={f.value} required={f.required} />)}
    </div>
  );
}

function ObjectGrid({ obj }) {
  const keys = Object.keys(obj || {}).filter((k) => !SKIP.has(k));
  if (keys.length === 0) return <p className="text-sm text-slate-400">No details on record.</p>;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {keys.map((k) => <Field key={k} label={humanize(k)} value={fmtVal(obj[k])} />)}
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b px-5 py-3 text-sm font-semibold dark:border-slate-700">
        <Icon size={16} className="text-sky-500" /> {title}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

function ListSection({ icon, title, rows }) {
  const list = Array.isArray(rows) ? rows : [];
  return (
    <Section icon={icon} title={title}>
      {list.length === 0 ? <p className="text-sm text-slate-400">No {title.toLowerCase()} on record.</p> : (
        <div className="space-y-3">
          {list.map((row, i) => <div key={i} className="rounded-xl border p-3 dark:border-slate-700"><ObjectGrid obj={row} /></div>)}
        </div>
      )}
    </Section>
  );
}

const LIST_SECTIONS = [
  { key: 'education', title: 'Education', icon: GraduationCap },
  { key: 'experience', title: 'Experience', icon: History },
  { key: 'emergency_contacts', title: 'Emergency contacts', icon: Contact },
  { key: 'dependents', title: 'Dependents', icon: Users },
  { key: 'visa_details', title: 'Visa details', icon: Plane },
  { key: 'social_media', title: 'Social media', icon: Share2 },
  { key: 'vehicle_details', title: 'Vehicle details', icon: Car },
  { key: 'documents', title: 'Documents', icon: FolderClosed },
];
const SENSITIVE_LIST = [
  { key: 'bank_details', title: 'Bank details', icon: Landmark },
  { key: 'salary_revisions', title: 'Salary revisions', icon: Wallet },
  { key: 'loans', title: 'Loans', icon: Receipt },
  { key: 'income_tax', title: 'Income tax', icon: Calculator },
];
const SENSITIVE_OBJ = [
  { key: 'statutory', title: 'Statutory details', icon: FileText },
  { key: 'salary_structure', title: 'Salary structure', icon: Wallet },
];

export default function EmployeeProfile({ data, canEdit, onEdit, compact = false }) {
  const p = data?.primary || {};
  const w = data?.work || {};
  const name = `${p.first_name || ''} ${p.middle_name ? p.middle_name + ' ' : ''}${p.last_name || ''}`.trim() || 'Employee';

  const generalFields = [
    { label: 'Employee ID', value: p.employee_code, required: true },
    { label: 'First name', value: p.first_name },
    { label: 'Middle name', value: p.middle_name },
    { label: 'Last name', value: p.last_name },
    { label: 'Nick name', value: p.nick_name },
    { label: 'Gender', value: has(p.gender) ? fmtVal(p.gender) : '' },
    { label: 'Date of birth', value: p.dob ? fmtDate(p.dob) : '' },
    { label: 'Blood group', value: p.blood_group },
    { label: 'Marital status', value: p.marital_status },
    { label: 'Smoker', value: p.smoker == null ? '' : (p.smoker ? 'Yes' : 'No') },
    { label: 'Employee status', value: has(p.status) ? fmtVal(p.status) : '' },
    { label: 'Email', value: p.email },
    { label: 'Personal email', value: p.personal_email },
    { label: 'Phone', value: p.phone },
    { label: 'Home phone', value: p.home_phone },
    { label: 'City', value: p.city },
    { label: 'State', value: p.state },
    { label: 'Country', value: p.country },
    { label: 'Postal code', value: p.postal_code },
    { label: 'Timezone', value: p.timezone },
    { label: 'Address', value: p.address, full: true },
    { label: 'Communication address', value: p.communication_address, full: true },
  ];

  const workFields = [
    { label: 'Department', value: w.department },
    { label: 'Job title', value: w.designation },
    { label: 'Reporting manager', value: w.manager },
    { label: 'Date of joining', value: w.date_of_joining ? fmtDate(w.date_of_joining) : '' },
    { label: 'Work experience', value: tenure(w.date_of_joining) },
    { label: 'Employment type', value: has(w.employment_type) ? fmtVal(w.employment_type) : '' },
    { label: 'Location', value: w.work_location },
  ];

  return (
    <div className="space-y-4">
      <div className="card overflow-hidden p-0">
        <div className="relative flex items-center gap-4 bg-gradient-to-r from-sky-500 to-sky-600 px-4 py-5 sm:px-6">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-orange-500 text-2xl font-semibold text-white shadow">{initials(name)}</div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold text-white sm:text-2xl">{name}</h1>
            <p className="text-sm text-sky-100">{p.employee_code || ''}{w.designation ? ` · ${w.designation}` : ''}</p>
          </div>
          {canEdit && (
            <button onClick={onEdit} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-sky-700 shadow hover:bg-sky-50">
              <Pencil size={13} /> Edit
            </button>
          )}
        </div>
      </div>

      <Section icon={IdCard} title="General Information"><FieldGrid fields={generalFields} compact={compact} /></Section>
      <Section icon={Briefcase} title="Work"><FieldGrid fields={workFields} compact={compact} /></Section>

      {LIST_SECTIONS.filter((s) => Array.isArray(data?.[s.key])).map((s) => (
        <ListSection key={s.key} icon={s.icon} title={s.title} rows={data[s.key]} />
      ))}
      {SENSITIVE_OBJ.filter((s) => data?.[s.key]).map((s) => (
        <Section key={s.key} icon={s.icon} title={s.title}><ObjectGrid obj={data[s.key]} /></Section>
      ))}
      {SENSITIVE_LIST.filter((s) => data?.[s.key] != null).map((s) => (
        <ListSection key={s.key} icon={s.icon} title={s.title} rows={data[s.key]} />
      ))}
    </div>
  );
}

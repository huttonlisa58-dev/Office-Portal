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

function fmtVal(v) {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (isDate(v)) return fmtDate(v);
  if (typeof v === 'object') { try { return JSON.stringify(v); } catch { return String(v); } }
  return String(v);
}

function Field({ label, value, required }) {
  return (
    <div className="rounded-xl border px-3.5 py-2.5 dark:border-slate-700">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}{required && <span className="text-rose-400"> *</span>}</div>
      <div className="mt-0.5 break-words text-sm font-medium text-slate-800 dark:text-slate-100">{value || '—'}</div>
    </div>
  );
}

// Renders an arbitrary object's keys as a responsive field grid (skips system columns).
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

function EmptyRow({ label }) {
  return <p className="text-sm text-slate-400">No {label.toLowerCase()} on record.</p>;
}

// A list section: renders each row as its own bordered block of fields.
function ListSection({ icon, title, rows }) {
  const list = Array.isArray(rows) ? rows : [];
  return (
    <Section icon={icon} title={title}>
      {list.length === 0 ? <EmptyRow label={title} /> : (
        <div className="space-y-3">
          {list.map((row, i) => (
            <div key={i} className="rounded-xl border p-3 dark:border-slate-700">
              <ObjectGrid obj={row} />
            </div>
          ))}
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

// Sensitive sections are null when the viewer isn't authorized — only shown when present.
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

export default function EmployeeProfile({ data, canEdit, onEdit }) {
  const p = data?.primary || {};
  const w = data?.work || {};
  const name = `${p.first_name || ''} ${p.middle_name ? p.middle_name + ' ' : ''}${p.last_name || ''}`.trim() || 'Employee';

  return (
    <div className="space-y-4">
      {/* banner */}
      <div className="card overflow-hidden p-0">
        <div className="relative flex items-center gap-4 bg-gradient-to-r from-sky-500 to-sky-600 px-4 py-5 sm:px-6">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-orange-500 text-2xl font-semibold text-white shadow">{initials(name)}</div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold text-white sm:text-2xl">{name}</h1>
            <p className="text-sm text-sky-100">
              {p.employee_code ? p.employee_code : ''}{w.designation ? ` · ${w.designation}` : ''}
            </p>
          </div>
          {canEdit && (
            <button onClick={onEdit} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-sky-700 shadow hover:bg-sky-50">
              <Pencil size={13} /> Edit
            </button>
          )}
        </div>
      </div>

      {/* Primary information */}
      <Section icon={IdCard} title="Primary information">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Employee ID" value={p.employee_code} required />
          <Field label="First name" value={p.first_name} required />
          <Field label="Middle name" value={p.middle_name} />
          <Field label="Last name" value={p.last_name} />
          <Field label="Nick name" value={p.nick_name} />
          <Field label="Gender" value={fmtVal(p.gender)} />
          <Field label="Date of birth" value={p.dob ? fmtDate(p.dob) : '—'} />
          <Field label="Blood group" value={p.blood_group} />
          <Field label="Marital status" value={p.marital_status} />
          <Field label="Smoker" value={p.smoker == null ? '—' : (p.smoker ? 'Yes' : 'No')} />
          <Field label="Employee status" value={fmtVal(p.status)} />
          <Field label="Email" value={p.email} />
          <Field label="Personal email" value={p.personal_email} />
          <Field label="Phone" value={p.phone} />
          <Field label="Home phone" value={p.home_phone} />
          <Field label="City" value={p.city} />
          <Field label="State" value={p.state} />
          <Field label="Country" value={p.country} />
          <Field label="Postal code" value={p.postal_code} />
          <Field label="Timezone" value={p.timezone} />
          <div className="sm:col-span-2"><Field label="Address" value={p.address} /></div>
          <div className="sm:col-span-2"><Field label="Communication address" value={p.communication_address} /></div>
        </div>
      </Section>

      {/* Work information */}
      <Section icon={Briefcase} title="Work information">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Department" value={w.department} />
          <Field label="Job title" value={w.designation} />
          <Field label="Reporting manager" value={w.manager} />
          <Field label="Work location" value={w.work_location} />
          <Field label="Date of joining" value={w.date_of_joining ? fmtDate(w.date_of_joining) : '—'} />
          <Field label="Employment type" value={fmtVal(w.employment_type)} />
        </div>
      </Section>

      {/* List sections (always shown) */}
      {LIST_SECTIONS.map((s) => <ListSection key={s.key} icon={s.icon} title={s.title} rows={data?.[s.key]} />)}

      {/* Sensitive sections — only render when the viewer is authorized (non-null) */}
      {SENSITIVE_OBJ.filter((s) => data?.[s.key]).map((s) => (
        <Section key={s.key} icon={s.icon} title={s.title}><ObjectGrid obj={data[s.key]} /></Section>
      ))}
      {SENSITIVE_LIST.filter((s) => data?.[s.key] != null).map((s) => (
        <ListSection key={s.key} icon={s.icon} title={s.title} rows={data[s.key]} />
      ))}
    </div>
  );
}

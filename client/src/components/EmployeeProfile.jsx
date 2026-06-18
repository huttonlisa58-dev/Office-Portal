'use client';
import { Pencil } from 'lucide-react';
import { initials } from '@/lib/format';

const SKIP = new Set(['id', 'employee_id', 'company_id', 'created_at', 'updated_at']);
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v);
const fmtDate = (d) => { try { return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return d; } };
const humanize = (k) => k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const has = (v) => v !== null && v !== undefined && v !== '' && v !== '—';

function fmtVal(v) {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (isDate(v)) return fmtDate(v);
  if (typeof v === 'object') { try { return JSON.stringify(v); } catch { return String(v); } }
  return String(v);
}

// Work experience in the reference format, e.g. "4 year(s) 0 month(s) 24 day(s)".
function tenure(doj) {
  if (!doj) return '';
  const start = new Date(doj); const now = new Date();
  if (isNaN(start.getTime()) || start > now) return '';
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();
  if (days < 0) { months -= 1; days += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
  if (months < 0) { years -= 1; months += 12; }
  return `${years} year(s) ${months} month(s) ${days} day(s)`;
}

function Section({ title, children }) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="bg-sky-500 px-5 py-3 text-base font-semibold text-white">{title}</div>
      <div className="px-5 py-2 sm:px-6">{children}</div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="py-3">
      <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 break-words text-[15px] font-medium text-slate-800 dark:text-slate-100">{has(value) ? value : '—'}</div>
    </div>
  );
}

// Stacked label/value list (reference style); empty values are hidden.
function FieldList({ fields }) {
  const rows = fields.filter((f) => has(f.value));
  if (rows.length === 0) return <p className="py-3 text-sm text-slate-400">No details on record.</p>;
  return <div className="divide-y divide-slate-100 dark:divide-slate-700/60">{rows.map((f) => <Field key={f.label} label={f.label} value={f.value} />)}</div>;
}

function ObjectGrid({ obj }) {
  const keys = Object.keys(obj || {}).filter((k) => !SKIP.has(k) && has(obj[k]));
  if (keys.length === 0) return null;
  return <div className="divide-y divide-slate-100 dark:divide-slate-700/60">{keys.map((k) => <Field key={k} label={humanize(k)} value={fmtVal(obj[k])} />)}</div>;
}

// Extra detail sections are shown only when they actually contain data.
const LIST_SECTIONS = ['education', 'experience', 'emergency_contacts', 'dependents', 'visa_details', 'social_media', 'vehicle_details', 'documents'];
const SENSITIVE_LIST = ['bank_details', 'salary_revisions', 'loans', 'income_tax'];
const SENSITIVE_OBJ = ['statutory', 'salary_structure'];

export default function EmployeeProfile({ data, canEdit, onEdit }) {
  const p = data?.primary || {};
  const w = data?.work || {};
  const name = `${p.first_name || ''} ${p.middle_name ? p.middle_name + ' ' : ''}${p.last_name || ''}`.trim() || 'Employee';

  const generalFields = [
    { label: 'Gender', value: has(p.gender) ? fmtVal(p.gender) : '' },
    { label: 'Birthday', value: p.dob ? fmtDate(p.dob) : '' },
    { label: 'Blood group', value: p.blood_group },
  ];
  const workFields = [
    { label: 'Job title', value: w.designation },
    { label: 'Date of joining', value: w.date_of_joining ? fmtDate(w.date_of_joining) : '' },
    { label: 'Work experience', value: tenure(w.date_of_joining) },
    { label: 'Location', value: w.work_location },
  ];

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl">
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

      <Section title="General Information"><FieldList fields={generalFields} /></Section>
      <Section title="Work"><FieldList fields={workFields} /></Section>

      {LIST_SECTIONS.filter((k) => Array.isArray(data?.[k]) && data[k].length > 0).map((k) => (
        <Section key={k} title={humanize(k)}>
          <div className="space-y-3 py-2">{data[k].map((row, i) => <div key={i} className="rounded-xl border p-3 dark:border-slate-700"><ObjectGrid obj={row} /></div>)}</div>
        </Section>
      ))}
      {SENSITIVE_OBJ.filter((k) => data?.[k]).map((k) => (
        <Section key={k} title={humanize(k)}><ObjectGrid obj={data[k]} /></Section>
      ))}
      {SENSITIVE_LIST.filter((k) => Array.isArray(data?.[k]) && data[k].length > 0).map((k) => (
        <Section key={k} title={humanize(k)}>
          <div className="space-y-3 py-2">{data[k].map((row, i) => <div key={i} className="rounded-xl border p-3 dark:border-slate-700"><ObjectGrid obj={row} /></div>)}</div>
        </Section>
      ))}
    </div>
  );
}

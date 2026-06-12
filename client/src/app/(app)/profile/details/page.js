'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, IdCard, Briefcase, GraduationCap, Contact, FolderClosed, Wallet,
  FileText, Landmark, Receipt, Calculator, Car, BadgeIndianRupee, LogOut, Pencil, FileX,
} from 'lucide-react';
import Loader from '@/components/Loader';
import { useAuth } from '@/context/AuthContext';
import { employees as empApi } from '@/lib/db';
import { initials } from '@/lib/format';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
const cap = (s) => s ? String(s).charAt(0).toUpperCase() + String(s).slice(1).toLowerCase().replace(/_/g, ' ') : '—';

const SECTIONS = [
  { key: 'primary', label: 'Primary information', icon: IdCard },
  { key: 'work', label: 'Work information', icon: Briefcase },
  { key: 'education', label: 'Education & experience', icon: GraduationCap },
  { key: 'emergency', label: 'Emergency contacts', icon: Contact },
  { key: 'documents', label: 'Documents', icon: FolderClosed },
  { key: 'compensation', label: 'Compensation', icon: Wallet },
  { key: 'statutory', label: 'Statutory options', icon: FileText },
  { key: 'loans', label: 'Loans', icon: Landmark },
  { key: 'expenses', label: 'Expenses & reimbursements', icon: Receipt },
  { key: 'incometax', label: 'Income tax', icon: Calculator },
  { key: 'vehicle', label: 'Vehicle details', icon: Car },
  { key: 'salary', label: 'Salary details', icon: BadgeIndianRupee },
  { key: 'exit', label: 'Exit details', icon: LogOut },
];

function Field({ label, value, required }) {
  return (
    <div className="rounded-xl border px-3.5 py-2.5 dark:border-slate-700">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}{required && <span className="text-rose-400"> *</span>}</div>
      <div className="mt-0.5 text-sm font-medium text-slate-800 dark:text-slate-100">{value || '—'}</div>
    </div>
  );
}
function SectionTitle({ children }) {
  return <h3 className="mb-4 text-lg font-semibold tracking-tight">{children}</h3>;
}
function EmptyState({ icon: Icon, label }) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed py-16 text-center dark:border-slate-700">
      <Icon size={30} className="mb-3 text-slate-300" />
      <div className="text-sm font-medium text-slate-500">No {label.toLowerCase()} on record</div>
      <div className="mt-1 text-xs text-slate-400">This section has not been filled in yet.</div>
    </div>
  );
}

function DetailsInner() {
  const { user, company } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const idParam = params.get('id');
  const employeeId = idParam || user?.employee;
  const isSelf = !idParam || idParam === user?.employee;
  const canEdit = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR'].includes(user?.role);

  const [emp, setEmp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState('primary');

  useEffect(() => {
    let on = true;
    setLoading(true);
    (async () => {
      try { if (employeeId) { const e = await empApi.getOne(employeeId); if (on) setEmp(e); } }
      catch { /* ignore */ } finally { if (on) setLoading(false); }
    })();
    return () => { on = false; };
  }, [employeeId]);

  const name = useMemo(() => emp ? `${emp.firstName} ${emp.middleName ? emp.middleName + ' ' : ''}${emp.lastName || ''}`.trim() : (user?.name || 'Employee'), [emp, user]);
  const code = emp?.employeeId || user?.employeeCode;

  if (loading) return <Loader />;

  return (
    <div className="space-y-4">
      {/* banner */}
      <div className="card overflow-hidden p-0">
        <div className="relative flex items-center gap-4 bg-gradient-to-r from-sky-500 to-sky-600 px-4 py-5 sm:px-6">
          <button onClick={() => router.back()} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/20 text-white hover:bg-white/30" aria-label="Back"><ArrowLeft size={18} /></button>
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-orange-500 text-xl font-semibold text-white shadow">{initials(name)}</div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold text-white sm:text-2xl">{name}</h1>
            <p className="text-sm text-sky-100">{code ? `${code}` : ''}{emp?.designation?.title ? ` · ${emp.designation.title}` : ''}</p>
          </div>
          {canEdit && (
            <Link href="/employees" className="hidden rounded-lg bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-sky-700 hover:bg-sky-50 sm:inline-flex sm:items-center sm:gap-1.5">
              <Pencil size={13} /> Edit
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        {/* left rail */}
        <div className="card h-fit overflow-x-auto p-2">
          <div className="flex gap-1 lg:flex-col">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <button key={s.key} onClick={() => setSection(s.key)}
                  className={`flex shrink-0 items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-left text-sm font-medium transition lg:w-full ${section === s.key ? 'bg-sky-500 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
                  <Icon size={16} className="shrink-0" /> {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* content */}
        <div className="card p-4 sm:p-6">
          {section === 'primary' && (
            <>
              <SectionTitle>Basic details</SectionTitle>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Employee ID" value={code} required />
                <Field label="First name" value={emp?.firstName} required />
                <Field label="Middle name" value={emp?.middleName} />
                <Field label="Last name" value={emp?.lastName} />
                <Field label="Nick name" value={emp?.nickName} />
                <Field label="Blood group" value={emp?.bloodGroup} />
                <Field label="Date of birth" value={emp?.dob ? fmtDate(emp.dob) : '—'} required />
                <Field label="Gender" value={cap(emp?.gender)} />
                <Field label="Marital status" value={emp?.maritalStatus} />
                <Field label="Smoker" value={emp ? (emp.smoker ? 'Yes' : 'No') : '—'} />
                <Field label="Department" value={emp?.department?.name} required />
                <Field label="Employee status" value={cap(emp?.status)} required />
                <Field label="Job title" value={emp?.designation?.title} required />
                <Field label="Role" value={isSelf ? cap(user?.role) : '—'} required />
                <Field label="Phone" value={emp?.phone} />
                <Field label="Email" value={emp?.email || (isSelf ? user?.email : '')} />
                <div className="sm:col-span-2"><Field label="Address" value={emp?.address} /></div>
              </div>
            </>
          )}

          {section === 'work' && (
            <>
              <SectionTitle>Work information</SectionTitle>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Company" value={company?.name} />
                <Field label="Department" value={emp?.department?.name} />
                <Field label="Job title" value={emp?.designation?.title} />
                <Field label="Reporting manager" value={emp?.manager?.name} />
                <Field label="Date of joining" value={emp?.dateOfJoining ? fmtDate(emp.dateOfJoining) : '—'} />
                <Field label="Employment type" value={cap(emp?.employmentType)} />
                <Field label="Employee status" value={cap(emp?.status)} />
                <Field label="Work location" value={emp?.location} />
              </div>
            </>
          )}

          {section === 'expenses' && (
            <>
              <SectionTitle>Expenses & reimbursements</SectionTitle>
              <div className="rounded-xl border border-dashed p-6 text-center dark:border-slate-700">
                <Receipt size={28} className="mx-auto mb-3 text-slate-300" />
                <p className="text-sm text-slate-500">Submit and track expense claims in the Expenses module.</p>
                <Link href="/expenses" className="btn-primary mt-4 inline-flex">Go to Expenses</Link>
              </div>
            </>
          )}

          {section === 'documents' && (
            Array.isArray(emp?.documents) && emp.documents.length > 0 ? (
              <>
                <SectionTitle>Documents</SectionTitle>
                <ul className="divide-y dark:divide-slate-700">
                  {emp.documents.map((d, i) => (
                    <li key={i} className="flex items-center gap-3 py-3 text-sm"><FileText size={16} className="text-slate-400" /> {d.name || d.title || `Document ${i + 1}`}</li>
                  ))}
                </ul>
              </>
            ) : (<><SectionTitle>Documents</SectionTitle><EmptyState icon={FileX} label="Documents" /></>)
          )}

          {!['primary', 'work', 'expenses', 'documents'].includes(section) && (
            <>
              <SectionTitle>{SECTIONS.find((s) => s.key === section)?.label}</SectionTitle>
              <EmptyState icon={SECTIONS.find((s) => s.key === section)?.icon || FileX} label={SECTIONS.find((s) => s.key === section)?.label || 'records'} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EmployeeDetailsPage() {
  return <Suspense fallback={<Loader />}><DetailsInner /></Suspense>;
}

'use client';
import { cls } from '@/lib/format';

export function EmptyState({ icon: Icon, title, hint, action }) {
  return (
    <div className="card grid place-items-center px-6 py-16 text-center">
      {Icon && <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800"><Icon size={22} /></div>}
      <div className="font-medium">{title}</div>
      {hint && <p className="mt-1 max-w-sm text-sm text-slate-400">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

const TONE = {
  PENDING: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  APPROVED: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  REJECTED: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  CANCELLED: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  PAID: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  DRAFT: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  PROCESSED: 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300',
  ACTIVE: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  PRESENT: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  LATE: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  ABSENT: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  TODO: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  IN_PROGRESS: 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300',
  DONE: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
};

export function StatusBadge({ status }) {
  return <span className={cls('badge', TONE[status] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300')}>{String(status || '').replace(/_/g, ' ')}</span>;
}

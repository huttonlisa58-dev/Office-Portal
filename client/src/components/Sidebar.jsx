'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, Users, Mail, Clock, CalendarCheck, Plane, Wallet, Activity,
  BarChart3, HelpCircle, Phone, Lock, ChevronRight, X, Bot, Building2, Settings, Network, FolderOpen,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cls, initials } from '@/lib/format';

const NAV = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/companies', label: 'Companies', icon: Building2, roles: ['SUPER_ADMIN'] },
  { href: '/employees', label: 'Employees', icon: Users },
  { href: '/documents', label: 'Documents', icon: FolderOpen },
  { label: 'Organization', icon: Network, roles: ['COMPANY_ADMIN', 'HR', 'MANAGER'], children: [
    { href: '/departments', label: 'Departments' },
    { href: '/designations', label: 'Designations' },
    { href: '/locations', label: 'Office locations' },
    { href: '/shifts/requests', label: 'Shift requests' },
  ] },
  { href: '/inbox', label: 'Inbox', icon: Mail },
  { label: 'Time tracker', icon: Clock, children: [
    { href: '/timesheet', label: 'Timesheet' },
  ] },
  { label: 'Attendance tracker', icon: CalendarCheck, children: [
    { href: '/attendance', label: 'My attendance' },
    { href: '/attendance/shift', label: 'My shift' },
    { href: '/attendance/regularize', label: 'Regularization' },
    { href: '/reports', label: 'Reports' },
  ] },
  { label: 'Leave tracker', icon: Plane, children: [
    { href: '/leaves', label: 'My leaves' },
    { href: '/leaves/holidays', label: 'Holidays' },
    { href: '/leaves/rollover', label: 'Leave rollover' },
    { href: '/leaves/compoff', label: 'Comp off request' },
    { href: '/leaves/encashment', label: 'Leave encashment' },
  ] },
  { label: 'Performance management', icon: Activity, children: [
    { href: '/projects', label: 'Projects' },
    { href: '/tasks', label: 'Tasks & goals' },
    { href: '/performance', label: 'Appraisals' },
  ] },
  { href: '/call-tracker', label: 'Call tracker', icon: Phone },
  { label: 'Payroll', icon: Wallet, children: [
    { href: '/payroll', label: 'Payroll' },
    { href: '/payroll/revisions', label: 'Salary revisions' },
    { href: '/payroll/loans', label: 'Loans & advances' },
    { href: '/expenses', label: 'Expenses & reimbursement' },
    { href: '/assets', label: 'Assets' },
  ] },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/assistant', label: 'AI Assistant', icon: Bot },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR'] },
  { href: '/help', label: 'Help', icon: HelpCircle },
];

function isActive(pathname, href) {
  if (!href || href === '#') return false;
  return pathname === href || pathname.startsWith(href + '/');
}

export default function Sidebar({ open, onClose }) {
  const pathname = usePathname();
  const { user, company } = useAuth();
  const role = user?.role;
  const items = NAV.filter((n) => !n.roles || n.roles.includes(role));

  // auto-open the group containing the active route
  const initialOpen = {};
  items.forEach((n, i) => { if (n.children?.some((c) => isActive(pathname, c.href))) initialOpen[i] = true; });
  const [openGroups, setOpenGroups] = useState(initialOpen);
  const toggle = (i) => setOpenGroups((s) => ({ ...s, [i]: !s[i] }));

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={onClose} />}
      <aside className={cls(
        'fixed inset-y-0 left-0 z-40 flex w-64 transform flex-col bg-slate-900 text-slate-200 transition-transform lg:static lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex items-start justify-between gap-2 px-4 py-4">
          <Link href="/dashboard" className="flex items-start gap-2.5">
            {company?.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={company.logo} alt={company?.name || 'Company'} className="h-9 w-9 shrink-0 rounded-lg bg-white object-contain p-0.5" />
            ) : (
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-sm font-extrabold text-brand-600">{company?.name ? company.name[0] : 'H'}</div>
            )}
            <span className="text-sm font-semibold leading-tight text-white">{company?.name || 'HRMS Platform'}</span>
          </Link>
          <button className="rounded-lg p-1 text-slate-400 hover:bg-white/10 lg:hidden" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="flex flex-col items-center px-4 pb-5 pt-2 text-center">
          <div className="text-base font-semibold text-white">{user?.name || 'User'}</div>
          {user?.employeeCode && <div className="text-xs tracking-wide text-slate-400">{user.employeeCode}</div>}
          <div className="mt-3 grid h-20 w-20 place-items-center rounded-full bg-orange-500 text-2xl font-semibold text-white">{initials(user?.name || 'U')}</div>
        </div>

        <div className="px-5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Applications</div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-6">
          {items.map((n, i) => {
            const Icon = n.icon;
            if (n.children) {
              const groupActive = n.children.some((c) => isActive(pathname, c.href));
              const isOpen = openGroups[i] ?? groupActive;
              return (
                <div key={n.label}>
                  <button onClick={() => toggle(i)} className={cls(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                    groupActive ? 'text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  )}>
                    <Icon size={18} className={groupActive ? 'text-sky-400' : 'text-slate-400'} />
                    <span className="flex-1 text-left">{n.label}</span>
                    <ChevronRight size={15} className={cls('text-slate-500 transition-transform', isOpen && 'rotate-90')} />
                  </button>
                  {isOpen && (
                    <div className="mb-1 space-y-0.5 pl-4">
                      {n.children.map((c) => {
                        const active = isActive(pathname, c.href);
                        return (
                          <Link key={c.href} href={c.href} onClick={onClose} className={cls(
                            'block rounded-lg px-3 py-2 text-sm transition',
                            active ? 'bg-sky-500 font-medium text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                          )}>{c.label}</Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }
            const active = isActive(pathname, n.href);
            return (
              <Link key={n.label} href={n.locked ? '#' : n.href} onClick={n.locked ? (e) => e.preventDefault() : onClose} className={cls(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                active ? 'bg-sky-500 text-white' : n.locked ? 'cursor-not-allowed text-slate-500' : 'text-slate-300 hover:bg-white/5 hover:text-white'
              )}>
                <Icon size={18} className={active ? 'text-white' : 'text-slate-400'} />
                <span className="flex-1">{n.label}</span>
                {n.locked && <Lock size={14} className="text-slate-500" />}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

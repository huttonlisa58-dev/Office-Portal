'use client';
import { useCallback, useEffect, useState } from 'react';
import Loader from '@/components/Loader';
import EmployeeProfile from '@/components/EmployeeProfile';
import EditEmployeeModal from '@/components/EditEmployeeModal';
import { useAuth } from '@/context/AuthContext';
import { employees as empApi } from '@/lib/db';
import { initials } from '@/lib/format';

const ROLE_LABEL = { SUPER_ADMIN: 'Super Admin', COMPANY_ADMIN: 'Company Admin', HR: 'HR', MANAGER: 'Manager', EMPLOYEE: 'Employee' };

export default function ProfilePage() {
  const { user } = useAuth();
  const canEdit = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR'].includes(user?.role);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    if (!user?.employee) { setLoading(false); return; }
    setLoading(true);
    try { setData(await empApi.fullProfile(user.employee)); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, [user?.employee]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <Loader />;

  // Accounts without a linked employee record (e.g. Super Admin / Company Admin): show an account card.
  if (!data) {
    const roleLabel = ROLE_LABEL[user?.role] || user?.role || '—';
    const isSuper = user?.role === 'SUPER_ADMIN';
    return (
      <div className="space-y-4">
        <div className="overflow-hidden rounded-2xl">
          <div className="flex items-center gap-4 bg-gradient-to-r from-sky-500 to-sky-600 px-4 py-5 sm:px-6">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-orange-500 text-2xl font-semibold text-white shadow">{initials(user?.name || user?.email || 'U')}</div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold text-white sm:text-2xl">{user?.name || 'My account'}</h1>
              <p className="text-sm text-sky-100">{roleLabel}</p>
            </div>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="bg-sky-500 px-5 py-3 text-base font-semibold text-white">Account</div>
          <div className="divide-y divide-slate-100 px-5 py-2 dark:divide-slate-700/60">
            <Field label="Name" value={user?.name} />
            <Field label="Email" value={user?.email} />
            <Field label="Role" value={roleLabel} />
            <Field label="Access" value={isSuper ? 'Platform-wide — all companies & employees' : 'Company-level'} />
          </div>
        </div>
        {isSuper && (
          <p className="px-1 text-sm text-slate-500 dark:text-slate-400">
            As Super Admin you have full access. Open any employee’s complete profile from the Employees page — across every company.
          </p>
        )}
      </div>
    );
  }

  const p = data.primary || {};
  const editEmp = { _id: p.id, firstName: p.first_name, lastName: p.last_name, email: p.email };

  return (
    <>
      <EmployeeProfile data={data} canEdit={canEdit} onEdit={() => setEditing(editEmp)} />
      {canEdit && <EditEmployeeModal emp={editing} onClose={() => setEditing(null)} onDone={load} />}
    </>
  );
}

function Field({ label, value }) {
  return (
    <div className="py-3">
      <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 break-words text-[15px] font-medium text-slate-800 dark:text-slate-100">{value || '—'}</div>
    </div>
  );
}

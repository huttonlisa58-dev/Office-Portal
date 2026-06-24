'use client';
import { useState } from 'react';
import { UserCheck } from 'lucide-react';
import PageBanner from '@/components/PageBanner';
import MyAttendance from '@/components/MyAttendance';
import CheckInOutCard from '@/components/CheckInOutCard';
import TeamAttendanceGrid from '@/components/TeamAttendanceGrid';
import { useAuth } from '@/context/AuthContext';

export default function AttendancePage() {
  const { user } = useAuth();
  const isStaff = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'MANAGER'].includes(user?.role);
  const [view, setView] = useState('me');

  return (
    <>
      <PageBanner icon={UserCheck} title="My attendance" />
      {isStaff && (
        <div className="mb-5 flex gap-6 border-b">
          {[['me', 'My attendance'], ['team', 'Team attendance']].map(([k, label]) => (
            <button key={k} onClick={() => setView(k)}
              className={`border-b-2 pb-3 text-sm font-medium transition ${view === k ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
              {label}
            </button>
          ))}
        </div>
      )}
      {view === 'team' ? <TeamAttendanceGrid /> : (
        user?.employee ? (
          <>
            <MyAttendance employeeId={user?.employee} />
            <CheckInOutCard employeeId={user?.employee} companyId={user?.company} />
          </>
        ) : isStaff ? (
          <>
            <p className="mb-3 text-sm text-slate-500">Your account isn&apos;t linked to an employee record, so there&apos;s no personal attendance — showing company attendance instead.</p>
            <TeamAttendanceGrid />
          </>
        ) : (
          <MyAttendance employeeId={user?.employee} />
        )
      )}
    </>
  );
}

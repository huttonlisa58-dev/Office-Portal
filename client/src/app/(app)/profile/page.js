'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { User, Briefcase, Calendar, Phone, Mail, MapPin, Hash, BadgeCheck, Users } from 'lucide-react';
import Loader from '@/components/Loader';
import { useAuth } from '@/context/AuthContext';
import { employees as empApi } from '@/lib/db';
import { initials } from '@/lib/format';

const TABS = ['About', 'Timeline', 'Followers', 'Following'];
const fmtDate = (d) => d ? new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon size={16} className="mt-0.5 text-slate-400" />
      <div>
        <div className="text-xs text-slate-400">{label}</div>
        <div className="text-sm font-medium">{value || '—'}</div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, company } = useAuth();
  const [emp, setEmp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('About');

  useEffect(() => {
    let on = true;
    (async () => {
      try { if (user?.employee) { const e = await empApi.getOne(user.employee); if (on) setEmp(e); } }
      catch { /* ignore */ } finally { if (on) setLoading(false); }
    })();
    return () => { on = false; };
  }, [user?.employee]);

  if (loading) return <Loader />;

  const name = user?.name || (emp ? `${emp.firstName} ${emp.lastName || ''}`.trim() : 'User');
  const code = user?.employeeCode || emp?.employeeId;

  return (
    <div className="space-y-4">
      {/* banner */}
      <div className="card overflow-hidden p-0">
        <div className="relative bg-gradient-to-br from-slate-800 via-slate-900 to-black px-6 pt-8 pb-6">
          <Link href="/profile/details" className="absolute right-5 top-5 rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow hover:bg-sky-600">
            View full details
          </Link>
          <div className="flex flex-wrap items-end gap-4">
            <div className="grid h-24 w-24 place-items-center rounded-full border-4 border-white/10 bg-orange-500 text-3xl font-semibold text-white shadow-lg">
              {initials(name)}
            </div>
            <div className="pb-1">
              <h1 className="text-2xl font-semibold text-white">{name}</h1>
              <p className="text-sm text-slate-300">{code ? `${code} · ` : ''}{user?.role?.replace('_', ' ').toLowerCase()}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-6 border-b px-6 text-sm dark:border-slate-700">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`border-b-2 py-3 font-medium transition ${tab === t ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === 'About' && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* General */}
          <div className="card overflow-hidden">
            <div className="bg-sky-500 px-5 py-3 text-sm font-semibold text-white">General Information</div>
            <div className="divide-y px-5 dark:divide-slate-700">
              <Row icon={User} label="Gender" value={emp?.gender} />
              <Row icon={Calendar} label="Birthday" value={emp?.dob ? fmtDate(emp.dob) : '—'} />
              <Row icon={Phone} label="Phone" value={emp?.phone} />
              <Row icon={Mail} label="Email" value={emp?.email || user?.email} />
              <Row icon={MapPin} label="Address" value={emp?.address} />
            </div>
          </div>
          {/* Work */}
          <div className="card overflow-hidden">
            <div className="bg-sky-500 px-5 py-3 text-sm font-semibold text-white">Work</div>
            <div className="divide-y px-5 dark:divide-slate-700">
              <Row icon={Hash} label="Employee code" value={code} />
              <Row icon={Briefcase} label="Job title" value={emp?.designation?.title} />
              <Row icon={Users} label="Department" value={emp?.department?.name} />
              <Row icon={Calendar} label="Date of joining" value={emp?.dateOfJoining ? fmtDate(emp.dateOfJoining) : '—'} />
              <Row icon={BadgeCheck} label="Employment type" value={emp?.employmentType} />
              <Row icon={User} label="Reporting manager" value={emp?.manager?.name} />
            </div>
          </div>
        </div>
      )}

      {tab !== 'About' && (
        <div className="card grid place-items-center py-16 text-center">
          <Users size={32} className="mb-3 text-slate-300" />
          <div className="text-sm font-medium text-slate-500">{tab} coming soon</div>
          <div className="mt-1 text-xs text-slate-400">Social {tab.toLowerCase()} features are on the roadmap.</div>
        </div>
      )}

      {!emp && (
        <div className="card px-5 py-4 text-sm text-slate-500">
          This account ({user?.email}) has no linked employee record, so only basic info is shown.
        </div>
      )}
    </div>
  );
}

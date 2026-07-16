'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2, Users, UserCog, Cake, UserPlus, CalendarDays, Plane, UserMinus, GripVertical, Rss, LayoutGrid, Megaphone, UserCheck, DollarSign, Award,
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip } from 'recharts';
import StatCard from '@/components/StatCard';
import Loader from '@/components/Loader';
import { useAuth } from '@/context/AuthContext';
import { getDashboard, home } from '@/lib/db';
import { initials } from '@/lib/format';

const PIE = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];
const AVA = ['bg-orange-500', 'bg-sky-500', 'bg-emerald-500', 'bg-violet-500', 'bg-rose-500', 'bg-amber-500'];
const fmtDate = (d) => d ? new Date(d).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) : '';

export default function DashboardPage() {
  const { user, profile } = useAuth();

  if (profile?.role === 'SUPER_ADMIN') return <Platform name={user?.name} profile={profile} />;
  return <Company name={user?.name} profile={profile} />;
}

/* ---------------- Welcome banner ---------------- */
function Banner({ name }) {
  return (
    <div className="mb-5 overflow-hidden rounded-2xl bg-gradient-to-r from-sky-500 to-sky-600 px-6 py-7 text-white shadow-soft">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Welcome, {name?.split(' ')[0] || 'there'} !</h1>
      <p className="mt-1 text-sm text-sky-100">Here&apos;s what&apos;s happening across your team today.</p>
    </div>
  );
}

/* ---------------- Reusable widget pieces ---------------- */
function Widget({ icon: Icon, title, children }) {
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center gap-2 text-slate-400">
        <GripVertical size={15} className="cursor-grab opacity-50" />
        <Icon size={17} className="text-sky-500" />
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
      </div>
      {children}
    </div>
  );
}
function Person({ i, name, sub, meta, id }) {
  const avatar = <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold text-white ${AVA[i % AVA.length]}`}>{initials(name)}</div>;
  const body = (
    <div className="min-w-0 flex-1">
      <div className="truncate text-sm font-medium">{name}</div>
      {sub && <div className="truncate text-xs text-slate-400">{sub}</div>}
    </div>
  );
  const metaEl = meta && <div className="shrink-0 text-xs text-slate-400">{meta}</div>;
  if (id) {
    return (
      <Link href={`/employees/${id}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
        {avatar}{body}{metaEl}
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-3 py-2">
      {avatar}{body}{metaEl}
    </div>
  );
}
function Empty({ text }) { return <p className="py-6 text-center text-sm text-slate-400">{text}</p>; }

/* ---------------- Company / employee dashboard ---------------- */
function Company({ name, profile }) {
  const [tab, setTab] = useState('dashboard');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const isManager = ['COMPANY_ADMIN', 'HR', 'MANAGER'].includes(profile?.role);

  useEffect(() => {
    if (!profile) return;
    home.widgets(profile).then(setData).catch(() => {}).finally(() => setLoading(false));
    if (isManager) getDashboard(profile, null).then((d) => setStats(d?.widgets || null)).catch(() => {});
  }, [profile, isManager]);

  const TABS = [
    { key: 'feeds', label: 'Feeds', icon: Rss },
    { key: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { key: 'announcements', label: 'Announcements', icon: Megaphone },
  ];

  return (
    <>
      <Banner name={name} />
      <div className="mb-5 flex gap-6 border-b">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-medium transition ${tab === t.key ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'feeds' && (
        <div className="card p-8 text-center text-sm text-slate-400">Your activity feed will appear here.</div>
      )}
      {tab === 'announcements' && (
        <div className="card p-8 text-center text-sm text-slate-400">No announcements right now.</div>
      )}

      {tab === 'dashboard' && (
        loading ? <Loader /> : !data ? <div className="card p-8 text-center text-slate-500">Could not load dashboard.</div> : (
          <>
            {isManager && stats && (
              <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <StatCard icon={Users} label="Employees" value={stats.totalEmployees} tone="brand" />
                <StatCard icon={UserCheck} label="Present today" value={stats.presentToday} tone="green" />
                <StatCard icon={Plane} label="Pending leaves" value={stats.pendingLeaves} tone="amber" />
                <StatCard icon={Building2} label="Departments" value={stats.departmentsCount} tone="brand" />
                <StatCard icon={DollarSign} label="Payroll (this month)" value={stats.payrollThisMonth ? '₹' + Number(stats.payrollThisMonth).toLocaleString('en-IN') : '—'} tone="green" />
              </div>
            )}
            <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
            {data.showPeopleWidgets && (
              <Widget icon={Cake} title="Birthday">
                {data.birthdays.length ? data.birthdays.map((p, i) => <Person key={p.id} i={i} id={p.id} name={p.name} sub={p.role} meta={fmtDate(p.date)} />) : <Empty text="No upcoming birthdays." />}
              </Widget>
            )}

            {data.showPeopleWidgets && (
              <Widget icon={Award} title="Work anniversaries">
                {data.anniversaries?.length
                  ? data.anniversaries.map((p, i) => <Person key={p.id} i={i} id={p.id} name={p.name} sub={p.role} meta={`${p.years} yr${p.years > 1 ? 's' : ''} · ${fmtDate(p.date)}`} />)
                  : <Empty text="No upcoming work anniversaries." />}
              </Widget>
            )}

            {data.showPeopleWidgets && (
              <Widget icon={UserPlus} title="New joiners">
                {data.newJoiners.length ? data.newJoiners.map((p, i) => <Person key={p.id} i={i} id={p.id} name={p.name} sub={p.role} meta={fmtDate(p.date)} />) : <Empty text="No new joiners in the last 30 days." />}
              </Widget>
            )}

            {data.showPeopleWidgets && (
              <Widget icon={Users} title="Department members">
                {data.departmentMembers.length ? data.departmentMembers.map((p, i) => <Person key={p.id} i={i} id={p.id} name={p.name} sub={p.role} />) : <Empty text="No department members yet." />}
              </Widget>
            )}

            <Widget icon={CalendarDays} title="Upcoming holidays">
              {data.holidays.length ? data.holidays.map((h, i) => (
                <div key={h._id} className="flex items-center justify-between py-2 text-sm">
                  <span className="font-medium">{h.name}</span>
                  <span className="text-xs text-slate-400">{fmtDate(h.date)}</span>
                </div>
              )) : <Empty text="No holidays scheduled." />}
            </Widget>

            <Widget icon={Plane} title="Leave availability">
              {data.leaveBalance ? (
                <div className="space-y-3">
                  {[['Casual', 'CASUAL', 12], ['Sick', 'SICK', 10], ['Earned', 'EARNED', 15]].map(([label, key, quota]) => {
                    const left = data.leaveBalance[key] ?? 0;
                    const pct = Math.max(0, Math.min(100, Math.round((left / quota) * 100)));
                    return (
                      <div key={key}>
                        <div className="mb-1 flex justify-between text-xs"><span className="font-medium">{label}</span><span className="text-slate-400">{left} / {quota} days</span></div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded-full bg-sky-500" style={{ width: `${pct}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
              ) : <Empty text="No leave balance linked to your account." />}
            </Widget>

            {data.showPeopleWidgets && (
              <Widget icon={UserMinus} title="People on leave">
                {data.peopleOnLeave.length ? data.peopleOnLeave.map((p, i) => <Person key={i} i={i} name={p.name} sub={p.role} meta={`till ${fmtDate(p.until)}`} />) : <Empty text="Everyone&apos;s in today." />}
              </Widget>
            )}
          </div>
          </>
        )
      )}
    </>
  );
}

/* ---------------- Super-admin platform overview ---------------- */
function Platform({ name, profile }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getDashboard(profile, null).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [profile]);

  if (loading) return <><Banner name={name} /><Loader /></>;
  if (!data) return <><Banner name={name} /><div className="card p-8 text-center text-slate-500">Could not load.</div></>;
  const { widgets, planDistribution = [], recentCompanies = [] } = data;

  return (
    <>
      <Banner name={name} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={Building2} label="Total companies" value={widgets.totalCompanies} tone="brand" />
        <StatCard icon={Users} label="Total employees" value={widgets.totalEmployees} tone="green" />
        <StatCard icon={UserCog} label="Platform users" value={widgets.totalUsers} tone="amber" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h3 className="mb-4 font-semibold">Recent companies</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-slate-400"><th className="pb-2 font-medium">Company</th><th className="pb-2 font-medium">Slug</th><th className="pb-2 font-medium">Plan</th><th className="pb-2 font-medium">Created</th></tr></thead>
              <tbody>
                {recentCompanies.map((c) => (
                  <tr key={c._id} className="border-t">
                    <td className="py-2.5 font-medium">{c.name}</td>
                    <td className="py-2.5 text-slate-500">{c.slug}</td>
                    <td className="py-2.5"><span className="badge bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">{c.subscription?.plan || 'FREE'}</span></td>
                    <td className="py-2.5 text-slate-500">{new Date(c.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {recentCompanies.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-slate-400">No companies yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card p-5">
          <h3 className="mb-4 font-semibold">Plan distribution</h3>
          {planDistribution.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={planDistribution} dataKey="count" nameKey="plan" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {planDistribution.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                </Pie><Legend /><Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="py-10 text-center text-sm text-slate-400">No data.</p>}
        </div>
      </div>
    </>
  );
}

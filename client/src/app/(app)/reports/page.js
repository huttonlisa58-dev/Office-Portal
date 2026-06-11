'use client';
import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Download } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import PageHeader from '@/components/PageHeader';
import Loader from '@/components/Loader';
import { money } from '@/lib/format';
import { attendance as attApi, leaves as leaveApi, payroll as payApi } from '@/lib/db';

const PIE = ['#1f49f5', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];
const TABS = [
  { key: 'attendance', label: 'Attendance' },
  { key: 'leave', label: 'Leave' },
  { key: 'payroll', label: 'Payroll' },
];

export default function ReportsPage() {
  const [tab, setTab] = useState('attendance');
  const [att, setAtt] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      attApi.list({ from: daysAgo(30) }),
      leaveApi.list(),
      payApi.list(),
    ]).then(([a, l, p]) => {
      setAtt(a); setLeaves(l); setPayroll(p);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const attByStatus = useMemo(() => groupCount(att, 'status'), [att]);
  const leaveByStatus = useMemo(() => groupCount(leaves, 'status'), [leaves]);
  const leaveByType = useMemo(() => groupCount(leaves, 'type'), [leaves]);
  const payrollByMonth = useMemo(() => {
    const m = {};
    payroll.forEach((p) => { const k = `${p.month}/${p.year}`; m[k] = (m[k] || 0) + p.netPay; });
    return Object.entries(m).map(([k, v]) => ({ name: k, net: Math.round(v) }));
  }, [payroll]);
  const totalNet = payroll.reduce((s, p) => s + p.netPay, 0);

  const exportCsv = () => {
    const map = {
      attendance: { rows: att, cols: ['date', 'status', 'workedMinutes', 'overtimeMinutes'], name: 'attendance' },
      leave: { rows: leaves, cols: ['type', 'from', 'to', 'days', 'status'], name: 'leave' },
      payroll: { rows: payroll, cols: ['month', 'year', 'gross', 'tax', 'netPay', 'status'], name: 'payroll' },
    }[tab];
    downloadCsv(map.name, map.cols, map.rows);
  };

  if (loading) return <Loader />;

  return (
    <>
      <PageHeader title="Reports & Analytics" subtitle="Last 30 days of activity across your workspace"
        actions={<button className="btn-outline" onClick={exportCsv}><Download size={16} /> Export CSV</button>} />

      <div className="mb-6 inline-flex rounded-xl border bg-white p-1 dark:bg-slate-900">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${tab === t.key ? 'bg-brand-600 text-white' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}>{t.label}</button>
        ))}
      </div>

      {tab === 'attendance' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard title="Records by status">
            {attByStatus.length ? <PieView data={attByStatus} /> : <Empty />}
          </ChartCard>
          <ChartCard title="Volume by status">
            {attByStatus.length ? <BarView data={attByStatus} /> : <Empty />}
          </ChartCard>
        </div>
      )}

      {tab === 'leave' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard title="Requests by status">{leaveByStatus.length ? <PieView data={leaveByStatus} /> : <Empty />}</ChartCard>
          <ChartCard title="Requests by type">{leaveByType.length ? <BarView data={leaveByType} /> : <Empty />}</ChartCard>
        </div>
      )}

      {tab === 'payroll' && (
        <div className="grid gap-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="card p-5"><div className="text-sm text-slate-500">Total net paid</div><div className="mt-1 text-2xl font-semibold">{money(totalNet)}</div></div>
            <div className="card p-5"><div className="text-sm text-slate-500">Runs</div><div className="mt-1 text-2xl font-semibold">{payroll.length}</div></div>
            <div className="card p-5"><div className="text-sm text-slate-500">Paid</div><div className="mt-1 text-2xl font-semibold">{payroll.filter((p) => p.status === 'PAID').length}</div></div>
          </div>
          <ChartCard title="Net pay by month">
            {payrollByMonth.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={payrollByMonth} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} /><XAxis dataKey="name" fontSize={12} /><YAxis fontSize={12} />
                  <Tooltip /><Bar dataKey="net" fill="#1f49f5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <Empty />}
          </ChartCard>
        </div>
      )}
    </>
  );
}

function ChartCard({ title, children }) { return <div className="card p-5"><h3 className="mb-4 font-semibold">{title}</h3>{children}</div>; }
function Empty() { return <p className="py-12 text-center text-sm text-slate-400">No data for this period.</p>; }
function PieView({ data }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
        {data.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}</Pie><Legend /><Tooltip /></PieChart>
    </ResponsiveContainer>
  );
}
function BarView({ data }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ left: -10 }}><CartesianGrid strokeDasharray="3 3" opacity={0.2} />
        <XAxis dataKey="name" fontSize={12} /><YAxis fontSize={12} allowDecimals={false} /><Tooltip />
        <Bar dataKey="value" fill="#1f49f5" radius={[6, 6, 0, 0]} /></BarChart>
    </ResponsiveContainer>
  );
}

function groupCount(rows, key) {
  const m = {};
  rows.forEach((r) => { const k = r[key] || 'UNKNOWN'; m[k] = (m[k] || 0) + 1; });
  return Object.entries(m).map(([name, value]) => ({ name: String(name).replace(/_/g, ' '), value }));
}
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }
function downloadCsv(name, cols, rows) {
  const header = cols.join(',');
  const body = rows.map((r) => cols.map((c) => JSON.stringify(r[c] ?? '')).join(',')).join('\n');
  const blob = new Blob([`${header}\n${body}`], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `${name}-report.csv`; a.click(); URL.revokeObjectURL(url);
}

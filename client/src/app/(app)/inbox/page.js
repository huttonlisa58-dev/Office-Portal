'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Mail, Calendar, DollarSign, FileText, Clock, Receipt, ShieldCheck, Package,
  Users, UserCog, Settings, Check, X, Inbox as InboxIcon, CalendarCheck,
} from 'lucide-react';
import PageBanner from '@/components/PageBanner';
import Loader from '@/components/Loader';
import { StatusBadge } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { leaves as leaveApi, attendanceReq } from '@/lib/db';
import { cls, initials } from '@/lib/format';

const MODULES = [
  { key: 'leaves', label: 'Leaves', icon: Calendar, live: true },
  { key: 'attendance', label: 'Attendance tracker', icon: CalendarCheck, live: true },
  { key: 'rollover', label: 'Leave rollover', icon: DollarSign },
  { key: 'compoff', label: 'Comp off request', icon: FileText },
  { key: 'timesheet', label: 'Timesheet', icon: Clock },
  { key: 'expenses', label: 'Expenses & reimbursement', icon: Receipt },
  { key: 'investments', label: 'Proof of investments', icon: ShieldCheck },
  { key: 'assets', label: 'Assets', icon: Package },
  { key: 'employees', label: 'Employees', icon: Users },
  { key: 'delegation', label: 'Delegation', icon: UserCog },
  { key: 'delegationSettings', label: 'Delegation settings', icon: Settings },
];
const TABS = [['mine', 'My requests'], ['await', 'Awaiting approval'], ['done', 'Completed']];
const fmt = (d) => d ? new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '';
const clk = (d) => d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
const ago = (d) => {
  if (!d) return '';
  const diff = (Date.now() - new Date(d).getTime()) / 86400000;
  if (diff < 1) return 'today'; if (diff < 2) return 'yesterday';
  if (diff < 30) return `${Math.floor(diff)} days ago`;
  return `${Math.floor(diff / 30)} month(s) ago`;
};

const humanLeave = (t) => (t || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export default function InboxPage() {
  const { user } = useAuth();
  const canDecide = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'MANAGER'].includes(user?.role);
  const [module, setModule] = useState('leaves');
  const [tab, setTab] = useState('mine');
  // Approvers should land on "Awaiting approval" (the requests they must act on),
  // not "My requests" — which is empty for admin/HR accounts with no employee record.
  const tabInit = useRef(false);
  useEffect(() => {
    if (!tabInit.current && user) {
      tabInit.current = true;
      if (['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'MANAGER'].includes(user.role)) setTab('await');
    }
  }, [user]);
  const [leaves, setLeaves] = useState([]);
  const [att, setAtt] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState(null);
  const [approvers, setApprovers] = useState([]);

  useEffect(() => {
    if (sel?.kind === 'leave' && sel._id) leaveApi.approvers(sel._id).then(setApprovers).catch(() => setApprovers([]));
    else setApprovers([]);
  }, [sel]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [l, a] = await Promise.all([leaveApi.list().catch(() => []), attendanceReq.list().catch(() => [])]);
      setLeaves(l); setAtt(a);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const mineCode = user?.employeeCode;
  const isMine = (r) => mineCode && r.employee?.employeeId === mineCode;
  const source = module === 'leaves' ? leaves.map((l) => ({ ...l, kind: 'leave', when: l.from })) :
    module === 'attendance' ? att.map((a) => ({ ...a, kind: 'attendance', when: a.createdAt })) : [];
  const list = source.filter((r) => {
    // My requests: always the logged-in user's own requests.
    if (tab === 'mine') return isMine(r);
    const decided = r.status === 'APPROVED' || r.status === 'REJECTED';
    // Approvers see colleagues' items in Awaiting/Completed; everyone else sees only their own.
    if (tab === 'await') return r.status === 'PENDING' && (canDecide ? !isMine(r) : isMine(r));
    return decided && (canDecide ? !isMine(r) : isMine(r));
  });

  const decide = async (item, decision) => {
    try {
      if (item.kind === 'attendance') await attendanceReq.decide(item._id, decision);
      else await leaveApi.decide(item._id, decision);
      setSel(null); load();
    } catch (e) { alert(e.message || 'Action failed'); }
  };

  return (
    <>
      <PageBanner icon={Mail} title="Inbox" />
      <div className="grid gap-4 lg:grid-cols-[230px_1fr]">
        {/* module rail */}
        <div className="card h-fit overflow-x-auto p-1.5 lg:overflow-visible">
          <div className="flex gap-1 lg:flex-col">
            {MODULES.map((m) => (
              <button key={m.key} onClick={() => { setModule(m.key); setSel(null); }}
                className={cls('flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-left text-sm transition lg:w-full',
                  module === m.key ? 'bg-sky-500 font-medium text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800')}>
                <m.icon size={16} /> <span className="flex-1 truncate">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* content */}
        <div className="card overflow-hidden">
          <div className="flex gap-6 border-b px-5 pt-3">
            {TABS.map(([k, label]) => (
              <button key={k} onClick={() => { setTab(k); setSel(null); }}
                className={cls('border-b-2 pb-3 text-sm font-medium transition', tab === k ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200')}>
                {label}
              </button>
            ))}
          </div>

          <div className="grid md:grid-cols-2">
            <div className="border-r dark:border-slate-700">
              {loading ? <Loader /> : list.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-16 text-slate-400">
                  <InboxIcon size={28} /><span className="text-sm">No requests here.</span>
                </div>
              ) : list.map((r) => (
                <button key={r._id} onClick={() => setSel(r)} className={cls('block w-full border-b px-5 py-4 text-left transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/40', sel?._id === r._id && 'bg-sky-50 dark:bg-sky-950/30')}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-orange-500 text-xs font-semibold text-white">{initials(`${r.employee?.firstName || ''} ${r.employee?.lastName || ''}`)}</div>
                      <span className="font-medium">{r.employee?.firstName} {r.employee?.lastName}</span>
                    </div>
                    <span className="text-xs text-slate-400">{ago(r.when)}</span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between pl-10 text-sm">
                    <span className="text-slate-500">{r.kind === 'attendance' ? `Regularization · ${fmt(r.date)}` : `Requested for ${fmt(r.from)}`}</span>
                    <StatusBadge status={r.status} />
                  </div>
                </button>
              ))}
            </div>

            {/* detail */}
            <div className="hidden md:block">
              {!sel ? (
                <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-3 text-slate-300">
                  <div className="grid h-20 w-20 place-items-center rounded-full bg-sky-100 text-sky-500 dark:bg-sky-950/40"><Mail size={34} /></div>
                  <span className="text-lg text-slate-400">Select a message to read</span>
                </div>
              ) : (
                <div className="p-6">
                  <div className="mb-1 flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-full bg-orange-500 text-sm font-semibold text-white">{initials(`${sel.employee?.firstName || ''} ${sel.employee?.lastName || ''}`)}</div>
                    <div>
                      <div className="font-semibold text-sky-600">{sel.employee?.firstName} {sel.employee?.lastName}</div>
                      <div className="text-xs text-slate-400">{sel.kind === 'attendance' ? 'Attendance regularization' : ([sel.employee?.designation, sel.employee?.location].filter(Boolean).join(', ') || `${humanLeave(sel.type)} leave`)}</div>
                    </div>
                  </div>
                  <p className="mb-4 mt-2 text-sm text-slate-500">{sel.employee?.firstName} {sel.employee?.lastName} made a {sel.kind === 'attendance' ? 'regularization' : 'leave'} request</p>
                  <dl className="space-y-2.5 text-sm">
                    {sel.kind === 'attendance' ? (<>
                      <Row k="Date" v={fmt(sel.date)} />
                      <Row k="Check-in" v={clk(sel.checkIn)} />
                      <Row k="Check-out" v={sel.checkOut ? clk(sel.checkOut) : '—'} />
                      <Row k="Remarks" v={sel.remarks || '—'} />
                      <Row k="Status" v={<StatusBadge status={sel.status} />} />
                    </>) : (<>
                      <Row k="Leave type" v={humanLeave(sel.type)} />
                      <Row k="Applied on" v={sel.appliedOn ? `${fmt(sel.appliedOn)}, ${clk(sel.appliedOn)}` : '—'} />
                      <Row k="No of day(s)" v={`${sel.days} day(s)`} />
                      <Row k="Leave applied for" v={`${fmt(sel.from)}${sel.to && sel.to !== sel.from ? ` – ${fmt(sel.to)}` : ''} (${sel.days} day(s))`} />
                      <Row k="Leave reason" v={sel.reason || '—'} />
                      <Row k="Over all status" v={<StatusBadge status={sel.status} />} />
                      {approvers.length > 0 && <Row k="Approver(s)" v={approvers.join(' (or) ')} />}
                      {sel.decidedBy && <Row k="Decision taken by" v={sel.decidedBy} />}
                      {sel.decidedAt && <Row k={`${sel.status === 'REJECTED' ? 'Rejected' : 'Approved'} date`} v={`${fmt(sel.decidedAt)}, ${clk(sel.decidedAt)}`} />}
                      {sel.decisionNote && <Row k="Decision note" v={sel.decisionNote} />}
                    </>)}
                  </dl>
                  {canDecide && sel.status === 'PENDING' && (
                    <div className="mt-5 flex gap-2">
                      <button className="btn bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => decide(sel, 'APPROVED')}><Check size={16} /> Approve</button>
                      <button className="btn-outline text-rose-600" onClick={() => decide(sel, 'REJECTED')}><X size={16} /> Reject</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
function Row({ k, v }) { return <div className="flex gap-3"><dt className="w-36 shrink-0 text-slate-400">{k}</dt><dd className="font-medium">{v}</dd></div>; }

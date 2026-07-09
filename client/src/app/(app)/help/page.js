'use client';
import { useState } from 'react';
import Link from 'next/link';
import { HelpCircle, ChevronDown, Clock, CalendarCheck, Plane, Wallet, Users, Bot, Mail, BookOpen } from 'lucide-react';
import PageBanner from '@/components/PageBanner';

const FAQS = [
  { q: 'How do I check in / check out?', a: 'Press the "CHECK IN" button in the top bar. A timer starts and tracks your 8 hours of office time. Pressing it again checks you out. Multiple sessions are supported — you can check back in after lunch.' },
  { q: 'How do I apply for leave?', a: 'Go to Leave tracker → My leaves → "Apply leave". Fill in the type, dates and reason, then submit. Your HR/manager gets a notification, and you receive an alert once it is approved.' },
  { q: 'Where can I see my shift / roster?', a: 'Go to Attendance tracker → My shift. The monthly calendar shows each day\u2019s shift timing and your weekly off (Day off).' },
  { q: 'How do I pull reports?', a: 'Open the Reports section — My Check-in/Check-out, Entry/Exit and My leave summary are available. Change the month to view data for a different period.' },
  { q: 'Where is my full profile?', a: 'Top-right avatar → My Profile, then "View full details". You\u2019ll find Primary information, Work information and the other sections there.' },
  { q: 'How do I add a new employee? (HR/Admin)', a: 'Go to Employees → "Add employee". Fill in the Basic, Personal and Work details. Adding an email automatically creates a login — leave the password blank and a strong one is generated and shown to you once, right after you save.' },
  { q: 'How do I change my password?', a: 'Your first login uses the default password. You can reset your password from Settings or through your account provider. HR can also set a temporary password for you.' },
];

const GUIDE = [
  { icon: Clock, label: 'Time tracker', href: '/timesheet', note: 'Apne kaam ke ghante log karein' },
  { icon: CalendarCheck, label: 'Attendance', href: '/attendance', note: 'Daily attendance & shift' },
  { icon: Plane, label: 'Leave tracker', href: '/leaves', note: 'Leaves, holidays, rollover, comp-off' },
  { icon: Wallet, label: 'Payroll', href: '/payroll', note: 'Salary, expenses & assets' },
  { icon: Users, label: 'Employees', href: '/employees', note: 'Directory & org chart' },
  { icon: Bot, label: 'AI Assistant', href: '/assistant', note: 'Ask questions, get help' },
];

function Faq({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b last:border-0 dark:border-slate-700">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 py-3.5 text-left text-sm font-medium">
        {q}<ChevronDown size={16} className={`shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="pb-4 text-sm leading-relaxed text-slate-500">{a}</p>}
    </div>
  );
}

export default function HelpPage() {
  return (
    <>
      <PageBanner icon={HelpCircle} title="Help & Support" />
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="card p-5">
          <div className="mb-1 flex items-center gap-2 text-base font-semibold"><BookOpen size={18} className="text-sky-500" /> Frequently asked questions</div>
          <div className="divide-y dark:divide-slate-700">
            {FAQS.map((f, i) => <Faq key={i} {...f} />)}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <div className="mb-3 text-sm font-semibold">Quick start</div>
            <div className="space-y-2">
              {GUIDE.map((g) => {
                const Icon = g.icon;
                return (
                  <Link key={g.label} href={g.href} className="flex items-center gap-3 rounded-lg border p-2.5 transition hover:border-sky-300 hover:bg-sky-50/50 dark:border-slate-700 dark:hover:bg-slate-800/50">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-950/40"><Icon size={16} /></span>
                    <span className="min-w-0"><span className="block text-sm font-medium">{g.label}</span><span className="block truncate text-xs text-slate-400">{g.note}</span></span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="card p-5">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Mail size={16} className="text-sky-500" /> Need more help?</div>
            <p className="text-sm text-slate-500">Reach out to your HR or admin through the Inbox, or ask the AI Assistant.</p>
            <Link href="/assistant" className="btn-primary mt-3 inline-flex w-full justify-center">Ask AI Assistant</Link>
          </div>
        </div>
      </div>
    </>
  );
}

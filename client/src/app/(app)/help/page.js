'use client';
import { useState } from 'react';
import Link from 'next/link';
import { HelpCircle, ChevronDown, Clock, CalendarCheck, Plane, Wallet, Users, Bot, Mail, BookOpen } from 'lucide-react';
import PageBanner from '@/components/PageBanner';

const FAQS = [
  { q: 'Main check-in / check-out kaise karun?', a: 'Top bar mein "CHECK IN" button dabaayein. Timer chaalu ho jayega aur 8 ghante ka office-time track hota hai. Dobara dabaane par CHECK OUT ho jata hai. Multiple sessions support hain — lunch ke baad wapas check-in kar sakte hain.' },
  { q: 'Leave kaise apply karun?', a: 'Leave tracker → My leaves → "Apply leave". Type, dates aur reason bhar ke submit karein. HR/Manager ko notification chala jata hai; approve hone par aapko bhi alert milta hai.' },
  { q: 'Apni shift / roster kaha dekhun?', a: 'Attendance tracker → My shift. Monthly calendar mein har din ki shift timing aur weekly off (Day off) dikhta hai.' },
  { q: 'Reports kaise nikaalun?', a: 'Reports section mein jaayein — My Check-in/Check-out, Entry/Exit aur My leave summary available hain. Month change karke data dekh sakte hain.' },
  { q: 'Apni poori profile kaha hai?', a: 'Top-right avatar → My Profile, phir "View full details". Wahan Primary information, Work information aur baaki sections hain.' },
  { q: 'Naya employee kaise add karun? (HR/Admin)', a: 'Employees → "Add employee". Basic, Personal aur Work details bharein. Email dene par login automatically ban jata hai (default password Welcome@123).' },
  { q: 'Password change kaise karun?', a: 'Pehli baar login default password se hota hai. Settings se ya aap apne account provider se password reset kar sakte hain. HR aapke liye temporary password bhi set kar sakta hai.' },
];

const GUIDE = [
  { icon: Clock, label: 'Time tracker', href: '/timesheet', note: 'Apne kaam ke ghante log karein' },
  { icon: CalendarCheck, label: 'Attendance', href: '/attendance', note: 'Daily attendance & shift' },
  { icon: Plane, label: 'Leave tracker', href: '/leaves', note: 'Leaves, holidays, rollover, comp-off' },
  { icon: Wallet, label: 'Payroll', href: '/payroll', note: 'Salary, expenses & assets' },
  { icon: Users, label: 'Employees', href: '/employees', note: 'Directory & org chart' },
  { icon: Bot, label: 'AI Assistant', href: '/assistant', note: 'Sawaal poochhein, madad lein' },
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
            <p className="text-sm text-slate-500">Apne HR ya admin se Inbox ke through sampark karein, ya AI Assistant se poochhein.</p>
            <Link href="/assistant" className="btn-primary mt-3 inline-flex w-full justify-center">Ask AI Assistant</Link>
          </div>
        </div>
      </div>
    </>
  );
}

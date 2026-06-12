'use client';
import { useEffect, useState } from 'react';
import { RefreshCw, ArrowRight, Info } from 'lucide-react';
import PageBanner from '@/components/PageBanner';
import Loader from '@/components/Loader';
import { useAuth } from '@/context/AuthContext';
import { leaves as leaveApi } from '@/lib/db';

// Simple carry-forward policy (typical): earned carries (cap 30), sick carries (cap 15), casual lapses.
const POLICY = {
  CASUAL: { label: 'Casual leave', carry: false, cap: 0, note: 'Lapses at year end' },
  SICK: { label: 'Sick leave', carry: true, cap: 15, note: 'Carries forward (max 15)' },
  EARNED: { label: 'Earned / Privilege leave', carry: true, cap: 30, note: 'Carries forward (max 30)' },
};

export default function LeaveRolloverPage() {
  const { user } = useAuth();
  const year = new Date().getFullYear();
  const [bal, setBal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let on = true;
    leaveApi.balance(user?.employee).then((b) => { if (on) setBal(b?.balances || null); }).catch(() => {}).finally(() => { if (on) setLoading(false); });
    return () => { on = false; };
  }, [user?.employee]);

  const rows = bal ? Object.entries(POLICY).map(([key, p]) => {
    const remaining = bal[key] ?? 0;
    const carried = p.carry ? Math.min(remaining, p.cap) : 0;
    return { key, ...p, remaining, carried, lapsed: remaining - carried };
  }) : [];
  const totalCarry = rows.reduce((s, r) => s + r.carried, 0);

  return (
    <>
      <PageBanner icon={RefreshCw} title="Leave rollover" />
      {loading ? <Loader /> : !bal ? (
        <div className="card px-5 py-10 text-center text-sm text-slate-500">No leave balance found for your account.</div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200">
            <Info size={18} className="mt-0.5 shrink-0" />
            <p>Year-end ({year} → {year + 1}) par unused leaves is policy ke hisaab se carry-forward hote hain. Earned & Sick aage jate hain (cap ke saath), Casual lapse ho jata hai.</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {rows.map((r) => (
              <div key={r.key} className="card p-4">
                <div className="text-sm font-semibold">{r.label}</div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <div><div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{r.remaining}</div><div className="text-xs text-slate-400">remaining {year}</div></div>
                  <ArrowRight size={18} className="text-slate-300" />
                  <div className="text-right"><div className={`text-2xl font-bold ${r.carried > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{r.carried}</div><div className="text-xs text-slate-400">carried to {year + 1}</div></div>
                </div>
                <div className="mt-3 text-xs text-slate-400">{r.note}</div>
              </div>
            ))}
          </div>

          <div className="card overflow-hidden p-0">
            <div className="border-b px-5 py-3 text-sm font-semibold dark:border-slate-700">Rollover breakdown</div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead><tr className="border-b text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-700">
                  <th className="px-5 py-2.5">Leave type</th><th className="px-5 py-2.5">Remaining</th><th className="px-5 py-2.5">Policy</th><th className="px-5 py-2.5">Carried forward</th><th className="px-5 py-2.5">Lapsing</th>
                </tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.key} className="border-b last:border-0 dark:border-slate-700">
                      <td className="px-5 py-3 font-medium">{r.label}</td>
                      <td className="px-5 py-3">{r.remaining}</td>
                      <td className="px-5 py-3 text-slate-500">{r.carry ? `Carry (max ${r.cap})` : 'Lapses'}</td>
                      <td className="px-5 py-3 font-semibold text-emerald-600">{r.carried}</td>
                      <td className="px-5 py-3 text-rose-500">{r.lapsed}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-semibold dark:bg-slate-800/40">
                    <td className="px-5 py-3" colSpan={3}>Total carrying forward to {year + 1}</td>
                    <td className="px-5 py-3 text-emerald-600">{totalCarry}</td>
                    <td className="px-5 py-3" />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

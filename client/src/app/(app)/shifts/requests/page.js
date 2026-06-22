'use client';
import { useCallback, useEffect, useState } from 'react';
import { Repeat, Check, X } from 'lucide-react';
import PageBanner from '@/components/PageBanner';
import Loader from '@/components/Loader';
import { StatusBadge } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { shiftRequests } from '@/lib/db';

function Row({ r, children }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3 last:border-0 dark:border-slate-700">
      <div className="text-sm">
        <div className="font-medium">{r.employee?.name} <span className="text-slate-400">{r.employee?.code}</span></div>
        <div className="text-slate-500">{r.currentShift || '—'} <span className="text-slate-400">→</span> <span className="font-medium">{r.requestedShift || '—'}</span>{r.reason ? <span className="text-slate-400"> · {r.reason}</span> : ''}</div>
      </div>
      {children}
    </div>
  );
}

export default function ShiftRequestsPage() {
  const { user } = useAuth();
  const canDecide = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'MANAGER'].includes(user?.role);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => { setLoading(true); try { setItems(await shiftRequests.list()); } catch { /* ignore */ } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);

  const decide = async (id, decision) => {
    setBusy(id);
    try { await shiftRequests.decide(id, decision); load(); } catch (e) { window.alert(e.message || 'Failed'); } finally { setBusy(null); }
  };

  const pending = items.filter((i) => i.status === 'PENDING');
  const done = items.filter((i) => i.status !== 'PENDING');

  return (
    <>
      <PageBanner icon={Repeat} title="Shift change requests" />
      {loading ? <Loader /> : (
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="border-b px-5 py-3 font-semibold dark:border-slate-700">Pending ({pending.length})</div>
            {pending.length === 0 ? <p className="py-10 text-center text-sm text-slate-400">No pending requests.</p> : pending.map((r) => (
              <Row key={r._id} r={r}>
                {canDecide && (
                  <div className="flex gap-2">
                    <button disabled={busy === r._id} onClick={() => decide(r._id, 'APPROVED')} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"><Check size={15} /> Approve</button>
                    <button disabled={busy === r._id} onClick={() => decide(r._id, 'REJECTED')} className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"><X size={15} /> Reject</button>
                  </div>
                )}
              </Row>
            ))}
          </div>
          {done.length > 0 && (
            <div className="card overflow-hidden">
              <div className="border-b px-5 py-3 font-semibold dark:border-slate-700">Completed</div>
              {done.map((r) => <Row key={r._id} r={r}><StatusBadge status={r.status} /></Row>)}
            </div>
          )}
        </div>
      )}
    </>
  );
}

'use client';
import { useCallback, useEffect, useState } from 'react';
import { Building2, Users, Check } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Loader from '@/components/Loader';
import Modal from '@/components/Modal';
import { EmptyState } from '@/components/ui';
import { companies as companyApi } from '@/lib/db';

const PLANS = ['FREE', 'STARTER', 'GROWTH', 'ENTERPRISE'];
const PLAN_SEATS = { FREE: 10, STARTER: 50, GROWTH: 250, ENTERPRISE: '∞' };

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setCompanies(await companyApi.list()); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <>
      <PageHeader title="Companies" subtitle="All tenants on the platform" />
      <div className="mb-4 rounded-xl bg-brand-50 px-4 py-2.5 text-sm text-brand-700 dark:bg-brand-950/50 dark:text-brand-200">
        As Super Admin, row-level security gives you read access across every tenant automatically — no impersonation needed.
      </div>

      {loading ? <Loader /> : companies.length === 0 ? (
        <EmptyState icon={Building2} title="No companies yet" hint="Tenants will appear here once they register." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((c) => (
            <div key={c._id} className="card p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-600 text-sm font-bold text-white">{c.name?.[0]}</div>
                  <div>
                    <div className="font-semibold leading-tight">{c.name}</div>
                    <div className="text-xs text-slate-400">{c.slug}</div>
                  </div>
                </div>
                {!c.isActive && <span className="badge bg-rose-50 text-rose-600">Inactive</span>}
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-slate-500"><Users size={15} /> {c.employeeCount} employees</span>
                <span className="badge bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">{c.subscription?.plan || 'FREE'}</span>
              </div>
              <div className="mt-4">
                <button className="btn-outline w-full text-xs" onClick={() => setEditing(c)}>Manage plan</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <PlanModal company={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </>
  );
}

function PlanModal({ company, onClose, onSaved }) {
  const [plan, setPlan] = useState(company.subscription?.plan || 'FREE');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try { await companyApi.setPlan(company._id, plan); onSaved(); }
    catch (e) { alert(e.message || 'Could not update'); }
    finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={`${company.name} — subscription`}
      footer={<><button className="btn-outline" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Update plan'}</button></>}>
      <div className="space-y-2">
        {PLANS.map((p) => (
          <button key={p} onClick={() => setPlan(p)}
            className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${plan === p ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
            <div><div className="font-medium">{p}</div><div className="text-xs text-slate-400">Up to {PLAN_SEATS[p]} employees</div></div>
            {plan === p && <Check size={18} className="text-brand-600" />}
          </button>
        ))}
      </div>
    </Modal>
  );
}

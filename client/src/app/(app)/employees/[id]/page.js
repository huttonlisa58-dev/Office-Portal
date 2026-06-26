'use client';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Loader from '@/components/Loader';
import EmployeeProfile from '@/components/EmployeeProfile';
import ProfileDetails from '@/components/ProfileDetails';
import EditEmployeeModal from '@/components/EditEmployeeModal';
import { useAuth } from '@/context/AuthContext';
import { employees as empApi } from '@/lib/db';

export default function EmployeeProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const canEditRole = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR'].includes(user?.role);

  const [data, setData] = useState(null);
  const [basicOnly, setBasicOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true); setErr('');
    // Full profile (all sections) — allowed for self, managers, HR/admin.
    try {
      const full = await empApi.fullProfile(id);
      if (full && full.primary) { setData(full); setBasicOnly(false); setLoading(false); return; }
    } catch { /* not authorized for full view — fall back to basic */ }
    // Basic, non-sensitive profile — any colleague in the same company can view.
    try {
      const basic = await empApi.basicProfile(id);
      if (basic && basic.primary) { setData(basic); setBasicOnly(true); }
      else setErr('Profile not found.');
    } catch (e) { setErr(e.message || 'Could not load this profile.'); }
    setLoading(false);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <Loader />;
  if (err || !data) {
    return (
      <div className="space-y-4">
        <button onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"><ArrowLeft size={16} /> Back</button>
        <div className="card px-5 py-10 text-center text-sm text-slate-500">{err || 'Profile not found.'}</div>
      </div>
    );
  }

  const p = data.primary || {};
  const editEmp = { _id: p.id, firstName: p.first_name, lastName: p.last_name, email: p.email };
  const canEdit = canEditRole && !basicOnly;
  const isSelf = id === user?.employee;
  const canEditDetails = (canEditRole || isSelf) && !basicOnly;

  return (
    <div className="space-y-4">
      <button onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"><ArrowLeft size={16} /> Back to employees</button>
      <EmployeeProfile data={data} compact={basicOnly} canEdit={canEdit} onEdit={() => setEditing(editEmp)} />
      {!basicOnly && (
        <div className="space-y-2">
          <h2 className="px-1 text-sm font-semibold text-slate-500">Personal details</h2>
          <ProfileDetails employeeId={p.id} companyId={user?.company} canEdit={canEditDetails} />
        </div>
      )}
      {canEdit && <EditEmployeeModal emp={editing} onClose={() => setEditing(null)} onDone={load} />}
    </div>
  );
}

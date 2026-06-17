'use client';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Loader from '@/components/Loader';
import EmployeeProfile from '@/components/EmployeeProfile';
import EditEmployeeModal from '@/components/EditEmployeeModal';
import { useAuth } from '@/context/AuthContext';
import { employees as empApi } from '@/lib/db';

export default function EmployeeProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const canEdit = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR'].includes(user?.role);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true); setErr('');
    try { setData(await empApi.fullProfile(id)); }
    catch (e) { setErr(e.message || 'Could not load this profile.'); }
    finally { setLoading(false); }
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

  return (
    <div className="space-y-4">
      <button onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"><ArrowLeft size={16} /> Back to employees</button>
      <EmployeeProfile data={data} canEdit={canEdit} onEdit={() => setEditing(editEmp)} />
      {canEdit && <EditEmployeeModal emp={editing} onClose={() => setEditing(null)} onDone={load} />}
    </div>
  );
}

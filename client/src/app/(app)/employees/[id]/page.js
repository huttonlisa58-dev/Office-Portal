'use client';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Loader from '@/components/Loader';
import EmployeeProfile from '@/components/EmployeeProfile';
import EditEmployeeModal from '@/components/EditEmployeeModal';
import { useAuth } from '@/context/AuthContext';
import { employees as empApi } from '@/lib/db';

// Adapt employees.getOne() output to the EmployeeProfile (RPC) data shape.
function toBasicProfile(e) {
  return {
    primary: {
      id: e._id, employee_code: e.employeeId,
      first_name: e.firstName, middle_name: e.middleName, last_name: e.lastName, nick_name: e.nickName,
      gender: e.gender, dob: e.dob, blood_group: e.bloodGroup, marital_status: e.maritalStatus, smoker: e.smoker,
      email: e.email, phone: e.phone, address: e.address, status: e.status,
    },
    work: {
      designation: e.designation?.title, department: e.department?.name, manager: e.manager?.name,
      work_location: e.location, date_of_joining: e.dateOfJoining, employment_type: e.employmentType,
    },
  };
}

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
    try {
      // Full profile (all sections) — allowed for self, managers, HR/admin.
      const full = await empApi.fullProfile(id);
      setData(full); setBasicOnly(false);
    } catch {
      // Colleagues can still see basic info (same-company read is permitted).
      try {
        const e = await empApi.getOne(id);
        if (!e) setErr('Profile not found.');
        else { setData(toBasicProfile(e)); setBasicOnly(true); }
      } catch (e2) { setErr(e2.message || 'Could not load this profile.'); }
    } finally { setLoading(false); }
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

  return (
    <div className="space-y-4">
      <button onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"><ArrowLeft size={16} /> Back to employees</button>
      <EmployeeProfile data={data} canEdit={canEdit} onEdit={() => setEditing(editEmp)} />
      {canEdit && <EditEmployeeModal emp={editing} onClose={() => setEditing(null)} onDone={load} />}
    </div>
  );
}

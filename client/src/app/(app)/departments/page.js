'use client';
import { Building2 } from 'lucide-react';
import OrgCrud from '@/components/OrgCrud';
import { org } from '@/lib/db';

export default function DepartmentsPage() {
  return (
    <OrgCrud
      icon={Building2}
      title="Departments"
      singular="department"
      valueLabel="Department name"
      api={{ field: 'name', list: org.departments, add: org.addDepartment, update: org.updDepartment, del: org.delDepartment }}
    />
  );
}

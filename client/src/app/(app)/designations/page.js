'use client';
import { BadgeCheck } from 'lucide-react';
import OrgCrud from '@/components/OrgCrud';
import { org } from '@/lib/db';

export default function DesignationsPage() {
  return (
    <OrgCrud
      icon={BadgeCheck}
      title="Designations"
      singular="designation"
      valueLabel="Designation title"
      secondary={{ field: 'level', label: 'Level (optional)', colLabel: 'Level', type: 'number', placeholder: 'e.g. 1 (seniority)' }}
      api={{ field: 'title', list: org.designations, add: org.addDesignation, update: org.updDesignation, del: org.delDesignation }}
    />
  );
}

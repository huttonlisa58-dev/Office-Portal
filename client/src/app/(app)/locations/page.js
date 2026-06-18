'use client';
import { MapPin } from 'lucide-react';
import OrgCrud from '@/components/OrgCrud';
import { org } from '@/lib/db';

export default function OfficeLocationsPage() {
  return (
    <OrgCrud
      icon={MapPin}
      title="Office Locations"
      singular="location"
      valueLabel="Location name"
      secondary={{ field: 'address', label: 'Address (optional)', colLabel: 'Address', type: 'text', placeholder: 'e.g. 2nd floor, Connaught Place, New Delhi' }}
      api={{ field: 'name', list: org.officeLocations, add: org.addOfficeLocation, update: org.updOfficeLocation, del: org.delOfficeLocation }}
    />
  );
}

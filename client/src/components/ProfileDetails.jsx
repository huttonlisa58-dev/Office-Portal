'use client';
import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Users2, Phone, GraduationCap, Briefcase, Car, Plane, Share2 } from 'lucide-react';
import Modal from '@/components/Modal';
import Loader from '@/components/Loader';
import { profileDetails as api } from '@/lib/db';

// Section config: table, label, icon, fields [{ key, label, type, required }]
const SECTIONS = [
  { table: 'dependents', label: 'Dependents', icon: Users2, fields: [
    { key: 'name', label: 'Name', required: true }, { key: 'relationship', label: 'Relationship' },
    { key: 'gender', label: 'Gender', type: 'select', options: ['', 'Male', 'Female', 'Other'] }, { key: 'dob', label: 'Date of birth', type: 'date' },
  ], summary: (r) => [r.name, r.relationship, r.dob].filter(Boolean).join(' · ') },
  { table: 'emergency_contacts', label: 'Emergency contacts', icon: Phone, fields: [
    { key: 'name', label: 'Name', required: true }, { key: 'relationship', label: 'Relationship' },
    { key: 'phone', label: 'Phone', required: true }, { key: 'alt_phone', label: 'Alternate phone' }, { key: 'address', label: 'Address', type: 'textarea' },
  ], summary: (r) => [r.name, r.relationship, r.phone].filter(Boolean).join(' · ') },
  { table: 'employee_education', label: 'Education', icon: GraduationCap, fields: [
    { key: 'degree', label: 'Degree', required: true }, { key: 'field', label: 'Field of study' }, { key: 'institution', label: 'Institution' },
    { key: 'start_year', label: 'Start year', type: 'number' }, { key: 'end_year', label: 'End year', type: 'number' }, { key: 'grade', label: 'Grade' },
  ], summary: (r) => [r.degree, r.institution, [r.start_year, r.end_year].filter(Boolean).join('–')].filter(Boolean).join(' · ') },
  { table: 'employee_experience', label: 'Experience', icon: Briefcase, fields: [
    { key: 'company_name', label: 'Company', required: true }, { key: 'designation', label: 'Designation' },
    { key: 'from_date', label: 'From', type: 'date' }, { key: 'to_date', label: 'To', type: 'date' }, { key: 'description', label: 'Description', type: 'textarea' },
  ], summary: (r) => [r.designation, r.company_name].filter(Boolean).join(' @ ') },
  { table: 'vehicle_details', label: 'Vehicles', icon: Car, fields: [
    { key: 'vehicle_type', label: 'Type' }, { key: 'make_model', label: 'Make / model' }, { key: 'registration_number', label: 'Registration no.', required: true }, { key: 'color', label: 'Colour' },
  ], summary: (r) => [r.make_model, r.registration_number].filter(Boolean).join(' · ') },
  { table: 'visa_details', label: 'Visa & passport', icon: Plane, fields: [
    { key: 'visa_type', label: 'Visa type' }, { key: 'issuing_country', label: 'Issuing country' }, { key: 'visa_number', label: 'Visa number' },
    { key: 'passport_number', label: 'Passport number' }, { key: 'issued_date', label: 'Issued', type: 'date' }, { key: 'expiry_date', label: 'Expiry', type: 'date' },
  ], summary: (r) => [r.visa_type, r.issuing_country, r.expiry_date ? `exp ${r.expiry_date}` : null].filter(Boolean).join(' · ') },
  { table: 'social_media', label: 'Social media', icon: Share2, fields: [
    { key: 'platform', label: 'Platform', required: true }, { key: 'handle', label: 'Handle' }, { key: 'url', label: 'URL' },
  ], summary: (r) => [r.platform, r.handle].filter(Boolean).join(' · ') },
];

export default function ProfileDetails({ employeeId, companyId, canEdit }) {
  const [data, setData] = useState(null);
  const [modal, setModal] = useState(null); // { section }

  const load = useCallback(async () => { if (!employeeId) return; try { setData(await api.all(employeeId)); } catch { setData({}); } }, [employeeId]);
  useEffect(() => { load(); }, [load]);

  const del = async (section, id) => {
    if (!window.confirm('Delete this record?')) return;
    try { await api.remove(section.table, id); load(); } catch (e) { window.alert(e.message); }
  };

  if (data === null) return <Loader />;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {SECTIONS.map((s) => {
        const rows = data[s.table] || [];
        const Icon = s.icon;
        return (
          <div key={s.table} className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold"><Icon size={16} className="text-sky-500" /> {s.label}</div>
              {canEdit && <button className="btn-ghost p-1.5 text-sky-600" title={`Add ${s.label}`} onClick={() => setModal({ section: s })}><Plus size={16} /></button>}
            </div>
            {rows.length === 0 ? <p className="text-sm text-slate-400">No records.</p> : (
              <ul className="space-y-1.5">
                {rows.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/60">
                    <span className="truncate">{s.summary(r) || '—'}</span>
                    {canEdit && <button className="btn-ghost p-1 text-rose-400 shrink-0" onClick={() => del(s, r.id)}><Trash2 size={13} /></button>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
      {modal && <AddModal section={modal.section} employeeId={employeeId} companyId={companyId} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />}
    </div>
  );
}

function AddModal({ section, employeeId, companyId, onClose, onDone }) {
  const [form, setForm] = useState({});
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const save = async () => {
    for (const f of section.fields) if (f.required && !form[f.key]) { setErr(`${f.label} is required.`); return; }
    setBusy(true); setErr('');
    const row = { company_id: companyId, employee_id: employeeId };
    section.fields.forEach((f) => { row[f.key] = form[f.key] === '' || form[f.key] === undefined ? null : (f.type === 'number' ? Number(form[f.key]) : form[f.key]); });
    try { await api.add(section.table, row); onDone(); }
    catch (e) { setErr(e.message || 'Could not save'); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={`Add ${section.label}`}
      footer={<><button className="btn-outline" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></>}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {err && <div className="sm:col-span-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-950/40">{err}</div>}
        {section.fields.map((f) => (
          <div key={f.key} className={f.type === 'textarea' ? 'sm:col-span-2' : ''}>
            <label className="label">{f.label}{f.required && ' *'}</label>
            {f.type === 'textarea' ? <textarea className="input" rows={2} value={form[f.key] || ''} onChange={set(f.key)} />
              : f.type === 'select' ? <select className="input" value={form[f.key] || ''} onChange={set(f.key)}>{f.options.map((o) => <option key={o} value={o}>{o || '—'}</option>)}</select>
              : <input type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'} className="input" value={form[f.key] || ''} onChange={set(f.key)} />}
          </div>
        ))}
      </div>
    </Modal>
  );
}

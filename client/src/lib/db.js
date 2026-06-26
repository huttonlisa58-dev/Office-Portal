import { supabase } from './supabaseClient';

// ---------- mappers (DB snake_case -> UI shapes) ----------
const mEmp = (r) => r && ({
  _id: r.id, employeeId: r.employee_code, firstName: r.first_name, lastName: r.last_name,
  email: r.email, phone: r.phone, status: r.status,
  location: r.location || null, employmentType: r.employment_type || null,
  departmentId: r.department_id || null, designationId: r.designation_id || null,
  department: r.department ? { name: r.department.name } : null,
  designation: r.designation ? { title: r.designation.title } : null,
  role: Array.isArray(r.account) ? (r.account[0]?.role || null) : (r.account?.role || null),
});
const mEmpRef = (r) => r && ({ _id: r.id, firstName: r.first_name, lastName: r.last_name, employeeId: r.employee_code });
const mLeave = (r) => ({ _id: r.id, type: r.leave_type, from: r.from_date, to: r.to_date, days: r.days, reason: r.reason, status: r.status, appliedOn: r.created_at, decisionNote: r.decision_note, decidedAt: r.decided_at || null, decidedBy: r.decider ? `${r.decider.first_name} ${r.decider.last_name}`.trim() : null, employee: r.employee ? { ...mEmpRef(r.employee), location: r.employee.location || null, designation: r.employee.designation?.title || null } : null });
const mAtt = (r) => ({ _id: r.id, date: r.work_date, status: r.status, isLate: r.is_late, workedMinutes: r.worked_minutes, overtimeMinutes: r.overtime_minutes, checkIn: r.check_in_at ? { time: r.check_in_at, method: r.check_in_method } : null, checkOut: r.check_out_at ? { time: r.check_out_at } : null, employee: mEmpRef(r.employee) });
const mPay = (r) => ({ _id: r.id, month: r.month, year: r.year, currency: r.currency, basic: r.basic, gross: r.gross, tax: r.tax, tds: r.tds, bonus: r.bonus, lopDays: r.lop_days, allowances: r.allowances || [], deductions: r.deductions || [], netPay: r.net_pay, status: r.status, employee: mEmpRef(r.employee) });
const mCompany = (r) => ({ _id: r.id, name: r.name, slug: r.slug, isActive: r.is_active, createdAt: r.created_at, subscription: { plan: r.plan } });

async function invoke(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    // surface the function's JSON error message if present
    let msg = error.message;
    try { const ctx = await error.context?.json?.(); if (ctx?.error) msg = ctx.error; } catch { /* ignore */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

// ---------- profile / company ----------
export async function getMe() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  let company = null;
  let employeeCode = null;
  if (profile?.employee_id) {
    const { data: emp } = await supabase.from('employees').select('employee_code').eq('id', profile.employee_id).maybeSingle();
    employeeCode = emp?.employee_code || null;
  }
  if (profile?.company_id) {
    const { data: c } = await supabase.from('companies').select('*').eq('id', profile.company_id).single();
    company = c && { ...mCompany(c), logo: c.logo || null, timezone: c.timezone, workSettings: { workdayStart: c.workday_start, lateAfterMinutes: c.late_after_minutes, fullDayHours: c.full_day_hours } };
  }
  return {
    user: { id: user.id, name: profile?.full_name, email: profile?.email, role: profile?.role, employee: profile?.employee_id, employeeCode, company: profile?.company_id },
    company,
    profile,
  };
}

// ---------- dashboard ----------
function todayInTz(tz = 'UTC') {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
export async function getDashboard(profile, company) {
  if (profile?.role === 'SUPER_ADMIN') {
    const [{ count: totalCompanies }, { count: totalEmployees }, { count: totalUsers }, { data: companies }] = await Promise.all([
      supabase.from('companies').select('*', { count: 'exact', head: true }),
      supabase.from('employees').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('companies').select('*').order('created_at', { ascending: false }).limit(8),
    ]);
    const plan = {};
    (companies || []).forEach((c) => { plan[c.plan] = (plan[c.plan] || 0) + 1; });
    return {
      scope: 'PLATFORM',
      widgets: { totalCompanies: totalCompanies || 0, totalEmployees: totalEmployees || 0, totalUsers: totalUsers || 0 },
      planDistribution: Object.entries(plan).map(([p, count]) => ({ plan: p, count })),
      recentCompanies: (companies || []).map((c) => ({ _id: c.id, name: c.name, slug: c.slug, createdAt: c.created_at, subscription: { plan: c.plan } })),
    };
  }
  const cid = profile.company_id;
  const date = todayInTz(company?.timezone || 'Asia/Kolkata');
  const [{ count: totalEmployees }, { data: today }, { count: pendingLeaves }] = await Promise.all([
    supabase.from('employees').select('*', { count: 'exact', head: true }).eq('company_id', cid).eq('status', 'ACTIVE'),
    supabase.from('attendance').select('*').eq('company_id', cid).eq('work_date', date),
    supabase.from('leaves').select('*', { count: 'exact', head: true }).eq('company_id', cid).eq('status', 'PENDING'),
  ]);
  const present = (today || []).filter((r) => r.check_in_at).length;
  const late = (today || []).filter((r) => r.is_late).length;
  const now = new Date();
  // present-today also counts the check-in/out punch system — use the same company-day as attendance
  const { data: punchRows } = await supabase.from('attendance_punches').select('employee_id').eq('company_id', cid).eq('work_date', date);
  const presentSet = new Set();
  (today || []).forEach((r) => { if (r.check_in_at) presentSet.add(r.employee_id); });
  (punchRows || []).forEach((r) => presentSet.add(r.employee_id));
  const presentCount = presentSet.size || present;
  const { data: pr } = await supabase.from('payrolls').select('net_pay').eq('company_id', cid).eq('month', now.getMonth() + 1).eq('year', now.getFullYear());
  const payrollThisMonth = (pr || []).reduce((s, x) => s + Number(x.net_pay), 0);
  const { count: departmentsCount } = await supabase.from('departments').select('*', { count: 'exact', head: true }).eq('company_id', cid);
  // 7-day trend
  const days = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d.toISOString().slice(0, 10); });
  const { data: trendRows } = await supabase.from('attendance').select('work_date,check_in_at,is_late').eq('company_id', cid).in('work_date', days);
  const trendMap = {};
  (trendRows || []).forEach((r) => { const k = r.work_date; trendMap[k] = trendMap[k] || { present: 0, late: 0 }; if (r.check_in_at) trendMap[k].present++; if (r.is_late) trendMap[k].late++; });
  const attendanceTrend = days.map((d) => ({ _id: d, present: trendMap[d]?.present || 0, late: trendMap[d]?.late || 0 }));
  return {
    scope: 'COMPANY',
    widgets: {
      totalEmployees: totalEmployees || 0, presentToday: presentCount, lateToday: late,
      absentToday: Math.max(0, (totalEmployees || 0) - presentCount), pendingLeaves: pendingLeaves || 0,
      payrollThisMonth, payrollRunCount: (pr || []).length, departmentsCount: departmentsCount || 0,
    },
    attendanceTrend, departmentHeadcount: [],
  };
}

// ---------- employees ----------
export const employees = {
  async list({ q = '', page = 1, limit = 10 } = {}) {
    let query = supabase.from('employees')
      .select('*, department:departments(name), designation:designations(title), account:profiles!fk_profiles_employee(role)', { count: 'exact' })
      .order('created_at', { ascending: false });
    if (q) query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,employee_code.ilike.%${q}%,email.ilike.%${q}%`);
    const from = (page - 1) * limit;
    query = query.range(from, from + limit - 1);
    const { data, count } = await query;
    return { items: (data || []).map(mEmp), total: count || 0, page, pages: Math.max(1, Math.ceil((count || 0) / limit)) };
  },
  create: (payload) => invoke('create-employee', payload),
  updateLogin: (payload) => invoke('update-employee-login', payload),
  async fullProfile(id) {
    if (!id) return null;
    const { data, error } = await supabase.rpc('employee_full_profile', { p_id: id });
    if (error) throw new Error(error.message);
    return data;
  },
  async basicProfile(id) {
    if (!id) return null;
    const { data, error } = await supabase.rpc('employee_basic_profile', { p_id: id });
    if (error) throw new Error(error.message);
    return data;
  },
  async getOne(id) {
    if (!id) return null;
    const { data } = await supabase.from('employees')
      .select('*, department:departments(name), designation:designations(title), manager:employees!employees_manager_id_fkey(first_name,last_name,employee_code)')
      .eq('id', id).maybeSingle();
    if (!data) return null;
    return {
      ...mEmp(data),
      dob: data.dob || null, gender: data.gender || null, address: data.address || null,
      dateOfJoining: data.date_of_joining || null,
      middleName: data.middle_name || null, nickName: data.nick_name || null,
      bloodGroup: data.blood_group || null, maritalStatus: data.marital_status || null,
      smoker: data.smoker || false,
      shiftId: data.shift_id || null, weeklyOff: data.weekly_off ?? null,
      manager: data.manager ? { name: `${data.manager.first_name} ${data.manager.last_name || ''}`.trim(), code: data.manager.employee_code } : null,
    };
  },
  async update(id, patch) {
    const { data, error } = await supabase.from('employees').update(patch).eq('id', id)
      .select('*, department:departments(name), designation:designations(title)').single();
    if (error) throw new Error(error.message);
    return mEmp(data);
  },
  async orgData() {
    const { data } = await supabase.from('employees')
      .select('*, department:departments(name), designation:designations(title)')
      .eq('status', 'ACTIVE').order('employee_code');
    return (data || []).map((r) => ({ ...mEmp(r), managerId: r.manager_id || null }));
  },
  all: async () => {
    const { data } = await supabase.from('employees').select('id,first_name,last_name,employee_code').order('first_name');
    return (data || []).map(mEmpRef);
  },
};

// ---------- org ----------
export const org = {
  departments: async () => { const { data } = await supabase.from('departments').select('*').order('name'); return (data || []).map((d) => ({ _id: d.id, name: d.name, createdAt: d.created_at })); },
  designations: async () => { const { data } = await supabase.from('designations').select('*').order('level', { nullsFirst: true }).order('title'); return (data || []).map((d) => ({ _id: d.id, title: d.title, level: d.level, createdAt: d.created_at })); },
  addDepartment: async (company_id, name) => { const { error } = await supabase.from('departments').insert({ company_id, name }); if (error) throw new Error(error.message); },
  updDepartment: async (id, name) => { const { error } = await supabase.from('departments').update({ name }).eq('id', id); if (error) throw new Error(error.message); },
  delDepartment: async (id) => { const { error } = await supabase.from('departments').delete().eq('id', id); if (error) throw new Error(error.message); },
  addDesignation: async (company_id, title, level) => { const { error } = await supabase.from('designations').insert({ company_id, title, level: level ?? null }); if (error) throw new Error(error.message); },
  updDesignation: async (id, title, level) => { const { error } = await supabase.from('designations').update({ title, level: level ?? null }).eq('id', id); if (error) throw new Error(error.message); },
  delDesignation: async (id) => { const { error } = await supabase.from('designations').delete().eq('id', id); if (error) throw new Error(error.message); },
  officeLocations: async () => { const { data } = await supabase.from('office_locations').select('*').order('name'); return (data || []).map((o) => ({ _id: o.id, name: o.name, address: o.address, isActive: o.is_active })); },
  addOfficeLocation: async (company_id, name, address) => { const { error } = await supabase.from('office_locations').insert({ company_id, name, address: address || null, is_active: true }); if (error) throw new Error(error.message); },
  updOfficeLocation: async (id, name, address) => { const { error } = await supabase.from('office_locations').update({ name, address: address || null }).eq('id', id); if (error) throw new Error(error.message); },
  delOfficeLocation: async (id) => { const { error } = await supabase.from('office_locations').delete().eq('id', id); if (error) throw new Error(error.message); },
};

// ---------- attendance ----------
export const attendance = {
  punch: (action, extra = {}) => invoke('attendance-punch', { action, ...extra }),
  async myToday(employeeId, tz = 'UTC') {
    if (!employeeId) return null;
    const date = todayInTz(tz);
    const { data } = await supabase.from('attendance').select('*').eq('employee_id', employeeId).eq('work_date', date).maybeSingle();
    if (!data) return null;
    return { id: data.id, checkInAt: data.check_in_at, checkOutAt: data.check_out_at, status: data.status, workedMinutes: data.worked_minutes };
  },
  async month(year, monthIndex, viewer = {}) {
    const start = new Date(Date.UTC(year, monthIndex, 1)).toISOString().slice(0, 10);
    const end = new Date(Date.UTC(year, monthIndex + 1, 0)).toISOString().slice(0, 10);
    return this.range(start, end, viewer);
  },
  async range(start, end, viewer = {}) {
    const [emps, att, lv, hol, punches] = await Promise.all([
      supabase.from('employees').select('id,first_name,last_name,employee_code,manager_id').eq('status', 'ACTIVE').order('employee_code'),
      supabase.from('attendance').select('employee_id,work_date,status').gte('work_date', start).lte('work_date', end),
      supabase.from('leaves').select('employee_id,from_date,to_date,leave_type').eq('status', 'APPROVED').lte('from_date', end).gte('to_date', start),
      supabase.from('holidays').select('date,name').gte('date', start).lte('date', end),
      supabase.from('attendance_punches').select('employee_id,work_date').gte('work_date', start).lte('work_date', end),
    ]);
    const allEmps = emps.data || [];

    // Role-based scope: HR / company admin / super admin see everyone.
    // A manager sees their own team — themselves + everyone below them in the
    // reporting tree (so a top/"general" manager naturally sees all, a team lead just their branch).
    const role = viewer.role;
    const seesAll = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR'].includes(role);
    let allowed = null; // null => no restriction
    if (!seesAll && role === 'MANAGER' && viewer.employeeId) {
      const childrenBy = {};
      allEmps.forEach((e) => { if (e.manager_id) (childrenBy[e.manager_id] = childrenBy[e.manager_id] || []).push(e.id); });
      const set = new Set([viewer.employeeId]);
      const stack = [viewer.employeeId];
      while (stack.length) { const cur = stack.pop(); (childrenBy[cur] || []).forEach((cid) => { if (!set.has(cid)) { set.add(cid); stack.push(cid); } }); }
      allowed = set;
    } else if (!seesAll && viewer.employeeId) {
      allowed = new Set([viewer.employeeId]);
    }
    const inScope = (id) => allowed === null || allowed.has(id);

    const scopedEmps = allEmps.filter((e) => inScope(e.id));
    const attRows = (att.data || []).filter((a) => inScope(a.employee_id));
    const lvRows = (lv.data || []).filter((l) => inScope(l.employee_id));

    // Mark days with a punch as PRESENT (new check-in/out system), merging with legacy attendance rows
    const existing = new Set(attRows.map((a) => `${a.employee_id}|${a.work_date}`));
    const seen = new Set();
    const punchPresent = [];
    (punches.data || []).forEach((p) => {
      if (!inScope(p.employee_id)) return;
      const key = `${p.employee_id}|${p.work_date}`;
      if (!existing.has(key) && !seen.has(key)) { seen.add(key); punchPresent.push({ employee_id: p.employee_id, work_date: p.work_date, status: 'PRESENT' }); }
    });
    return {
      start, end,
      employees: scopedEmps.map((e) => ({ id: e.id, name: `${e.first_name} ${e.last_name || ''}`.trim(), code: e.employee_code })),
      attendance: [...attRows, ...punchPresent], leaves: lvRows, holidays: hol.data || [],
    };
  },
  async mine(employeeId, year, monthIndex) {
    const start = new Date(Date.UTC(year, monthIndex, 1)).toISOString().slice(0, 10);
    const end = new Date(Date.UTC(year, monthIndex + 1, 0)).toISOString().slice(0, 10);
    const [att, hol] = await Promise.all([
      supabase.from('attendance').select('*').eq('employee_id', employeeId).gte('work_date', start).lte('work_date', end).order('work_date'),
      supabase.from('holidays').select('date').gte('date', start).lte('date', end),
    ]);
    return { start, end, rows: (att.data || []).map(mAtt), holidays: (hol.data || []).map((h) => h.date) };
  },
  async today(companyId) {
    const date = todayInTz('Asia/Kolkata');
    let q = supabase.from('attendance').select('*, employee:employees(first_name,last_name,employee_code)').eq('work_date', date);
    if (companyId) q = q.eq('company_id', companyId);
    const { data } = await q;
    const records = (data || []).map(mAtt);
    const present = records.filter((r) => r.checkIn).length;
    const late = records.filter((r) => r.isLate).length;
    let ce = supabase.from('employees').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE');
    if (companyId) ce = ce.eq('company_id', companyId);
    const { count } = await ce;
    return { date, present, late, absent: Math.max(0, (count || 0) - present), totalEmployees: count || 0, records };
  },
  async list({ from } = {}) {
    let q = supabase.from('attendance').select('*, employee:employees(first_name,last_name,employee_code)').order('work_date', { ascending: false }).limit(200);
    if (from) q = q.gte('work_date', from);
    const { data } = await q;
    return (data || []).map(mAtt);
  },
};

// ---------- leaves ----------
export const leaves = {
  async list() {
    const { data } = await supabase.from('leaves').select('*, employee:employees!leaves_employee_id_fkey(first_name,last_name,employee_code,location,designation:designations(title)), decider:employees!leaves_approver_id_fkey(first_name,last_name,employee_code)').order('created_at', { ascending: false });
    return (data || []).map(mLeave);
  },
  async mine(employeeId) {
    if (!employeeId) return [];
    const { data } = await supabase.from('leaves')
      .select('*, employee:employees!leaves_employee_id_fkey(first_name,last_name,employee_code,location,designation:designations(title)), decider:employees!leaves_approver_id_fkey(first_name,last_name,employee_code)')
      .eq('employee_id', employeeId).order('created_at', { ascending: false });
    return (data || []).map(mLeave);
  },
  async balance(employeeId) {
    const year = new Date().getFullYear();
    let q = supabase.from('leave_balances').select('*').eq('year', year);
    if (employeeId) q = q.eq('employee_id', employeeId);
    const { data } = await q.maybeSingle();
    return data ? { balances: { CASUAL: data.casual, SICK: data.sick, EARNED: data.earned, COMPOFF: data.compoff || 0 } } : null;
  },
  async apply({ company_id, employee_id, type, from, to, reason }) {
    const days = Math.floor((new Date(to).setHours(0, 0, 0, 0) - new Date(from).setHours(0, 0, 0, 0)) / 86400000) + 1;
    const { error } = await supabase.from('leaves').insert({ company_id, employee_id, leave_type: type, from_date: from, to_date: to, days, reason });
    if (error) throw new Error(error.message);
  },
  decide: (leave_id, decision) => invoke('leave-decision', { leave_id, decision }),
  async approvers(leaveId) {
    if (!leaveId) return [];
    const { data, error } = await supabase.rpc('leave_approvers', { p_leave_id: leaveId });
    if (error) return [];
    return data || [];
  },
  async runAccrual(asOf) {
    const { data, error } = await supabase.rpc('run_company_leave_accrual', asOf ? { p_as_of: asOf } : {});
    if (error) throw new Error(error.message);
    return data;
  },
  async runCarryForward(year) {
    const { data, error } = await supabase.rpc('run_company_leave_carry_forward', year ? { p_year: year } : {});
    if (error) throw new Error(error.message);
    return data;
  },
  async transactions(employeeId) {
    if (!employeeId) return [];
    const { data } = await supabase.from('leave_transactions').select('*').eq('employee_id', employeeId).order('created_at', { ascending: false }).limit(50);
    return (data || []).map((t) => ({ _id: t.id, date: t.created_at, type: t.leave_type, amount: Number(t.amount), kind: t.kind, note: t.note }));
  },
};

export const leavePolicies = {
  async list() {
    const { data } = await supabase.from('leave_policies').select('*').order('leave_type');
    return (data || []).map((p) => ({ _id: p.id, leaveType: p.leave_type, annualQuota: Number(p.annual_quota), accrualPerMonth: Number(p.accrual_per_month), eligibilityMonths: p.eligibility_months, carryForwardCap: p.carry_forward_cap == null ? null : Number(p.carry_forward_cap), reasonRequiredDays: p.reason_required_days == null ? null : Number(p.reason_required_days), isActive: p.is_active }));
  },
  async upsert(companyId, leaveType, { annualQuota, accrualPerMonth, eligibilityMonths, carryForwardCap, reasonRequiredDays }) {
    const row = { company_id: companyId, leave_type: leaveType, annual_quota: annualQuota, accrual_per_month: accrualPerMonth, eligibility_months: eligibilityMonths, is_active: true };
    if (carryForwardCap !== undefined) row.carry_forward_cap = carryForwardCap === '' || carryForwardCap == null ? null : carryForwardCap;
    if (reasonRequiredDays !== undefined) row.reason_required_days = reasonRequiredDays === '' || reasonRequiredDays == null ? null : reasonRequiredDays;
    const { error } = await supabase.from('leave_policies').upsert(row, { onConflict: 'company_id,leave_type' });
    if (error) throw new Error(error.message);
  },
};

// ---------- payroll ----------
export const payroll = {
  async list(viewer = {}) {
    const seesAll = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR'].includes(viewer.role);
    let q = supabase.from('payrolls').select('*, employee:employees(first_name,last_name,employee_code)').order('year', { ascending: false }).order('month', { ascending: false });
    if (!seesAll) {
      if (!viewer.employeeId) return [];
      q = q.eq('employee_id', viewer.employeeId);
    }
    const { data } = await q;
    return (data || []).map(mPay);
  },
  async getStructure(employeeId) {
    const { data } = await supabase.from('salary_structures').select('*').eq('employee_id', employeeId).maybeSingle();
    return data ? { basic: data.basic, currency: data.currency, allowances: data.allowances, deductions: data.deductions, taxSlabs: data.tax_slabs } : null;
  },
  async saveStructure(company_id, employee_id, s) {
    const row = { company_id, employee_id, basic: s.basic, currency: s.currency, allowances: s.allowances, deductions: s.deductions, tax_slabs: s.taxSlabs };
    const { error } = await supabase.from('salary_structures').upsert(row, { onConflict: 'company_id,employee_id' });
    if (error) throw new Error(error.message);
  },
  generate: (payload) => invoke('payroll-generate', payload),
  markPaid: async (id) => { const { error } = await supabase.from('payrolls').update({ status: 'PAID' }).eq('id', id); if (error) throw new Error(error.message); },
};

// ---------- salary revisions (CTC change log) ----------
export const salaryRevisions = {
  async list() {
    const { data } = await supabase.from('salary_revisions')
      .select('*, employee:employees(first_name,last_name,employee_code)')
      .order('effective_date', { ascending: false });
    return (data || []).map((r) => ({
      _id: r.id, employeeId: r.employee_id, effectiveDate: r.effective_date,
      oldCtc: r.old_ctc == null ? null : Number(r.old_ctc), newCtc: r.new_ctc == null ? null : Number(r.new_ctc),
      reason: r.reason, createdAt: r.created_at, employee: mEmpRef(r.employee),
    }));
  },
  async latestCtc(employeeId) {
    if (!employeeId) return null;
    const { data } = await supabase.from('salary_revisions').select('new_ctc').eq('employee_id', employeeId).order('effective_date', { ascending: false }).limit(1).maybeSingle();
    return data ? Number(data.new_ctc) : null;
  },
  async create({ companyId, employeeId, effectiveDate, oldCtc, newCtc, reason }) {
    if (!employeeId || !effectiveDate || newCtc === '' || newCtc == null) throw new Error('Employee, date and new CTC are required');
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('salary_revisions').insert({
      company_id: companyId, employee_id: employeeId, effective_date: effectiveDate,
      old_ctc: oldCtc === '' || oldCtc == null ? null : Number(oldCtc), new_ctc: Number(newCtc),
      reason: reason || null, created_by: user?.id || null,
    });
    if (error) throw new Error(error.message);
  },
};

// ---------- tasks ----------
export const tasks = {
  async list() {
    const [{ data: rows }, emps] = await Promise.all([
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      employees.all(),
    ]);
    const byId = Object.fromEntries(emps.map((e) => [e._id, e]));
    return (rows || []).map((t) => ({
      _id: t.id, title: t.title, description: t.description, status: t.status,
      priority: t.priority, dueDate: t.due_date,
      assignees: (t.assignees || []).map((id) => byId[id]).filter(Boolean),
    }));
  },
  create: async ({ company_id, created_by, title, description, priority, dueDate, assignees }) => {
    const { error } = await supabase.from('tasks').insert({ company_id, created_by, title, description, priority, due_date: dueDate || null, assignees: assignees || [] });
    if (error) throw new Error(error.message);
  },
  advance: async (id, status) => { const patch = { status }; if (status === 'DONE') patch.progress = 100; const { error } = await supabase.from('tasks').update(patch).eq('id', id); if (error) throw new Error(error.message); },
};

// ---------- companies (super admin) ----------
export const companies = {
  async list() {
    const { data } = await supabase.from('companies').select('*').order('created_at', { ascending: false });
    const out = [];
    for (const c of data || []) {
      const { count } = await supabase.from('employees').select('*', { count: 'exact', head: true }).eq('company_id', c.id);
      out.push({ ...mCompany(c), employeeCount: count || 0 });
    }
    return out;
  },
  setPlan: async (id, plan) => {
    const seats = { FREE: 10, STARTER: 50, GROWTH: 250, ENTERPRISE: 100000 }[plan] ?? 10;
    const { error } = await supabase.from('companies').update({ plan, plan_seats: seats }).eq('id', id);
    if (error) throw new Error(error.message);
  },
};

// ---------- notifications ----------
export const notifications = {
  async list() {
    const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50);
    const items = (data || []).map((n) => ({ _id: n.id, title: n.title, body: n.body, isRead: n.is_read, createdAt: n.created_at }));
    return { items, unread: items.filter((i) => !i.isRead).length };
  },
  markAllRead: async () => { await supabase.from('notifications').update({ is_read: true }).eq('is_read', false); },
};

// ---------- holidays ----------
export const holidays = {
  async all() {
    const { data } = await supabase.from('holidays').select('*').order('date');
    return (data || []).map((h) => ({ _id: h.id, name: h.name, date: h.date }));
  },
  async upcoming(limit = 6) {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase.from('holidays').select('*').gte('date', today).order('date').limit(limit);
    return (data || []).map((h) => ({ _id: h.id, name: h.name, date: h.date }));
  },
};

// ---------- home dashboard widgets ----------
function nextBirthday(dob) {
  if (!dob) return null;
  const d = new Date(dob); const now = new Date();
  const next = new Date(now.getFullYear(), d.getMonth(), d.getDate());
  if (next < new Date(now.getFullYear(), now.getMonth(), now.getDate())) next.setFullYear(now.getFullYear() + 1);
  return next;
}
export const home = {
  async widgets(profile) {
    const today = new Date(); const todayStr = today.toISOString().slice(0, 10);
    const [{ data: emps }, { data: onLeave }, hol] = await Promise.all([
      supabase.from('employees')
        .select('id,first_name,last_name,employee_code,dob,date_of_joining,department_id,designation:designations(title)')
        .eq('status', 'ACTIVE'),
      supabase.from('leaves')
        .select('to_date,from_date,leave_type,employee:employees(first_name,last_name,designation:designations(title))')
        .eq('status', 'APPROVED').lte('from_date', todayStr).gte('to_date', todayStr),
      holidays.upcoming(),
    ]);
    const list = emps || [];
    const role = (e) => e.designation?.title || 'Employee';
    const name = (e) => `${e.first_name} ${e.last_name || ''}`.trim();

    // New joiners (last 30 days)
    const cutoff = new Date(today); cutoff.setDate(cutoff.getDate() - 30);
    const newJoiners = list
      .filter((e) => e.date_of_joining && new Date(e.date_of_joining) >= cutoff)
      .sort((a, b) => new Date(b.date_of_joining) - new Date(a.date_of_joining))
      .map((e) => ({ id: e.id, name: name(e), role: role(e), date: e.date_of_joining }));

    // Department members (same dept as current user, else first few)
    const me = list.find((e) => e.id === profile?.employee_id);
    const deptId = me?.department_id;
    const departmentMembers = (deptId ? list.filter((e) => e.department_id === deptId && e.id !== me?.id) : list)
      .slice(0, 6).map((e) => ({ id: e.id, name: name(e), role: role(e) }));

    // Birthdays (next 45 days)
    const horizon = new Date(today); horizon.setDate(horizon.getDate() + 45);
    const birthdays = list
      .map((e) => ({ e, nb: nextBirthday(e.dob) }))
      .filter((x) => x.nb && x.nb <= horizon)
      .sort((a, b) => a.nb - b.nb)
      .map(({ e, nb }) => ({ id: e.id, name: name(e), role: role(e), date: nb.toISOString().slice(0, 10) }));

    // People on leave today
    const peopleOnLeave = (onLeave || []).map((l) => ({
      name: `${l.employee?.first_name || ''} ${l.employee?.last_name || ''}`.trim(),
      role: l.employee?.designation?.title || 'Employee',
      until: l.to_date, type: l.leave_type,
    }));

    // Leave availability (current user's balances)
    let leaveBalance = null;
    if (profile?.employee_id) {
      const { data: bal } = await supabase.from('leave_balances').select('*')
        .eq('employee_id', profile.employee_id).eq('year', today.getFullYear()).maybeSingle();
      if (bal) leaveBalance = { CASUAL: bal.casual, SICK: bal.sick, EARNED: bal.earned };
    }

    return { newJoiners, departmentMembers, birthdays, peopleOnLeave, holidays: hol, leaveBalance, headcount: list.length };
  },
};

// ---------- attendance punches (check-in/out + break tracking) ----------
export const WORK_TARGET_MS = 8 * 3600 * 1000;   // 8 hours office time
export const BREAK_TARGET_MS = 1 * 3600 * 1000;  // 1 hour break

const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function computeDay(punches, nowMs = Date.now()) {
  const sorted = [...punches].sort((a, b) => new Date(a.at) - new Date(b.at));
  let workMs = 0, breakMs = 0, openInAt = null, lastOutAt = null;
  const sessions = [];
  for (const p of sorted) {
    if (p.type === 'IN') {
      if (lastOutAt) breakMs += new Date(p.at) - new Date(lastOutAt);
      openInAt = p.at; lastOutAt = null;
    } else {
      if (openInAt) { workMs += new Date(p.at) - new Date(openInAt); sessions.push({ in: openInAt, out: p.at }); openInAt = null; lastOutAt = p.at; }
    }
  }
  const open = Boolean(openInAt);
  if (open) { workMs += nowMs - new Date(openInAt).getTime(); sessions.push({ in: openInAt, out: null }); }
  return { workMs, breakMs, open, openInAt, lastOutAt, sessions, count: sorted.length };
}

export const punch = {
  async today(employeeId) {
    if (!employeeId) return [];
    const date = localDate();
    const { data } = await supabase.from('attendance_punches')
      .select('*').eq('employee_id', employeeId).eq('work_date', date)
      .order('punched_at', { ascending: true });
    return (data || []).map((p) => ({ _id: p.id, at: p.punched_at, type: p.type, method: p.method }));
  },
  async forDate(employeeId, date) {
    if (!employeeId || !date) return [];
    const { data } = await supabase.from('attendance_punches')
      .select('*').eq('employee_id', employeeId).eq('work_date', date)
      .order('punched_at', { ascending: true });
    return (data || []).map((p) => ({ _id: p.id, at: p.punched_at, type: p.type, method: p.method }));
  },
  async month(employeeId, start, end) {
    if (!employeeId) return {};
    const { data } = await supabase.from('attendance_punches')
      .select('work_date,type,punched_at,method').eq('employee_id', employeeId)
      .gte('work_date', start).lte('work_date', end).order('punched_at', { ascending: true });
    const byDate = {};
    (data || []).forEach((p) => { (byDate[p.work_date] ||= []).push({ at: p.punched_at, type: p.type, method: p.method }); });
    return byDate;
  },
  async toggle(companyId, employeeId, type) {
    const { error } = await supabase.from('attendance_punches').insert({
      company_id: companyId, employee_id: employeeId, type, work_date: localDate(),
    });
    if (error) throw new Error(error.message);
  },
  // Manual check-in/check-out entry: inserts an IN (+ optional OUT) punch on a given work_date
  async addEntry({ companyId, employeeId, date, checkIn, checkOut, remarks }) {
    if (!companyId || !employeeId || !date || !checkIn) throw new Error('Check-in time required');
    const inAt = new Date(`${date}T${checkIn}:00`);
    const rows = [{ company_id: companyId, employee_id: employeeId, work_date: date, type: 'IN', punched_at: inAt.toISOString(), method: 'MANUAL', remarks: remarks || null }];
    if (checkOut) {
      let outAt = new Date(`${date}T${checkOut}:00`);
      if (outAt <= inAt) outAt = new Date(outAt.getTime() + 86400000); // crosses midnight (night shift)
      rows.push({ company_id: companyId, employee_id: employeeId, work_date: date, type: 'OUT', punched_at: outAt.toISOString(), method: 'MANUAL', remarks: remarks || null });
    }
    const { error } = await supabase.from('attendance_punches').insert(rows);
    if (error) throw new Error(error.message);
  },
  async deletePunches(ids) {
    const list = (ids || []).filter(Boolean);
    if (!list.length) return;
    const { error } = await supabase.from('attendance_punches').delete().in('id', list);
    if (error) throw new Error(error.message);
  },
};

// ---------- shifts ----------
const mShift = (s) => ({ _id: s.id, code: s.code, name: s.name, start: s.start_time, end: s.end_time, color: s.color, isActive: s.is_active });
export const shifts = {
  // current employee's assigned shift + weekly off day (0=Sun..6=Sat)
  async mine(employeeId) {
    if (!employeeId) return { shift: null, weeklyOff: 0 };
    const { data } = await supabase.from('employees')
      .select('weekly_off, shift:shifts(id,code,name,start_time,end_time,color)')
      .eq('id', employeeId).maybeSingle();
    return { shift: data?.shift || null, weeklyOff: data?.weekly_off ?? 0 };
  },
  async list() {
    const { data } = await supabase.from('shifts').select('*').eq('is_active', true).order('start_time');
    return (data || []).map(mShift);
  },
  async listAll() {
    const { data } = await supabase.from('shifts').select('*').order('start_time');
    return (data || []).map(mShift);
  },
  add: async ({ company_id, name, code, start, end, color }) => {
    const { error } = await supabase.from('shifts').insert({ company_id, name, code: code || null, start_time: start, end_time: end, color: color || null, is_active: true });
    if (error) throw new Error(error.message);
  },
  update: async (id, fields) => { const { error } = await supabase.from('shifts').update(fields).eq('id', id); if (error) throw new Error(error.message); },
  del: async (id) => { const { error } = await supabase.from('shifts').delete().eq('id', id); if (error) throw new Error(error.message); },
  assignToEmployees: async (ids, patch) => {
    if (!ids?.length) return 0;
    const { error } = await supabase.from('employees').update(patch).in('id', ids);
    if (error) throw new Error(error.message);
    return ids.length;
  },
};

const mSCR = (r) => ({
  _id: r.id, status: r.status, reason: r.reason, decisionNote: r.decision_note,
  createdAt: r.created_at, decidedAt: r.decided_at,
  employee: r.employee ? { name: `${r.employee.first_name} ${r.employee.last_name || ''}`.trim(), code: r.employee.employee_code } : null,
  currentShift: r.current?.name || null,
  requestedShift: r.requested?.name || null,
});

export const shiftRequests = {
  create: async ({ company_id, employee_id, current_shift_id, requested_shift_id, reason }) => {
    const { error } = await supabase.from('shift_change_requests').insert({ company_id, employee_id, current_shift_id: current_shift_id || null, requested_shift_id, reason: reason || null });
    if (error) throw new Error(error.message);
  },
  mine: async (employeeId) => {
    if (!employeeId) return [];
    const { data } = await supabase.from('shift_change_requests')
      .select('*, current:shifts!shift_change_requests_current_shift_id_fkey(name), requested:shifts!shift_change_requests_requested_shift_id_fkey(name)')
      .eq('employee_id', employeeId).order('created_at', { ascending: false });
    return (data || []).map(mSCR);
  },
  list: async () => {
    const { data } = await supabase.from('shift_change_requests')
      .select('*, employee:employees!shift_change_requests_employee_id_fkey(first_name,last_name,employee_code), current:shifts!shift_change_requests_current_shift_id_fkey(name), requested:shifts!shift_change_requests_requested_shift_id_fkey(name)')
      .order('created_at', { ascending: false });
    return (data || []).map(mSCR);
  },
  decide: async (id, decision, note) => {
    const { error } = await supabase.rpc('decide_shift_change', { p_id: id, p_decision: decision, p_note: note || null });
    if (error) throw new Error(error.message);
  },
};

// ---------- attendance regularization requests ----------
const mAttReq = (r) => ({
  _id: r.id, date: r.work_date, checkIn: r.check_in, checkOut: r.check_out,
  remarks: r.remarks, status: r.status, createdAt: r.created_at, employeeId: r.employee_id, employee: mEmpRef(r.employee),
});
export const attendanceReq = {
  async create({ companyId, employeeId, date, checkIn, checkOut, remarks }) {
    if (!companyId || !employeeId || !date || !checkIn) throw new Error('Check-in time required');
    const inAt = new Date(`${date}T${checkIn}:00`);
    let outAt = checkOut ? new Date(`${date}T${checkOut}:00`) : null;
    if (outAt && outAt <= inAt) outAt = new Date(outAt.getTime() + 86400000);
    const { error } = await supabase.from('attendance_requests').insert({
      company_id: companyId, employee_id: employeeId, work_date: date,
      check_in: inAt.toISOString(), check_out: outAt ? outAt.toISOString() : null, remarks: remarks || null,
    });
    if (error) throw new Error(error.message);
  },
  async list() {
    const { data } = await supabase.from('attendance_requests')
      .select('*, employee:employees(first_name,last_name,employee_code)')
      .order('created_at', { ascending: false });
    return (data || []).map(mAttReq);
  },
  async decide(id, decision) {
    const { error } = await supabase.rpc('decide_attendance_request', { p_request_id: id, p_decision: decision });
    if (error) throw new Error(error.message);
  },
};

// ---------- assets ----------
export const assets = {
  async list() {
    const { data } = await supabase.from('assets').select('*, employee:employees(first_name,last_name,employee_code)').order('created_at', { ascending: false });
    return (data || []).map((a) => ({ _id: a.id, name: a.name, tag: a.tag, category: a.category, status: a.status, notes: a.notes, assignedTo: a.assigned_to, employee: a.employee ? { name: `${a.employee.first_name} ${a.employee.last_name || ''}`.trim(), code: a.employee.employee_code } : null }));
  },
  async create(p) { const { error } = await supabase.from('assets').insert(p); if (error) throw new Error(error.message); },
  async update(id, patch) { const { error } = await supabase.from('assets').update(patch).eq('id', id); if (error) throw new Error(error.message); },
  async remove(id) { const { error } = await supabase.from('assets').delete().eq('id', id); if (error) throw new Error(error.message); },
};

// ---------- expenses ----------
export const expenses = {
  async list(viewer = {}) {
    const sel = '*, employee:employees(first_name,last_name,employee_code)';
    const map = (x) => ({ _id: x.id, category: x.category, amount: x.amount, currency: x.currency, date: x.expense_date, description: x.description, status: x.status, decidedAt: x.decided_at, decisionNote: x.decision_note, receiptPath: x.receipt_path || null, employeeId: x.employee_id, employee: x.employee ? { name: `${x.employee.first_name} ${x.employee.last_name || ''}`.trim(), code: x.employee.employee_code } : null });
    const role = viewer.role;
    const seesAll = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR'].includes(role);
    if (seesAll) {
      const { data } = await supabase.from('expenses').select(sel).order('expense_date', { ascending: false });
      return (data || []).map(map);
    }
    if (role === 'MANAGER' && viewer.employeeId) {
      const { data: emps } = await supabase.from('employees').select('id,manager_id');
      const childrenBy = {}; (emps || []).forEach((e) => { if (e.manager_id) (childrenBy[e.manager_id] = childrenBy[e.manager_id] || []).push(e.id); });
      const set = new Set([viewer.employeeId]); const stack = [viewer.employeeId];
      while (stack.length) { const c = stack.pop(); (childrenBy[c] || []).forEach((id) => { if (!set.has(id)) { set.add(id); stack.push(id); } }); }
      const { data } = await supabase.from('expenses').select(sel).order('expense_date', { ascending: false });
      return (data || []).filter((x) => set.has(x.employee_id)).map(map);
    }
    if (viewer.employeeId) {
      const { data } = await supabase.from('expenses').select(sel).eq('employee_id', viewer.employeeId).order('expense_date', { ascending: false });
      return (data || []).map(map);
    }
    return [];
  },
  async create(p) { const { error } = await supabase.from('expenses').insert(p); if (error) throw new Error(error.message); },
  async uploadReceipt(file, companyId) {
    if (!file || !companyId) return null;
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${companyId}/${Date.now()}_${safe}`;
    const { error } = await supabase.storage.from('receipts').upload(path, file, { upsert: false });
    if (error) throw new Error(error.message);
    return path;
  },
  async receiptUrl(path) {
    if (!path) return null;
    const { data, error } = await supabase.storage.from('receipts').createSignedUrl(path, 300);
    if (error) throw new Error(error.message);
    return data?.signedUrl || null;
  },
  async decide(id, status, note) { const { error } = await supabase.rpc('decide_expense', { p_id: id, p_decision: status, p_note: note || null }); if (error) throw new Error(error.message); },
};

// ---------- timesheets ----------
export const timesheets = {
  async list() {
    const { data } = await supabase.from('timesheets').select('*, employee:employees(first_name,last_name,employee_code)').order('work_date', { ascending: false });
    return (data || []).map((t) => ({ _id: t.id, date: t.work_date, project: t.project, task: t.task, hours: t.hours, status: t.status, employeeId: t.employee_id, employee: t.employee ? { name: `${t.employee.first_name} ${t.employee.last_name || ''}`.trim(), code: t.employee.employee_code } : null }));
  },
  async create(p) { const { error } = await supabase.from('timesheets').insert(p); if (error) throw new Error(error.message); },
  async decide(id, status) { const { error } = await supabase.from('timesheets').update({ status }).eq('id', id); if (error) throw new Error(error.message); },
};

// ---------- comp-off ----------
export const compoff = {
  async list() {
    const { data } = await supabase.from('comp_off_requests').select('*, employee:employees(first_name,last_name,employee_code)').order('worked_date', { ascending: false });
    return (data || []).map((c) => ({ _id: c.id, workedDate: c.worked_date, days: c.days, reason: c.reason, status: c.status, employeeId: c.employee_id, employee: c.employee ? { name: `${c.employee.first_name} ${c.employee.last_name || ''}`.trim(), code: c.employee.employee_code } : null }));
  },
  async create(p) { const { error } = await supabase.from('comp_off_requests').insert(p); if (error) throw new Error(error.message); },
  async decide(id, status, note) { const { error } = await supabase.rpc('decide_comp_off', { p_id: id, p_decision: status, p_note: note || null }); if (error) throw new Error(error.message); },
};

// ---------- twilio phone verification ----------
export const otp = {
  start: (phone, channel = 'sms') => invoke('twilio-otp', { action: 'start', phone, channel }),
  check: (phone, code) => invoke('twilio-otp', { action: 'check', phone, code }),
};

// ---------- AI assistant (ai-assistant edge function) ----------
export const assistant = {
  ask: (question, history = []) => invoke('ai-assistant', { question, history }),
};

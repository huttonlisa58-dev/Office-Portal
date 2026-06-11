// Central role + enum definitions used across the platform.

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN', // platform owner — manages all companies, no tenant
  COMPANY_ADMIN: 'COMPANY_ADMIN', // owns one company
  HR: 'HR',
  MANAGER: 'MANAGER',
  EMPLOYEE: 'EMPLOYEE',
};

export const COMPANY_SCOPED_ROLES = [
  ROLES.COMPANY_ADMIN,
  ROLES.HR,
  ROLES.MANAGER,
  ROLES.EMPLOYEE,
];

export const SUBSCRIPTION_PLANS = {
  FREE: { name: 'FREE', maxEmployees: 10, price: 0 },
  STARTER: { name: 'STARTER', maxEmployees: 50, price: 29 },
  GROWTH: { name: 'GROWTH', maxEmployees: 250, price: 99 },
  ENTERPRISE: { name: 'ENTERPRISE', maxEmployees: 100000, price: 499 },
};

export const LEAVE_STATUS = { PENDING: 'PENDING', APPROVED: 'APPROVED', REJECTED: 'REJECTED', CANCELLED: 'CANCELLED' };
export const ATTENDANCE_STATUS = { PRESENT: 'PRESENT', ABSENT: 'ABSENT', LATE: 'LATE', HALF_DAY: 'HALF_DAY', ON_LEAVE: 'ON_LEAVE' };
export const ATTENDANCE_METHOD = { MANUAL: 'MANUAL', GPS: 'GPS', QR: 'QR', FACE: 'FACE' };
export const TASK_STATUS = { TODO: 'TODO', IN_PROGRESS: 'IN_PROGRESS', REVIEW: 'REVIEW', DONE: 'DONE' };
export const PAYROLL_STATUS = { DRAFT: 'DRAFT', GENERATED: 'GENERATED', PAID: 'PAID' };

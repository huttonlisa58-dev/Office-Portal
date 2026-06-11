import Leave from '../models/Leave.js';
import LeaveBalance from '../models/LeaveBalance.js';
import Employee from '../models/Employee.js';
import { LEAVE_STATUS } from '../config/constants.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created } from '../utils/apiResponse.js';
import { notify } from '../services/notification.service.js';
import { sendWhatsApp } from '../services/whatsapp.service.js';

function daysBetween(from, to) {
  const ms = new Date(to).setHours(0, 0, 0, 0) - new Date(from).setHours(0, 0, 0, 0);
  return Math.floor(ms / 86400000) + 1;
}

async function getOrCreateBalance(companyId, employeeId, year) {
  let bal = await LeaveBalance.findOne({ company: companyId, employee: employeeId, year });
  if (!bal) bal = await LeaveBalance.create({ company: companyId, employee: employeeId, year });
  return bal;
}

// POST /leaves  — employee applies
export const applyLeave = asyncHandler(async (req, res) => {
  const { type = 'CASUAL', from, to, reason } = req.body;
  if (!from || !to) throw new ApiError(400, 'from and to dates required');
  const employeeId = req.user.employee || req.body.employee;
  if (!employeeId) throw new ApiError(400, 'No employee profile linked to this account');
  if (new Date(to) < new Date(from)) throw new ApiError(400, '"to" cannot be before "from"');

  const days = daysBetween(from, to);
  const year = new Date(from).getFullYear();
  if (['CASUAL', 'SICK', 'EARNED'].includes(type)) {
    const bal = await getOrCreateBalance(req.companyId, employeeId, year);
    if (bal.balances[type] < days) throw new ApiError(400, `Insufficient ${type} balance (${bal.balances[type]} left)`);
  }

  const leave = await Leave.create({ company: req.companyId, employee: employeeId, type, from, to, days, reason });
  return created(res, { leave }, 'Leave applied');
});

// GET /leaves  — HR sees all, employee sees own
export const listLeaves = asyncHandler(async (req, res) => {
  const { status, employeeId } = req.query;
  const filter = { company: req.companyId };
  if (status) filter.status = status;
  if (employeeId) filter.employee = employeeId;
  else if (req.user.employee && !['HR', 'COMPANY_ADMIN', 'MANAGER', 'SUPER_ADMIN'].includes(req.user.role))
    filter.employee = req.user.employee;
  const items = await Leave.find(filter).populate('employee', 'firstName lastName employeeId').sort({ createdAt: -1 });
  return ok(res, { items });
});

// PATCH /leaves/:id/decision  — HR/Manager approves or rejects
export const decideLeave = asyncHandler(async (req, res) => {
  const { decision, note } = req.body; // 'APPROVED' | 'REJECTED'
  if (![LEAVE_STATUS.APPROVED, LEAVE_STATUS.REJECTED].includes(decision))
    throw new ApiError(400, 'decision must be APPROVED or REJECTED');

  const leave = await Leave.findOne({ _id: req.params.id, company: req.companyId }).populate('employee');
  if (!leave) throw new ApiError(404, 'Leave not found');
  if (leave.status !== LEAVE_STATUS.PENDING) throw new ApiError(409, 'Leave already decided');

  leave.status = decision;
  leave.approver = req.user._id;
  leave.decisionNote = note;
  leave.decidedAt = new Date();
  await leave.save();

  // deduct balance on approval
  if (decision === LEAVE_STATUS.APPROVED && ['CASUAL', 'SICK', 'EARNED'].includes(leave.type)) {
    const year = new Date(leave.from).getFullYear();
    const bal = await getOrCreateBalance(req.companyId, leave.employee._id, year);
    bal.balances[leave.type] = Math.max(0, bal.balances[leave.type] - leave.days);
    await bal.save();
  }

  // notify employee (dashboard + email + WhatsApp)
  if (leave.employee.user) {
    await notify({
      company: req.companyId, user: leave.employee.user, type: 'LEAVE',
      title: `Leave ${decision.toLowerCase()}`,
      body: `Your ${leave.type} leave (${leave.days}d) was ${decision.toLowerCase()}.`,
      email: leave.employee.email,
    });
  }
  if (leave.employee.phone) {
    sendWhatsApp({ to: leave.employee.phone, body: `Your leave request was ${decision}.` }).catch(() => {});
  }

  return ok(res, { leave }, `Leave ${decision.toLowerCase()}`);
});

// DELETE /leaves/:id  — employee cancels own pending leave
export const cancelLeave = asyncHandler(async (req, res) => {
  const leave = await Leave.findOne({ _id: req.params.id, company: req.companyId });
  if (!leave) throw new ApiError(404, 'Leave not found');
  if (leave.status !== LEAVE_STATUS.PENDING) throw new ApiError(409, 'Only pending leaves can be cancelled');
  leave.status = LEAVE_STATUS.CANCELLED;
  await leave.save();
  return ok(res, { leave }, 'Leave cancelled');
});

// GET /leaves/balance  — for current/queried employee
export const getBalance = asyncHandler(async (req, res) => {
  const employeeId = req.query.employeeId || req.user.employee;
  if (!employeeId) throw new ApiError(400, 'employeeId required');
  const year = Number(req.query.year) || new Date().getFullYear();
  const bal = await getOrCreateBalance(req.companyId, employeeId, year);
  return ok(res, { balance: bal });
});

import Company from '../models/Company.js';
import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';
import { ATTENDANCE_STATUS, ATTENDANCE_METHOD } from '../config/constants.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { verifyFace } from '../services/face.service.js';

// Returns YYYY-MM-DD for "now" in the company's timezone.
function todayInTz(timezone = 'UTC') {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}
function minutesSinceMidnight(date, timezone = 'UTC') {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date);
  const h = Number(parts.find((p) => p.type === 'hour').value);
  const m = Number(parts.find((p) => p.type === 'minute').value);
  return h * 60 + m;
}

// Resolve the employee for the current request (self for EMPLOYEE; param for HR/admin).
async function resolveEmployee(req) {
  if (req.body.employeeId || req.query.employeeId) {
    const id = req.body.employeeId || req.query.employeeId;
    return Employee.findOne({ _id: id, company: req.companyId });
  }
  if (req.user.employee) return Employee.findOne({ _id: req.user.employee, company: req.companyId });
  throw new ApiError(400, 'employeeId required');
}

// POST /attendance/check-in
export const checkIn = asyncHandler(async (req, res) => {
  const { method = ATTENDANCE_METHOD.MANUAL, location, faceEmbedding } = req.body;
  const employee = await resolveEmployee(req);
  if (!employee) throw new ApiError(404, 'Employee not found');

  const company = await Company.findById(req.companyId).lean();
  const tz = company.timezone || 'UTC';
  const date = todayInTz(tz);

  // Face verification path
  if (method === ATTENDANCE_METHOD.FACE) {
    const emp = await Employee.findById(employee._id).select('+faceEmbedding');
    if (!emp.faceEmbedding?.length) throw new ApiError(400, 'No enrolled face for this employee');
    const { match, distance } = verifyFace(emp.faceEmbedding, faceEmbedding || []);
    if (!match) throw new ApiError(401, `Face not recognized (distance ${distance.toFixed(3)})`);
  }

  let record = await Attendance.findOne({ company: req.companyId, employee: employee._id, date });
  if (record?.checkIn) throw new ApiError(409, 'Already checked in today');

  const now = new Date();
  const start = company.workSettings?.workdayStart || '09:00';
  const [sh, sm] = start.split(':').map(Number);
  const lateAfter = (sh * 60 + sm) + (company.workSettings?.lateAfterMinutes ?? 15);
  const isLate = minutesSinceMidnight(now, tz) > lateAfter;

  record = await Attendance.findOneAndUpdate(
    { company: req.companyId, employee: employee._id, date },
    {
      $setOnInsert: { company: req.companyId, employee: employee._id, date },
      $set: {
        checkIn: { time: now, method, location, note: req.body.note },
        isLate,
        status: isLate ? ATTENDANCE_STATUS.LATE : ATTENDANCE_STATUS.PRESENT,
      },
    },
    { new: true, upsert: true }
  );
  return ok(res, { attendance: record }, isLate ? 'Checked in (late)' : 'Checked in');
});

// POST /attendance/check-out
export const checkOut = asyncHandler(async (req, res) => {
  const { method = ATTENDANCE_METHOD.MANUAL, location } = req.body;
  const employee = await resolveEmployee(req);
  if (!employee) throw new ApiError(404, 'Employee not found');

  const company = await Company.findById(req.companyId).lean();
  const tz = company.timezone || 'UTC';
  const date = todayInTz(tz);

  const record = await Attendance.findOne({ company: req.companyId, employee: employee._id, date });
  if (!record?.checkIn) throw new ApiError(400, 'No check-in found for today');
  if (record.checkOut) throw new ApiError(409, 'Already checked out');

  const now = new Date();
  const workedMinutes = Math.max(0, Math.round((now - new Date(record.checkIn.time)) / 60000));
  const fullDayMinutes = (company.workSettings?.fullDayHours ?? 8) * 60;
  const overtimeMinutes = Math.max(0, workedMinutes - fullDayMinutes);

  record.checkOut = { time: now, method, location, note: req.body.note };
  record.workedMinutes = workedMinutes;
  record.overtimeMinutes = overtimeMinutes;
  if (workedMinutes < fullDayMinutes / 2) record.status = ATTENDANCE_STATUS.HALF_DAY;
  await record.save();
  return ok(res, { attendance: record }, 'Checked out');
});

// GET /attendance  — list/filter (HR sees all, employee sees own)
export const listAttendance = asyncHandler(async (req, res) => {
  const { employeeId, from, to, status } = req.query;
  const filter = { company: req.companyId };
  if (status) filter.status = status;
  if (employeeId) filter.employee = employeeId;
  else if (req.user.employee && !['HR', 'COMPANY_ADMIN', 'MANAGER', 'SUPER_ADMIN'].includes(req.user.role))
    filter.employee = req.user.employee;
  if (from || to) filter.date = { ...(from && { $gte: from }), ...(to && { $lte: to }) };

  const items = await Attendance.find(filter)
    .populate('employee', 'firstName lastName employeeId')
    .sort({ date: -1 }).limit(500);
  return ok(res, { items });
});

// GET /attendance/today  — present count + per-employee snapshot for the company
export const todaySummary = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.companyId).lean();
  const date = todayInTz(company.timezone || 'UTC');
  const [records, totalEmployees] = await Promise.all([
    Attendance.find({ company: req.companyId, date }).populate('employee', 'firstName lastName employeeId'),
    Employee.countDocuments({ company: req.companyId, status: 'ACTIVE' }),
  ]);
  const present = records.filter((r) => r.checkIn).length;
  const late = records.filter((r) => r.isLate).length;
  return ok(res, { date, present, late, absent: totalEmployees - present, totalEmployees, records });
});

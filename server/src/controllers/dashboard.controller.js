import Company from '../models/Company.js';
import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';
import Leave from '../models/Leave.js';
import Payroll from '../models/Payroll.js';
import User from '../models/User.js';
import { ROLES, LEAVE_STATUS } from '../config/constants.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';

function todayInTz(timezone = 'UTC') {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

// GET /dashboard  — adapts to the caller's role
export const dashboard = asyncHandler(async (req, res) => {
  // ---- Platform-wide (SUPER_ADMIN, no company override) ----
  if (req.user.role === ROLES.SUPER_ADMIN && !req.companyId) {
    const [totalCompanies, totalEmployees, totalUsers, companies] = await Promise.all([
      Company.countDocuments(),
      Employee.countDocuments(),
      User.countDocuments(),
      Company.find().sort({ createdAt: -1 }).limit(8).lean(),
    ]);
    // plan distribution
    const planAgg = await Company.aggregate([{ $group: { _id: '$subscription.plan', count: { $sum: 1 } } }]);
    return ok(res, {
      scope: 'PLATFORM',
      widgets: { totalCompanies, totalEmployees, totalUsers },
      planDistribution: planAgg.map((p) => ({ plan: p._id, count: p.count })),
      recentCompanies: companies,
    });
  }

  // ---- Company-level ----
  const companyId = req.companyId;
  const company = await Company.findById(companyId).lean();
  const date = todayInTz(company?.timezone || 'UTC');

  const [totalEmployees, todayRecords, pendingLeaves] = await Promise.all([
    Employee.countDocuments({ company: companyId, status: 'ACTIVE' }),
    Attendance.find({ company: companyId, date }).lean(),
    Leave.countDocuments({ company: companyId, status: LEAVE_STATUS.PENDING }),
  ]);
  const presentToday = todayRecords.filter((r) => r.checkIn).length;
  const lateToday = todayRecords.filter((r) => r.isLate).length;

  // current month payroll summary
  const now = new Date();
  const payrollAgg = await Payroll.aggregate([
    { $match: { company: company?._id, month: now.getMonth() + 1, year: now.getFullYear() } },
    { $group: { _id: null, totalNet: { $sum: '$netPay' }, count: { $sum: 1 } } },
  ]);

  // 7-day attendance trend
  const days = [...Array(7)].map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return todayInTz(company?.timezone || 'UTC').slice(0, 8) + String(d.getDate()).padStart(2, '0'); // approx; see note
  });
  const trend = await Attendance.aggregate([
    { $match: { company: company?._id, date: { $in: days } } },
    { $group: { _id: '$date', present: { $sum: { $cond: [{ $ifNull: ['$checkIn', false] }, 1, 0] } }, late: { $sum: { $cond: ['$isLate', 1, 0] } } } },
    { $sort: { _id: 1 } },
  ]);

  // department headcount
  const deptAgg = await Employee.aggregate([
    { $match: { company: company?._id } },
    { $group: { _id: '$department', count: { $sum: 1 } } },
  ]);

  return ok(res, {
    scope: 'COMPANY',
    company: { id: company?._id, name: company?.name },
    widgets: {
      totalEmployees,
      presentToday,
      lateToday,
      absentToday: totalEmployees - presentToday,
      pendingLeaves,
      payrollThisMonth: payrollAgg[0]?.totalNet || 0,
      payrollRunCount: payrollAgg[0]?.count || 0,
    },
    attendanceTrend: trend,
    departmentHeadcount: deptAgg,
  });
});

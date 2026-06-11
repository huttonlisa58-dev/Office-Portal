import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { detectAttendanceAnomalies, hrAssistantReply } from '../services/ai.service.js';

// GET /ai/attendance-anomalies?employeeId=...
// Runs statistical anomaly detection over an employee's recent attendance and
// persists scores back onto the records.
export const attendanceAnomalies = asyncHandler(async (req, res) => {
  const employeeId = req.query.employeeId;
  if (!employeeId) throw new ApiError(400, 'employeeId required');
  const records = await Attendance.find({ company: req.companyId, employee: employeeId })
    .sort({ date: -1 }).limit(60);

  const mapped = records.map((r) => ({
    id: r._id, date: r.date,
    checkInMinutes: r.checkIn ? new Date(r.checkIn.time).getHours() * 60 + new Date(r.checkIn.time).getMinutes() : 0,
    workedMinutes: r.workedMinutes,
  }));
  const scored = detectAttendanceAnomalies(mapped);

  // persist
  await Promise.all(scored.map((s) =>
    Attendance.updateOne({ _id: s.id }, { anomalyScore: s.anomalyScore, anomalyReason: s.anomalyReason })
  ));
  return ok(res, { anomalies: scored.filter((s) => s.anomalyScore >= 2) , scored });
});

// POST /ai/assistant  { question }
export const assistant = asyncHandler(async (req, res) => {
  const { question } = req.body;
  if (!question) throw new ApiError(400, 'question required');
  // Build a small, tenant-scoped context (headcount etc.) — extend as needed.
  const headcount = await Employee.countDocuments({ company: req.companyId, status: 'ACTIVE' });
  const context = `Active employees: ${headcount}.`;
  const answer = await hrAssistantReply({ question, context });
  return ok(res, { answer });
});

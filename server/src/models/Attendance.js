import mongoose from 'mongoose';
import { ATTENDANCE_STATUS, ATTENDANCE_METHOD } from '../config/constants.js';

const punchSchema = new mongoose.Schema(
  {
    time: { type: Date, required: true },
    method: { type: String, enum: Object.values(ATTENDANCE_METHOD), default: ATTENDANCE_METHOD.MANUAL },
    location: { lat: Number, lng: Number, accuracy: Number },
    note: String,
  },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    date: { type: String, required: true }, // YYYY-MM-DD in company timezone
    checkIn: punchSchema,
    checkOut: punchSchema,
    workedMinutes: { type: Number, default: 0 },
    overtimeMinutes: { type: Number, default: 0 },
    isLate: { type: Boolean, default: false },
    status: { type: String, enum: Object.values(ATTENDANCE_STATUS), default: ATTENDANCE_STATUS.PRESENT },
    // populated by AI anomaly job
    anomalyScore: { type: Number, default: 0 },
    anomalyReason: String,
  },
  { timestamps: true }
);

attendanceSchema.index({ company: 1, employee: 1, date: 1 }, { unique: true });
export default mongoose.model('Attendance', attendanceSchema);

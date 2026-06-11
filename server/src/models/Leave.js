import mongoose from 'mongoose';
import { LEAVE_STATUS } from '../config/constants.js';

const leaveSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    type: { type: String, enum: ['CASUAL', 'SICK', 'EARNED', 'UNPAID', 'MATERNITY', 'PATERNITY'], default: 'CASUAL' },
    from: { type: Date, required: true },
    to: { type: Date, required: true },
    days: { type: Number, required: true },
    reason: String,
    status: { type: String, enum: Object.values(LEAVE_STATUS), default: LEAVE_STATUS.PENDING, index: true },
    approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    decisionNote: String,
    decidedAt: Date,
  },
  { timestamps: true }
);
export default mongoose.model('Leave', leaveSchema);

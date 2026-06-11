import mongoose from 'mongoose';

const leaveBalanceSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    year: { type: Number, required: true },
    balances: {
      CASUAL: { type: Number, default: 12 },
      SICK: { type: Number, default: 10 },
      EARNED: { type: Number, default: 15 },
    },
  },
  { timestamps: true }
);
leaveBalanceSchema.index({ company: 1, employee: 1, year: 1 }, { unique: true });
export default mongoose.model('LeaveBalance', leaveBalanceSchema);

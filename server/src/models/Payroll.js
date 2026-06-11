import mongoose from 'mongoose';
import { PAYROLL_STATUS } from '../config/constants.js';

const payrollSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    month: { type: Number, required: true }, // 1-12
    year: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    basic: Number,
    allowances: [{ label: String, amount: Number }],
    deductions: [{ label: String, amount: Number }],
    bonus: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    gross: Number,
    netPay: Number,
    paidLeaveDays: { type: Number, default: 0 },
    lopDays: { type: Number, default: 0 }, // loss of pay
    status: { type: String, enum: Object.values(PAYROLL_STATUS), default: PAYROLL_STATUS.GENERATED },
    payslip: { url: String, publicId: String },
    generatedAt: { type: Date, default: Date.now },
    paidAt: Date,
  },
  { timestamps: true }
);
payrollSchema.index({ company: 1, employee: 1, month: 1, year: 1 }, { unique: true });
export default mongoose.model('Payroll', payrollSchema);

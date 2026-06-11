import mongoose from 'mongoose';

// Per-employee salary definition. Monthly amounts.
const salaryStructureSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, unique: true, index: true },
    currency: { type: String, default: 'USD' },
    basic: { type: Number, required: true, default: 0 },
    allowances: [{ label: String, amount: Number }], // e.g. HRA, travel
    deductions: [{ label: String, amount: Number }], // fixed recurring deductions
    // simple progressive tax slabs on (basic+allowances). Override per company as needed.
    taxSlabs: [{ upTo: Number, rate: Number }], // rate as fraction e.g. 0.1
    effectiveFrom: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
export default mongoose.model('SalaryStructure', salaryStructureSchema);

import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    name: { type: String, required: true, trim: true },
    head: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
  },
  { timestamps: true }
);
departmentSchema.index({ company: 1, name: 1 }, { unique: true });
export default mongoose.model('Department', departmentSchema);

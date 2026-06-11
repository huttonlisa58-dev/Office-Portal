import mongoose from 'mongoose';

const designationSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    title: { type: String, required: true, trim: true },
    level: { type: Number, default: 1 },
  },
  { timestamps: true }
);
designationSchema.index({ company: 1, title: 1 }, { unique: true });
export default mongoose.model('Designation', designationSchema);

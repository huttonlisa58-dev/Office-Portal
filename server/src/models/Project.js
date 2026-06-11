import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    name: { type: String, required: true },
    description: String,
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
    status: { type: String, enum: ['ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'], default: 'ACTIVE' },
    startDate: Date,
    dueDate: Date,
  },
  { timestamps: true }
);
export default mongoose.model('Project', projectSchema);

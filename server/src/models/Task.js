import mongoose from 'mongoose';
import { TASK_STATUS } from '../config/constants.js';

const commentSchema = new mongoose.Schema(
  { author: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }, text: String, createdAt: { type: Date, default: Date.now } },
  { _id: true }
);

const taskSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null, index: true },
    title: { type: String, required: true },
    description: String,
    assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], default: 'MEDIUM' },
    status: { type: String, enum: Object.values(TASK_STATUS), default: TASK_STATUS.TODO, index: true },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    dueDate: Date,
    comments: [commentSchema],
  },
  { timestamps: true }
);
export default mongoose.model('Task', taskSchema);

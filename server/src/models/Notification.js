import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, default: 'GENERAL' }, // LEAVE, TASK, PAYROLL, ATTENDANCE...
    title: String,
    body: String,
    link: String,
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);
export default mongoose.model('Notification', notificationSchema);

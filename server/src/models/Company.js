import mongoose from 'mongoose';
import { SUBSCRIPTION_PLANS } from '../config/constants.js';

const subscriptionSchema = new mongoose.Schema(
  {
    plan: { type: String, enum: Object.keys(SUBSCRIPTION_PLANS), default: 'FREE' },
    status: { type: String, enum: ['ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELLED'], default: 'TRIALING' },
    seats: { type: Number, default: SUBSCRIPTION_PLANS.FREE.maxEmployees },
    startedAt: { type: Date, default: Date.now },
    renewsAt: Date,
  },
  { _id: false }
);

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    logo: { url: String, publicId: String },
    industry: String,
    size: String,
    timezone: { type: String, default: 'UTC' },
    address: { line1: String, city: String, state: String, country: String, zip: String },
    workSettings: {
      workdayStart: { type: String, default: '09:00' }, // HH:mm
      lateAfterMinutes: { type: Number, default: 15 },
      fullDayHours: { type: Number, default: 8 },
      weekends: { type: [Number], default: [0, 6] }, // 0=Sun
    },
    subscription: { type: subscriptionSchema, default: () => ({}) },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Company', companySchema);

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES } from '../config/constants.js';

const userSchema = new mongoose.Schema(
  {
    // company is null only for SUPER_ADMIN
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true, default: null },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.EMPLOYEE, index: true },
    // link to Employee profile when role is company-scoped staff
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },
    // OTP for email verification / password reset
    otp: { code: { type: String, select: false }, expiresAt: { type: Date, select: false } },
    lastLoginAt: Date,
  },
  { timestamps: true }
);

// Email must be unique per tenant (and globally for super admin where company=null)
userSchema.index({ company: 1, email: 1 }, { unique: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

export default mongoose.model('User', userSchema);

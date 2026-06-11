import mongoose from 'mongoose';
import Company from '../models/Company.js';
import User from '../models/User.js';
import { ROLES } from '../config/constants.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created } from '../utils/apiResponse.js';
import { signToken, generateOtp } from '../utils/token.js';
import { sendEmail, otpEmailTemplate } from '../utils/email.js';

const otpMinutes = () => Number(process.env.OTP_EXPIRES_MINUTES || 10);

const issueOtp = async (user) => {
  const code = generateOtp();
  user.otp = { code, expiresAt: new Date(Date.now() + otpMinutes() * 60000) };
  await user.save();
  await sendEmail({
    to: user.email,
    subject: 'Your HRMS verification code',
    html: otpEmailTemplate(user.name, code, otpMinutes()),
  });
};

const publicUser = (u) => ({
  id: u._id, name: u.name, email: u.email, role: u.role,
  company: u.company, isEmailVerified: u.isEmailVerified, employee: u.employee,
});

// POST /auth/register-company  → creates a Company + its COMPANY_ADMIN
export const registerCompany = asyncHandler(async (req, res) => {
  const { companyName, slug, name, email, password } = req.body;
  if (!companyName || !slug || !name || !email || !password)
    throw new ApiError(400, 'companyName, slug, name, email, password are required');

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const exists = await Company.findOne({ slug: slug.toLowerCase() }).session(session);
      if (exists) throw new ApiError(409, 'Company slug already taken');

      const [company] = await Company.create([{ name: companyName, slug: slug.toLowerCase() }], { session });
      const [admin] = await User.create(
        [{ company: company._id, name, email, password, role: ROLES.COMPANY_ADMIN }],
        { session }
      );
      result = { company, admin };
    });
    await issueOtp(result.admin);
    return created(res, { user: publicUser(result.admin), company: result.company },
      'Company created. Check email for the verification code.');
  } finally {
    session.endSession();
  }
});

// POST /auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, 'Email and password required');

  // email is unique per tenant; for staff login we match the most recent active match.
  const user = await User.findOne({ email: email.toLowerCase(), isActive: true })
    .select('+password')
    .sort({ updatedAt: -1 });
  if (!user || !(await user.comparePassword(password)))
    throw new ApiError(401, 'Invalid credentials');

  if (!user.isEmailVerified) {
    await issueOtp(user);
    throw new ApiError(403, 'Email not verified. A new code was sent.');
  }

  user.lastLoginAt = new Date();
  await user.save();
  const token = signToken({ id: user._id, role: user.role, company: user.company });
  return ok(res, { token, user: publicUser(user) }, 'Logged in');
});

// POST /auth/verify-otp
export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, code } = req.body;
  const user = await User.findOne({ email: email?.toLowerCase() }).select('+otp.code +otp.expiresAt');
  if (!user || !user.otp?.code) throw new ApiError(400, 'No pending verification');
  if (user.otp.code !== code) throw new ApiError(400, 'Invalid code');
  if (user.otp.expiresAt < new Date()) throw new ApiError(400, 'Code expired');

  user.isEmailVerified = true;
  user.otp = undefined;
  await user.save();
  const token = signToken({ id: user._id, role: user.role, company: user.company });
  return ok(res, { token, user: publicUser(user) }, 'Email verified');
});

// POST /auth/resend-otp
export const resendOtp = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email?.toLowerCase() });
  if (!user) return ok(res, {}, 'If the account exists, a code was sent'); // no enumeration
  await issueOtp(user);
  return ok(res, {}, 'Verification code sent');
});

// POST /auth/forgot-password
export const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email?.toLowerCase() });
  if (user) await issueOtp(user);
  return ok(res, {}, 'If the account exists, a reset code was sent');
});

// POST /auth/reset-password
export const resetPassword = asyncHandler(async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) throw new ApiError(400, 'Password must be at least 8 chars');
  const user = await User.findOne({ email: email?.toLowerCase() }).select('+otp.code +otp.expiresAt');
  if (!user || !user.otp?.code || user.otp.code !== code) throw new ApiError(400, 'Invalid code');
  if (user.otp.expiresAt < new Date()) throw new ApiError(400, 'Code expired');

  user.password = newPassword;
  user.otp = undefined;
  user.isEmailVerified = true;
  await user.save();
  return ok(res, {}, 'Password reset successful');
});

// GET /auth/me
export const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('company', 'name slug logo subscription');
  return ok(res, { user: publicUser(user), company: user.company });
});

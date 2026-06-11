import Company from '../models/Company.js';
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import { ROLES, SUBSCRIPTION_PLANS } from '../config/constants.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created } from '../utils/apiResponse.js';

// GET /companies  (SUPER_ADMIN) — list all tenants with counts
export const listCompanies = asyncHandler(async (req, res) => {
  const companies = await Company.find().sort({ createdAt: -1 }).lean();
  const withCounts = await Promise.all(
    companies.map(async (c) => ({
      ...c,
      employeeCount: await Employee.countDocuments({ company: c._id }),
    }))
  );
  return ok(res, { companies: withCounts });
});

// GET /companies/:id
export const getCompany = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) throw new ApiError(404, 'Company not found');
  return ok(res, { company });
});

// PATCH /companies/:id  — update profile / work settings
export const updateCompany = asyncHandler(async (req, res) => {
  const allowed = ['name', 'industry', 'size', 'timezone', 'address', 'workSettings', 'isActive', 'logo'];
  const update = {};
  for (const k of allowed) if (k in req.body) update[k] = req.body[k];
  const company = await Company.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
  if (!company) throw new ApiError(404, 'Company not found');
  return ok(res, { company }, 'Company updated');
});

// PATCH /companies/:id/subscription  (SUPER_ADMIN)
export const updateSubscription = asyncHandler(async (req, res) => {
  const { plan, status } = req.body;
  if (plan && !SUBSCRIPTION_PLANS[plan]) throw new ApiError(400, 'Unknown plan');
  const company = await Company.findById(req.params.id);
  if (!company) throw new ApiError(404, 'Company not found');
  if (plan) {
    company.subscription.plan = plan;
    company.subscription.seats = SUBSCRIPTION_PLANS[plan].maxEmployees;
  }
  if (status) company.subscription.status = status;
  await company.save();
  return ok(res, { company }, 'Subscription updated');
});

// POST /companies/:id/hr  — company admin or super admin creates an HR user
export const createHrUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) throw new ApiError(400, 'name, email, password required');
  const companyId = req.params.id;
  const user = await User.create({
    company: companyId, name, email, password, role: ROLES.HR, isEmailVerified: true,
  });
  return created(res, { user: { id: user._id, name, email, role: user.role } }, 'HR user created');
});

// DELETE /companies/:id  (SUPER_ADMIN) — soft delete
export const deactivateCompany = asyncHandler(async (req, res) => {
  const company = await Company.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!company) throw new ApiError(404, 'Company not found');
  return ok(res, {}, 'Company deactivated');
});

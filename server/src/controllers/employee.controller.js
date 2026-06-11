import Company from '../models/Company.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';
import { ROLES, SUBSCRIPTION_PLANS } from '../config/constants.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created } from '../utils/apiResponse.js';
import { uploadBuffer, deleteAsset } from '../utils/cloudinary.js';

// Generates a tenant-unique human-readable employee ID like ACME-0007
async function nextEmployeeId(companyId) {
  const company = await Company.findById(companyId).lean();
  const prefix = (company?.slug || 'EMP').slice(0, 4).toUpperCase();
  const count = await Employee.countDocuments({ company: companyId });
  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
}

// POST /employees  — create employee (+ optional self-service login account)
export const createEmployee = asyncHandler(async (req, res) => {
  const companyId = req.companyId;

  // enforce subscription seat limit
  const company = await Company.findById(companyId).lean();
  const seatLimit = SUBSCRIPTION_PLANS[company.subscription.plan]?.maxEmployees ?? 10;
  const current = await Employee.countDocuments({ company: companyId });
  if (current >= seatLimit) throw new ApiError(402, `Seat limit reached for ${company.subscription.plan} plan`);

  const { firstName, lastName, email, phone, department, designation, createLogin, password } = req.body;
  if (!firstName) throw new ApiError(400, 'firstName is required');

  const employeeId = req.body.employeeId || (await nextEmployeeId(companyId));
  const employee = await Employee.create({
    company: companyId, employeeId, firstName, lastName, email, phone,
    department: department || undefined, designation: designation || undefined,
    dob: req.body.dob, gender: req.body.gender, address: req.body.address,
    manager: req.body.manager || undefined, dateOfJoining: req.body.dateOfJoining,
    employmentType: req.body.employmentType,
  });

  // optional self-service account
  if (createLogin && email) {
    const user = await User.create({
      company: companyId, name: `${firstName} ${lastName || ''}`.trim(),
      email, password: password || 'Welcome@123', role: ROLES.EMPLOYEE,
      employee: employee._id, isEmailVerified: true,
    });
    employee.user = user._id;
    await employee.save();
  }

  return created(res, { employee }, 'Employee created');
});

// GET /employees  — paginated list scoped to tenant, with search + filters
export const listEmployees = asyncHandler(async (req, res) => {
  const { q, department, status, page = 1, limit = 20 } = req.query;
  const filter = { company: req.companyId };
  if (department) filter.department = department;
  if (status) filter.status = status;
  if (q) filter.$or = [
    { firstName: new RegExp(q, 'i') }, { lastName: new RegExp(q, 'i') },
    { employeeId: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') },
  ];

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Employee.find(filter).populate('department', 'name').populate('designation', 'title')
      .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Employee.countDocuments(filter),
  ]);
  return ok(res, { items, total, page: Number(page), pages: Math.ceil(total / limit) });
});

// GET /employees/:id
export const getEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({ _id: req.params.id, company: req.companyId })
    .populate('department', 'name').populate('designation', 'title').populate('manager', 'firstName lastName');
  if (!employee) throw new ApiError(404, 'Employee not found');
  return ok(res, { employee });
});

// PATCH /employees/:id
export const updateEmployee = asyncHandler(async (req, res) => {
  const blocked = ['company', 'employeeId', 'user', 'faceEmbedding'];
  const update = { ...req.body };
  blocked.forEach((k) => delete update[k]);
  const employee = await Employee.findOneAndUpdate(
    { _id: req.params.id, company: req.companyId }, update, { new: true, runValidators: true }
  );
  if (!employee) throw new ApiError(404, 'Employee not found');
  return ok(res, { employee }, 'Employee updated');
});

// DELETE /employees/:id
export const deleteEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findOneAndDelete({ _id: req.params.id, company: req.companyId });
  if (!employee) throw new ApiError(404, 'Employee not found');
  if (employee.user) await User.findByIdAndUpdate(employee.user, { isActive: false });
  return ok(res, {}, 'Employee deleted');
});

// POST /employees/:id/documents  (multipart: file, name, type)
export const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'File required');
  const employee = await Employee.findOne({ _id: req.params.id, company: req.companyId });
  if (!employee) throw new ApiError(404, 'Employee not found');

  const result = await uploadBuffer(req.file.buffer, `hrms/${req.companyId}/employees`);
  employee.documents.push({
    name: req.body.name || req.file.originalname,
    type: req.body.type || req.file.mimetype,
    url: result.secure_url, publicId: result.public_id,
  });
  await employee.save();
  return created(res, { documents: employee.documents }, 'Document uploaded');
});

// DELETE /employees/:id/documents/:docId
export const deleteDocument = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({ _id: req.params.id, company: req.companyId });
  if (!employee) throw new ApiError(404, 'Employee not found');
  const doc = employee.documents.id(req.params.docId);
  if (!doc) throw new ApiError(404, 'Document not found');
  if (doc.publicId) await deleteAsset(doc.publicId).catch(() => {});
  doc.deleteOne();
  await employee.save();
  return ok(res, { documents: employee.documents }, 'Document removed');
});

// POST /employees/:id/avatar  (multipart: file)
export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'File required');
  const employee = await Employee.findOne({ _id: req.params.id, company: req.companyId });
  if (!employee) throw new ApiError(404, 'Employee not found');
  const result = await uploadBuffer(req.file.buffer, `hrms/${req.companyId}/avatars`, 'image');
  if (employee.avatar?.publicId) await deleteAsset(employee.avatar.publicId).catch(() => {});
  employee.avatar = { url: result.secure_url, publicId: result.public_id };
  await employee.save();
  return ok(res, { avatar: employee.avatar }, 'Avatar updated');
});

import Department from '../models/Department.js';
import Designation from '../models/Designation.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created } from '../utils/apiResponse.js';

// ---- Departments ----
export const listDepartments = asyncHandler(async (req, res) => {
  const items = await Department.find({ company: req.companyId }).populate('head', 'firstName lastName').sort('name');
  return ok(res, { items });
});
export const createDepartment = asyncHandler(async (req, res) => {
  if (!req.body.name) throw new ApiError(400, 'name required');
  const dept = await Department.create({ company: req.companyId, name: req.body.name, head: req.body.head });
  return created(res, { department: dept });
});
export const updateDepartment = asyncHandler(async (req, res) => {
  const dept = await Department.findOneAndUpdate(
    { _id: req.params.id, company: req.companyId }, req.body, { new: true }
  );
  if (!dept) throw new ApiError(404, 'Department not found');
  return ok(res, { department: dept });
});
export const deleteDepartment = asyncHandler(async (req, res) => {
  const dept = await Department.findOneAndDelete({ _id: req.params.id, company: req.companyId });
  if (!dept) throw new ApiError(404, 'Department not found');
  return ok(res, {}, 'Deleted');
});

// ---- Designations ----
export const listDesignations = asyncHandler(async (req, res) => {
  const items = await Designation.find({ company: req.companyId }).sort('level');
  return ok(res, { items });
});
export const createDesignation = asyncHandler(async (req, res) => {
  if (!req.body.title) throw new ApiError(400, 'title required');
  const d = await Designation.create({ company: req.companyId, title: req.body.title, level: req.body.level });
  return created(res, { designation: d });
});
export const deleteDesignation = asyncHandler(async (req, res) => {
  const d = await Designation.findOneAndDelete({ _id: req.params.id, company: req.companyId });
  if (!d) throw new ApiError(404, 'Designation not found');
  return ok(res, {}, 'Deleted');
});

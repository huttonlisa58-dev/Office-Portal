import Task from '../models/Task.js';
import Project from '../models/Project.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created } from '../utils/apiResponse.js';
import { notify } from '../services/notification.service.js';
import Employee from '../models/Employee.js';

// ---- Projects ----
export const createProject = asyncHandler(async (req, res) => {
  const project = await Project.create({ company: req.companyId, ...req.body });
  return created(res, { project });
});
export const listProjects = asyncHandler(async (req, res) => {
  const items = await Project.find({ company: req.companyId })
    .populate('owner', 'firstName lastName').sort({ createdAt: -1 });
  return ok(res, { items });
});

// ---- Tasks ----
export const createTask = asyncHandler(async (req, res) => {
  const { title } = req.body;
  if (!title) throw new ApiError(400, 'title required');
  const task = await Task.create({ company: req.companyId, createdBy: req.user._id, ...req.body });

  // notify assignees
  const assignees = await Employee.find({ _id: { $in: task.assignees || [] }, company: req.companyId });
  for (const emp of assignees) {
    if (emp.user) await notify({
      company: req.companyId, user: emp.user, type: 'TASK',
      title: 'New task assigned', body: task.title, email: emp.email,
    });
  }
  return created(res, { task });
});

export const listTasks = asyncHandler(async (req, res) => {
  const { status, project, assignee, mine } = req.query;
  const filter = { company: req.companyId };
  if (status) filter.status = status;
  if (project) filter.project = project;
  if (assignee) filter.assignees = assignee;
  if (mine && req.user.employee) filter.assignees = req.user.employee;
  const items = await Task.find(filter)
    .populate('assignees', 'firstName lastName employeeId')
    .populate('project', 'name').sort({ dueDate: 1, createdAt: -1 });
  return ok(res, { items });
});

export const updateTask = asyncHandler(async (req, res) => {
  const allowed = ['title', 'description', 'assignees', 'priority', 'status', 'progress', 'dueDate', 'project'];
  const update = {};
  for (const k of allowed) if (k in req.body) update[k] = req.body[k];
  if (update.status === 'DONE') update.progress = 100;
  const task = await Task.findOneAndUpdate({ _id: req.params.id, company: req.companyId }, update, { new: true });
  if (!task) throw new ApiError(404, 'Task not found');
  return ok(res, { task }, 'Task updated');
});

export const addComment = asyncHandler(async (req, res) => {
  if (!req.body.text) throw new ApiError(400, 'text required');
  const task = await Task.findOne({ _id: req.params.id, company: req.companyId });
  if (!task) throw new ApiError(404, 'Task not found');
  task.comments.push({ author: req.user.employee, text: req.body.text });
  await task.save();
  return ok(res, { comments: task.comments }, 'Comment added');
});

export const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findOneAndDelete({ _id: req.params.id, company: req.companyId });
  if (!task) throw new ApiError(404, 'Task not found');
  return ok(res, {}, 'Deleted');
});

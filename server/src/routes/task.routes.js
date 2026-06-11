import { Router } from 'express';
import * as c from '../controllers/task.controller.js';
import { protect } from '../middleware/auth.js';
import { resolveTenant, requireTenant } from '../middleware/tenant.js';

const r = Router();
r.use(protect, resolveTenant, requireTenant);
r.get('/projects', c.listProjects);
r.post('/projects', c.createProject);
r.get('/', c.listTasks);
r.post('/', c.createTask);
r.patch('/:id', c.updateTask);
r.delete('/:id', c.deleteTask);
r.post('/:id/comments', c.addComment);
export default r;

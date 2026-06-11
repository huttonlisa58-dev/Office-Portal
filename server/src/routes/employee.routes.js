import { Router } from 'express';
import * as c from '../controllers/employee.controller.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { resolveTenant, requireTenant } from '../middleware/tenant.js';
import { upload } from '../middleware/upload.js';
import { ROLES } from '../config/constants.js';

const r = Router();
r.use(protect, resolveTenant, requireTenant);
const manage = authorize(ROLES.COMPANY_ADMIN, ROLES.HR, ROLES.SUPER_ADMIN);

r.get('/', c.listEmployees);
r.post('/', manage, c.createEmployee);
r.get('/:id', c.getEmployee);
r.patch('/:id', manage, c.updateEmployee);
r.delete('/:id', manage, c.deleteEmployee);
r.post('/:id/documents', manage, upload.single('file'), c.uploadDocument);
r.delete('/:id/documents/:docId', manage, c.deleteDocument);
r.post('/:id/avatar', upload.single('file'), c.uploadAvatar);
export default r;

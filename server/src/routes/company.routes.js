import { Router } from 'express';
import * as c from '../controllers/company.controller.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { ROLES } from '../config/constants.js';

const r = Router();
r.use(protect);
r.get('/', authorize(ROLES.SUPER_ADMIN), c.listCompanies);
r.get('/:id', authorize(ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN), c.getCompany);
r.patch('/:id', authorize(ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN), c.updateCompany);
r.patch('/:id/subscription', authorize(ROLES.SUPER_ADMIN), c.updateSubscription);
r.post('/:id/hr', authorize(ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN), c.createHrUser);
r.delete('/:id', authorize(ROLES.SUPER_ADMIN), c.deactivateCompany);
export default r;

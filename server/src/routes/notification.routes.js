import { Router } from 'express';
import * as c from '../controllers/notification.controller.js';
import { protect } from '../middleware/auth.js';

const r = Router();
r.use(protect);
r.get('/', c.listNotifications);
r.patch('/:id/read', c.markRead);
r.patch('/read-all', c.markAllRead);
export default r;

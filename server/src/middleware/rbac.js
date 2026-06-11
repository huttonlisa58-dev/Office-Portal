import { ApiError } from '../utils/ApiError.js';

// Usage: authorize(ROLES.HR, ROLES.COMPANY_ADMIN)
export const authorize = (...allowed) => (req, res, next) => {
  if (!req.user) return next(new ApiError(401, 'Not authenticated'));
  if (!allowed.includes(req.user.role)) {
    return next(new ApiError(403, 'You do not have permission for this action'));
  }
  next();
};

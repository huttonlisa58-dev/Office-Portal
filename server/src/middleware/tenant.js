import { ApiError } from '../utils/ApiError.js';
import { ROLES } from '../config/constants.js';

// Resolves the active tenant (company) for the request.
// - SUPER_ADMIN may target any company via ?companyId / header x-company-id (optional).
// - Everyone else is locked to their own company.
export const resolveTenant = (req, res, next) => {
  if (!req.user) return next(new ApiError(401, 'Not authenticated'));

  if (req.user.role === ROLES.SUPER_ADMIN) {
    const override = req.headers['x-company-id'] || req.query.companyId || req.body?.companyId;
    req.companyId = override || null; // null = platform-wide
    return next();
  }

  if (!req.user.company) return next(new ApiError(403, 'No company associated with this account'));
  req.companyId = String(req.user.company);
  next();
};

// Guard for routes that strictly require a tenant context.
export const requireTenant = (req, res, next) => {
  if (!req.companyId) return next(new ApiError(400, 'Company context required'));
  next();
};

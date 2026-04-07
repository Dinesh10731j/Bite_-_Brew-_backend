import { Request, Response, NextFunction } from 'express';
import { User } from "../entities/user/user.entity";

/**
 * Role check middleware. Requires user in req.user from auth middleware.
 * @param allowedRoles - Array of allowed roles e.g. ['admin', 'user']
 */
export const roleCheck = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes((req.user as User).role)) {
      return res.status(403).json({ message: `Role required: ${allowedRoles.join(', ')}` });
    }
    next();
  };
};

// Usage: export const isAdmin = roleCheck(['admin']);


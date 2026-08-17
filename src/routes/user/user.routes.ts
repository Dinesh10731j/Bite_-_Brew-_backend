import { Router } from 'express';
import { AuthController } from '../../controller/auth/auth.controller';
import { UserController } from '../../controller/user/user.controller';
import { jwtVerify } from '../../middleware/auth.middleware';
import { cacheGet, invalidateCacheByNamespace } from '../../middleware/cache.middleware';
import { roleCheck } from '../../middleware/roleCheck.middleware';
import {
  loginRateLimiter,
  passwordResetRateLimiter,
  refreshRateLimiter,
  registrationRateLimiter,
} from '../../middleware/securityRateLimit.middleware';
// no image upload needed for user/staff endpoints any more

const router = Router();

router.post('/auth/signup', registrationRateLimiter, AuthController.signup);
router.post('/auth/signin', loginRateLimiter, AuthController.signin);
router.post('/auth/logout', AuthController.logout);
router.post('/auth/refresh-token', refreshRateLimiter, AuthController.refreshToken);
router.post('/auth/forgot-password', passwordResetRateLimiter, AuthController.forgotPassword);
router.post('/auth/reset-password', passwordResetRateLimiter, AuthController.resetPassword);

router.get(
  '/users',
  jwtVerify,
  roleCheck(['admin', 'manager']),
  cacheGet({ namespace: 'users', ttlSeconds: 60 }),
  UserController.findAll,
);
router.get(
  '/users/me',
  jwtVerify,
  cacheGet({ namespace: 'users', ttlSeconds: 30 }),
  UserController.me,
);
// staff endpoints moved to dedicated staff router
// Old staff endpoints are no longer exposed here.
router.patch(
  '/users/:id/role',
  jwtVerify,
  roleCheck(['admin']),
  invalidateCacheByNamespace(['users']),
  UserController.updateRole,
);

export default router;

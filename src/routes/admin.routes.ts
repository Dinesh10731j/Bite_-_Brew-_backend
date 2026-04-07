import { Router } from 'express';
import { jwtVerify, isAdmin } from '../middleware/auth.middleware';
import { analytics, messagesList, ordersList, overview } from '../controller/admin/dashboard.controller';

const router = Router();

router.use(jwtVerify, isAdmin);

// Dashboard
router.get('/dashboard', overview);
router.get('/analytics', analytics);

// Orders
router.get('/orders', ordersList);

// Messages
router.get('/messages', messagesList);

// Add more...

export default router;



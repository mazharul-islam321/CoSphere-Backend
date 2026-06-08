import { Router } from 'express';
import { DashboardController } from './dashboard.controller';
import { authenticateJWT } from '../../middlewares/auth';

const router = Router();

router.get('/', authenticateJWT, DashboardController.getDashboardStats);

export const DashboardRoutes = router;

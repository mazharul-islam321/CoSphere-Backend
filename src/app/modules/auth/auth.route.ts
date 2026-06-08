import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticateJWT } from '../../middlewares/auth';

const router = Router();

router.post('/signup', AuthController.signup);
router.post('/login', AuthController.login);
router.post('/logout', AuthController.logout);
router.get('/me', authenticateJWT, AuthController.me);
router.get('/users', authenticateJWT, AuthController.getUsers);

export const AuthRoutes = router;

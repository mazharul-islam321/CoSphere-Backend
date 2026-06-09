import { Router } from 'express';
import { ProjectController } from './project.controller';
import { authenticateJWT, requireRole } from '../../middlewares/auth';
import { Role } from '../../../generated/client/client';

const router = Router();

router.use(authenticateJWT);

router.get('/', ProjectController.getProjects);
router.get('/:id', ProjectController.getProjectById);

// Project management is restricted to Admin and PM roles
router.post('/', requireRole([Role.ADMIN, Role.PROJECT_MANAGER]), ProjectController.createProject);
router.put('/:id', requireRole([Role.ADMIN, Role.PROJECT_MANAGER]), ProjectController.updateProject);
router.delete('/:id', requireRole([Role.ADMIN, Role.PROJECT_MANAGER]), ProjectController.deleteProject);

// Project membership management
router.post('/:id/members', requireRole([Role.ADMIN, Role.PROJECT_MANAGER]), ProjectController.addMemberToProject);
router.delete('/:id/members', requireRole([Role.ADMIN, Role.PROJECT_MANAGER]), ProjectController.removeMemberFromProject);

export const ProjectRoutes = router;

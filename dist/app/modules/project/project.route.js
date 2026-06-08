"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectRoutes = void 0;
const express_1 = require("express");
const project_controller_1 = require("./project.controller");
const auth_1 = require("../../middlewares/auth");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateJWT);
router.get('/', project_controller_1.ProjectController.getProjects);
router.get('/:id', project_controller_1.ProjectController.getProjectById);
// Project management is restricted to Admin and PM roles
router.post('/', (0, auth_1.requireRole)([client_1.Role.ADMIN, client_1.Role.PROJECT_MANAGER]), project_controller_1.ProjectController.createProject);
router.put('/:id', (0, auth_1.requireRole)([client_1.Role.ADMIN, client_1.Role.PROJECT_MANAGER]), project_controller_1.ProjectController.updateProject);
router.delete('/:id', (0, auth_1.requireRole)([client_1.Role.ADMIN, client_1.Role.PROJECT_MANAGER]), project_controller_1.ProjectController.deleteProject);
// Project membership management
router.post('/:id/members', (0, auth_1.requireRole)([client_1.Role.ADMIN, client_1.Role.PROJECT_MANAGER]), project_controller_1.ProjectController.addMemberToProject);
router.delete('/:id/members', (0, auth_1.requireRole)([client_1.Role.ADMIN, client_1.Role.PROJECT_MANAGER]), project_controller_1.ProjectController.removeMemberFromProject);
exports.ProjectRoutes = router;

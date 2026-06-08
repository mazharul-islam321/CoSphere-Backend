"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskRoutes = void 0;
const express_1 = require("express");
const task_controller_1 = require("./task.controller");
const auth_1 = require("../../middlewares/auth");
const upload_1 = require("../../middlewares/upload");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateJWT);
router.get('/', task_controller_1.TaskController.getTasks);
router.post('/', task_controller_1.TaskController.createTask);
router.put('/:id', task_controller_1.TaskController.updateTask);
router.delete('/:id', task_controller_1.TaskController.deleteTask);
// Task collaboration features
router.post('/:id/comments', task_controller_1.TaskController.addComment);
router.post('/:id/attachments', upload_1.upload.single('file'), task_controller_1.TaskController.addAttachment);
exports.TaskRoutes = router;

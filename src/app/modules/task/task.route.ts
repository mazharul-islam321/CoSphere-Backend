import { Router } from 'express';
import { TaskController } from './task.controller';
import { authenticateJWT } from '../../middlewares/auth';
import { upload } from '../../middlewares/upload';

const router = Router();

router.use(authenticateJWT);

router.get('/', TaskController.getTasks);
router.post('/', TaskController.createTask);
router.put('/:id', TaskController.updateTask);
router.delete('/:id', TaskController.deleteTask);

// Task collaboration features
router.post('/:id/comments', TaskController.addComment);
router.post('/:id/attachments', upload.single('file'), TaskController.addAttachment);

export const TaskRoutes = router;

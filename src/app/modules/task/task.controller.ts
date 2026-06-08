import { Request, Response } from 'express';
import * as fs from 'fs';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { httpStatus } from '../../../shared/http-status';
import { TaskService } from './task.service';
import { AuthenticatedRequest } from '../../middlewares/auth';
import ApiError from '../../../errors/ApiError';

const getTasks = catchAsync(async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user!;
  const {
    page = 1,
    limit = 10,
    search,
    status,
    priority,
    assignedMemberId,
    deadlineFilter,
    sortBy = 'dueDate',
    sortOrder = 'asc',
    projectId,
  } = req.query;

  const result = await TaskService.getTasks(user, {
    page: Number(page),
    limit: Number(limit),
    search: search as string,
    status: status as any,
    priority: priority as any,
    assignedMemberId: assignedMemberId as string,
    deadlineFilter: deadlineFilter as string,
    sortBy: sortBy as string,
    sortOrder: sortOrder as 'asc' | 'desc',
    projectId: projectId as string,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Tasks retrieved successfully.',
    data: result,
  });
});

const createTask = catchAsync(async (req: Request, res: Response) => {
  const { title, description, dueDate, priority, assignedMemberId, projectId } = req.body;
  const user = (req as AuthenticatedRequest).user!;

  if (!title || !dueDate || !projectId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Title, due date, and project ID are required.');
  }

  const result = await TaskService.createTask(
    { title, description, dueDate, priority, assignedMemberId, projectId },
    user
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Task created successfully.',
    data: result,
  });
});

const updateTask = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as AuthenticatedRequest).user!;
  const result = await TaskService.updateTask(id, req.body, user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Task updated successfully.',
    data: result,
  });
});

const deleteTask = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as AuthenticatedRequest).user!;
  const result = await TaskService.deleteTask(id, user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Task deleted successfully.',
    data: { task: result },
  });
});

const addComment = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params; // task ID
  const { content } = req.body;
  const user = (req as AuthenticatedRequest).user!;

  if (!content) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Comment content is required.');
  }

  const result = await TaskService.addComment(id, content, user);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Comment added successfully.',
    data: result,
  });
});

const addAttachment = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params; // task ID
  const user = (req as AuthenticatedRequest).user!;

  if (!req.file) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'No file uploaded.');
  }

  try {
    const result = await TaskService.addAttachment(id, req.file, user);
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: 'Attachment uploaded successfully.',
      data: result,
    });
  } catch (err) {
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    throw err;
  }
});

export const TaskController = {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  addComment,
  addAttachment,
};

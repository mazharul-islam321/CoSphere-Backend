import { Task, TaskStatus, TaskPriority, Role, Comment, Attachment } from '../../../generated/client/client';
import prisma from '../../../shared/prisma';
import ApiError from '../../../errors/ApiError';
import { httpStatus } from '../../../shared/http-status';

const isPastDate = (date: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  return targetDate.getTime() < today.getTime();
};

const getTasks = async (
  user: { id: string; role: Role },
  options: {
    page: number;
    limit: number;
    search?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    assignedMemberId?: string;
    deadlineFilter?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    projectId?: string;
  }
): Promise<{ meta: { page: number; limit: number; total: number }; data: Task[] }> => {
  const {
    page,
    limit,
    search,
    status,
    priority,
    assignedMemberId,
    deadlineFilter,
    sortBy = 'dueDate',
    sortOrder = 'asc',
    projectId,
  } = options;
  const skip = (page - 1) * limit;
  const take = limit;

  // Build Prisma where filter
  const where: any = {};

  // Access control
  if (user.role !== Role.ADMIN) {
    where.project = {
      OR: [
        { creatorId: user.id },
        { members: { some: { id: user.id } } },
      ],
    };
  }

  // Project Filter
  if (projectId) {
    where.projectId = projectId;
  }

  // Search filter (title or description)
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Status Filter
  if (status && status !== 'ALL' as any) {
    where.status = status;
  }

  // Priority Filter
  if (priority && priority !== 'ALL' as any) {
    where.priority = priority;
  }

  // Assignee Filter
  if (assignedMemberId && assignedMemberId !== 'ALL' as any) {
    if (assignedMemberId === 'UNASSIGNED') {
      where.assignedMemberId = null;
    } else {
      where.assignedMemberId = assignedMemberId;
    }
  }

  // Deadline Filter (past or upcoming relative to current date)
  if (deadlineFilter && deadlineFilter !== 'ALL') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (deadlineFilter === 'OVERDUE') {
      where.dueDate = { lt: today };
      where.status = { not: TaskStatus.COMPLETED };
    } else if (deadlineFilter === 'UPCOMING') {
      where.dueDate = { gte: today };
      where.status = { not: TaskStatus.COMPLETED };
    }
  }

  // Sorting
  const orderBy: any = {};
  orderBy[sortBy] = sortOrder;

  const [data, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        assignedMember: { select: { id: true, name: true, email: true } },
      },
      orderBy,
      skip,
      take,
    }),
    prisma.task.count({ where }),
  ]);

  return {
    meta: {
      page,
      limit,
      total,
    },
    data,
  };
};

const createTask = async (
  payload: {
    title: string;
    description?: string;
    dueDate: string;
    priority?: TaskPriority;
    assignedMemberId?: string | null;
    projectId: string;
  },
  user: { id: string; name: string; role: Role }
): Promise<Task> => {
  if (user.role === Role.TEAM_MEMBER) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Access denied. Team members cannot create tasks.');
  }

  // Validate Project
  const project = await prisma.project.findUnique({
    where: { id: payload.projectId },
    include: { members: true },
  });
  if (!project) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Project not found.');
  }

  // Rule: Prevent duplicate task titles inside the same project
  const duplicate = await prisma.task.findFirst({
    where: {
      projectId: payload.projectId,
      title: { equals: payload.title, mode: 'insensitive' },
    },
  });
  if (duplicate) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'This task already exists in the project.');
  }

  // Rule: Prevent setting past dates as deadlines
  const parsedDueDate = new Date(payload.dueDate);
  if (isNaN(parsedDueDate.getTime()) || isPastDate(parsedDueDate)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Please select a valid deadline.');
  }

  // If assigning, check if user exists and is member of the project
  if (payload.assignedMemberId) {
    const isMember = project.members.some((m) => m.id === payload.assignedMemberId) || project.creatorId === payload.assignedMemberId;
    if (!isMember) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Assigned member must be a member of the project.');
    }
  }

  const task = await prisma.task.create({
    data: {
      title: payload.title,
      description: payload.description,
      dueDate: parsedDueDate,
      priority: payload.priority || TaskPriority.MEDIUM,
      status: TaskStatus.TODO,
      projectId: payload.projectId,
      assignedMemberId: payload.assignedMemberId || null,
    },
    include: {
      assignedMember: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
  });

  // Track activity
  const assigneeText = task.assignedMember ? ` assigned to ${task.assignedMember.name}` : '';
  await prisma.activity.create({
    data: { description: `Task "${task.title}" created in project "${project.name}"${assigneeText}` },
  });

  return task;
};

const updateTask = async (
  id: string,
  payload: {
    title?: string;
    description?: string;
    dueDate?: string;
    priority?: TaskPriority;
    status?: TaskStatus;
    assignedMemberId?: string | null;
  },
  user: { id: string; name: string; role: Role }
): Promise<Task> => {
  const task = await prisma.task.findUnique({
    where: { id },
    include: { project: true },
  });
  if (!task) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Task not found.');
  }

  // RBAC check: Team Member can ONLY update status, and ONLY if assigned to them.
  if (user.role === Role.TEAM_MEMBER) {
    const isAssigned = task.assignedMemberId === user.id;
    if (!isAssigned) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Access denied. You can only update tasks assigned to you.');
    }

    // Check if trying to edit other fields
    if (payload.title || payload.description || payload.dueDate || payload.priority || payload.assignedMemberId !== undefined) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Access denied. Team members can only update task status.');
    }
  }

  const updateData: any = {};

  // Rule: Prevent setting past dates as deadlines (Admin/PM only)
  if (payload.dueDate) {
    const parsedDueDate = new Date(payload.dueDate);
    if (isNaN(parsedDueDate.getTime()) || isPastDate(parsedDueDate)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Please select a valid deadline.');
    }
    updateData.dueDate = parsedDueDate;
  }

  // Rule: Prevent duplicate task titles inside the same project (Admin/PM only)
  if (payload.title && payload.title.toLowerCase() !== task.title.toLowerCase()) {
    const duplicate = await prisma.task.findFirst({
      where: {
        projectId: task.projectId,
        title: { equals: payload.title, mode: 'insensitive' },
        id: { not: id },
      },
    });
    if (duplicate) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'This task already exists in the project.');
    }
    updateData.title = payload.title;
  }

  // Rule: Prevent assigning completed tasks
  if (task.status === TaskStatus.COMPLETED && payload.assignedMemberId && payload.assignedMemberId !== task.assignedMemberId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Completed tasks cannot be reassigned.');
  }

  if (payload.status === TaskStatus.COMPLETED && payload.assignedMemberId && payload.assignedMemberId !== task.assignedMemberId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Completed tasks cannot be reassigned.');
  }

  if (payload.description !== undefined) updateData.description = payload.description;
  if (payload.priority) updateData.priority = payload.priority;
  if (payload.status) updateData.status = payload.status;
  if (payload.assignedMemberId !== undefined) {
    if (payload.assignedMemberId === null) {
      updateData.assignedMemberId = null;
    } else {
      // Check if new assignee is a member of the project
      const project = await prisma.project.findUnique({
        where: { id: task.projectId },
        include: { members: true },
      });
      const isMember = project?.members.some((m) => m.id === payload.assignedMemberId) || project?.creatorId === payload.assignedMemberId;
      if (!isMember) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Assigned member must be a member of the project.');
      }
      updateData.assignedMemberId = payload.assignedMemberId;
    }
  }

  const updatedTask = await prisma.task.update({
    where: { id },
    data: updateData,
    include: {
      assignedMember: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true } },
    },
  });

  // Track activity if status changed
  if (payload.status && payload.status !== task.status) {
    await prisma.activity.create({
      data: { description: `Task "${updatedTask.title}" marked as ${payload.status} by ${user.name}` },
    });
  } else {
    await prisma.activity.create({
      data: { description: `Task "${updatedTask.title}" updated by ${user.name}` },
    });
  }

  return updatedTask;
};

const deleteTask = async (id: string, user: { id: string; name: string; role: Role }): Promise<Task> => {
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Task not found.');
  }

  // RBAC: only Admin or PM can delete tasks
  if (user.role === Role.TEAM_MEMBER) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Access denied. Team members cannot delete tasks.');
  }

  const deletedTask = await prisma.task.delete({ where: { id } });

  // Track activity
  await prisma.activity.create({
    data: { description: `Task "${task.title}" deleted by ${user.name}` },
  });

  return deletedTask;
};

const addComment = async (taskId: string, content: string, user: { id: string; role: Role }): Promise<Comment> => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: { include: { members: true } } },
  });

  if (!task) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Task not found.');
  }

  // Verify user has access to task project (or is assignee)
  const isMember = task.project.members.some((m) => m.id === user.id) || task.project.creatorId === user.id;
  const isAdmin = user.role === Role.ADMIN;
  const isAssignee = task.assignedMemberId === user.id;

  if (!isMember && !isAdmin && !isAssignee) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have access to comment on this task.');
  }

  const comment = await prisma.comment.create({
    data: {
      content,
      taskId,
      authorId: user.id,
    },
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
  });

  return comment;
};

const addAttachment = async (taskId: string, file: { originalname: string; filename: string }, user: { id: string; role: Role }): Promise<Attachment> => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: { include: { members: true } } },
  });

  if (!task) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Task not found.');
  }

  // Verify user has access to task project (or is assignee)
  const isMember = task.project.members.some((m) => m.id === user.id) || task.project.creatorId === user.id;
  const isAdmin = user.role === Role.ADMIN;
  const isAssignee = task.assignedMemberId === user.id;

  if (!isMember && !isAdmin && !isAssignee) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have access to attach files to this task.');
  }

  const fileUrl = `/uploads/${file.filename}`;

  const attachment = await prisma.attachment.create({
    data: {
      fileName: file.originalname,
      fileUrl,
      taskId,
      uploaderId: user.id,
    },
  });

  return attachment;
};

export const TaskService = {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  addComment,
  addAttachment,
};

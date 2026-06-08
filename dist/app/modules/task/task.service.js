"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskService = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../../../shared/prisma"));
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const http_status_1 = require("../../../shared/http-status");
const isPastDate = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    return targetDate.getTime() < today.getTime();
};
const getTasks = async (user, options) => {
    const { page, limit, search, status, priority, assignedMemberId, deadlineFilter, sortBy = 'dueDate', sortOrder = 'asc', projectId, } = options;
    const skip = (page - 1) * limit;
    const take = limit;
    // Build Prisma where filter
    const where = {};
    // Access control
    if (user.role !== client_1.Role.ADMIN) {
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
    if (status && status !== 'ALL') {
        where.status = status;
    }
    // Priority Filter
    if (priority && priority !== 'ALL') {
        where.priority = priority;
    }
    // Assignee Filter
    if (assignedMemberId && assignedMemberId !== 'ALL') {
        if (assignedMemberId === 'UNASSIGNED') {
            where.assignedMemberId = null;
        }
        else {
            where.assignedMemberId = assignedMemberId;
        }
    }
    // Deadline Filter (past or upcoming relative to current date)
    if (deadlineFilter && deadlineFilter !== 'ALL') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (deadlineFilter === 'OVERDUE') {
            where.dueDate = { lt: today };
            where.status = { not: client_1.TaskStatus.COMPLETED };
        }
        else if (deadlineFilter === 'UPCOMING') {
            where.dueDate = { gte: today };
            where.status = { not: client_1.TaskStatus.COMPLETED };
        }
    }
    // Sorting
    const orderBy = {};
    orderBy[sortBy] = sortOrder;
    const [data, total] = await Promise.all([
        prisma_1.default.task.findMany({
            where,
            include: {
                project: { select: { id: true, name: true } },
                assignedMember: { select: { id: true, name: true, email: true } },
            },
            orderBy,
            skip,
            take,
        }),
        prisma_1.default.task.count({ where }),
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
const createTask = async (payload, user) => {
    if (user.role === client_1.Role.TEAM_MEMBER) {
        throw new ApiError_1.default(http_status_1.httpStatus.FORBIDDEN, 'Access denied. Team members cannot create tasks.');
    }
    // Validate Project
    const project = await prisma_1.default.project.findUnique({
        where: { id: payload.projectId },
        include: { members: true },
    });
    if (!project) {
        throw new ApiError_1.default(http_status_1.httpStatus.NOT_FOUND, 'Project not found.');
    }
    // Rule: Prevent duplicate task titles inside the same project
    const duplicate = await prisma_1.default.task.findFirst({
        where: {
            projectId: payload.projectId,
            title: { equals: payload.title, mode: 'insensitive' },
        },
    });
    if (duplicate) {
        throw new ApiError_1.default(http_status_1.httpStatus.BAD_REQUEST, 'This task already exists in the project.');
    }
    // Rule: Prevent setting past dates as deadlines
    const parsedDueDate = new Date(payload.dueDate);
    if (isNaN(parsedDueDate.getTime()) || isPastDate(parsedDueDate)) {
        throw new ApiError_1.default(http_status_1.httpStatus.BAD_REQUEST, 'Please select a valid deadline.');
    }
    // If assigning, check if user exists and is member of the project
    if (payload.assignedMemberId) {
        const isMember = project.members.some((m) => m.id === payload.assignedMemberId) || project.creatorId === payload.assignedMemberId;
        if (!isMember) {
            throw new ApiError_1.default(http_status_1.httpStatus.BAD_REQUEST, 'Assigned member must be a member of the project.');
        }
    }
    const task = await prisma_1.default.task.create({
        data: {
            title: payload.title,
            description: payload.description,
            dueDate: parsedDueDate,
            priority: payload.priority || client_1.TaskPriority.MEDIUM,
            status: client_1.TaskStatus.TODO,
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
    await prisma_1.default.activity.create({
        data: { description: `Task "${task.title}" created in project "${project.name}"${assigneeText}` },
    });
    return task;
};
const updateTask = async (id, payload, user) => {
    const task = await prisma_1.default.task.findUnique({
        where: { id },
        include: { project: true },
    });
    if (!task) {
        throw new ApiError_1.default(http_status_1.httpStatus.NOT_FOUND, 'Task not found.');
    }
    // RBAC check: Team Member can ONLY update status, and ONLY if assigned to them.
    if (user.role === client_1.Role.TEAM_MEMBER) {
        const isAssigned = task.assignedMemberId === user.id;
        if (!isAssigned) {
            throw new ApiError_1.default(http_status_1.httpStatus.FORBIDDEN, 'Access denied. You can only update tasks assigned to you.');
        }
        // Check if trying to edit other fields
        if (payload.title || payload.description || payload.dueDate || payload.priority || payload.assignedMemberId !== undefined) {
            throw new ApiError_1.default(http_status_1.httpStatus.FORBIDDEN, 'Access denied. Team members can only update task status.');
        }
    }
    const updateData = {};
    // Rule: Prevent setting past dates as deadlines (Admin/PM only)
    if (payload.dueDate) {
        const parsedDueDate = new Date(payload.dueDate);
        if (isNaN(parsedDueDate.getTime()) || isPastDate(parsedDueDate)) {
            throw new ApiError_1.default(http_status_1.httpStatus.BAD_REQUEST, 'Please select a valid deadline.');
        }
        updateData.dueDate = parsedDueDate;
    }
    // Rule: Prevent duplicate task titles inside the same project (Admin/PM only)
    if (payload.title && payload.title.toLowerCase() !== task.title.toLowerCase()) {
        const duplicate = await prisma_1.default.task.findFirst({
            where: {
                projectId: task.projectId,
                title: { equals: payload.title, mode: 'insensitive' },
                id: { not: id },
            },
        });
        if (duplicate) {
            throw new ApiError_1.default(http_status_1.httpStatus.BAD_REQUEST, 'This task already exists in the project.');
        }
        updateData.title = payload.title;
    }
    // Rule: Prevent assigning completed tasks
    if (task.status === client_1.TaskStatus.COMPLETED && payload.assignedMemberId && payload.assignedMemberId !== task.assignedMemberId) {
        throw new ApiError_1.default(http_status_1.httpStatus.BAD_REQUEST, 'Completed tasks cannot be reassigned.');
    }
    if (payload.status === client_1.TaskStatus.COMPLETED && payload.assignedMemberId && payload.assignedMemberId !== task.assignedMemberId) {
        throw new ApiError_1.default(http_status_1.httpStatus.BAD_REQUEST, 'Completed tasks cannot be reassigned.');
    }
    if (payload.description !== undefined)
        updateData.description = payload.description;
    if (payload.priority)
        updateData.priority = payload.priority;
    if (payload.status)
        updateData.status = payload.status;
    if (payload.assignedMemberId !== undefined) {
        if (payload.assignedMemberId === null) {
            updateData.assignedMemberId = null;
        }
        else {
            // Check if new assignee is a member of the project
            const project = await prisma_1.default.project.findUnique({
                where: { id: task.projectId },
                include: { members: true },
            });
            const isMember = project?.members.some((m) => m.id === payload.assignedMemberId) || project?.creatorId === payload.assignedMemberId;
            if (!isMember) {
                throw new ApiError_1.default(http_status_1.httpStatus.BAD_REQUEST, 'Assigned member must be a member of the project.');
            }
            updateData.assignedMemberId = payload.assignedMemberId;
        }
    }
    const updatedTask = await prisma_1.default.task.update({
        where: { id },
        data: updateData,
        include: {
            assignedMember: { select: { id: true, name: true, email: true } },
            project: { select: { id: true, name: true } },
        },
    });
    // Track activity if status changed
    if (payload.status && payload.status !== task.status) {
        await prisma_1.default.activity.create({
            data: { description: `Task "${updatedTask.title}" marked as ${payload.status} by ${user.name}` },
        });
    }
    else {
        await prisma_1.default.activity.create({
            data: { description: `Task "${updatedTask.title}" updated by ${user.name}` },
        });
    }
    return updatedTask;
};
const deleteTask = async (id, user) => {
    const task = await prisma_1.default.task.findUnique({ where: { id } });
    if (!task) {
        throw new ApiError_1.default(http_status_1.httpStatus.NOT_FOUND, 'Task not found.');
    }
    // RBAC: only Admin or PM can delete tasks
    if (user.role === client_1.Role.TEAM_MEMBER) {
        throw new ApiError_1.default(http_status_1.httpStatus.FORBIDDEN, 'Access denied. Team members cannot delete tasks.');
    }
    const deletedTask = await prisma_1.default.task.delete({ where: { id } });
    // Track activity
    await prisma_1.default.activity.create({
        data: { description: `Task "${task.title}" deleted by ${user.name}` },
    });
    return deletedTask;
};
const addComment = async (taskId, content, user) => {
    const task = await prisma_1.default.task.findUnique({
        where: { id: taskId },
        include: { project: { include: { members: true } } },
    });
    if (!task) {
        throw new ApiError_1.default(http_status_1.httpStatus.NOT_FOUND, 'Task not found.');
    }
    // Verify user has access to task project (or is assignee)
    const isMember = task.project.members.some((m) => m.id === user.id) || task.project.creatorId === user.id;
    const isAdmin = user.role === client_1.Role.ADMIN;
    const isAssignee = task.assignedMemberId === user.id;
    if (!isMember && !isAdmin && !isAssignee) {
        throw new ApiError_1.default(http_status_1.httpStatus.FORBIDDEN, 'You do not have access to comment on this task.');
    }
    const comment = await prisma_1.default.comment.create({
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
const addAttachment = async (taskId, file, user) => {
    const task = await prisma_1.default.task.findUnique({
        where: { id: taskId },
        include: { project: { include: { members: true } } },
    });
    if (!task) {
        throw new ApiError_1.default(http_status_1.httpStatus.NOT_FOUND, 'Task not found.');
    }
    // Verify user has access to task project (or is assignee)
    const isMember = task.project.members.some((m) => m.id === user.id) || task.project.creatorId === user.id;
    const isAdmin = user.role === client_1.Role.ADMIN;
    const isAssignee = task.assignedMemberId === user.id;
    if (!isMember && !isAdmin && !isAssignee) {
        throw new ApiError_1.default(http_status_1.httpStatus.FORBIDDEN, 'You do not have access to attach files to this task.');
    }
    const fileUrl = `/uploads/${file.filename}`;
    const attachment = await prisma_1.default.attachment.create({
        data: {
            fileName: file.originalname,
            fileUrl,
            taskId,
            uploaderId: user.id,
        },
    });
    return attachment;
};
exports.TaskService = {
    getTasks,
    createTask,
    updateTask,
    deleteTask,
    addComment,
    addAttachment,
};

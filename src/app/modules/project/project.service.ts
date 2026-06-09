import { Project, Role, User } from '../../../generated/client/client';
import prisma from '../../../shared/prisma';
import ApiError from '../../../errors/ApiError';
import { httpStatus } from '../../../shared/http-status';

const getProjects = async (
  user: { id: string; role: Role },
  options: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }
): Promise<{ meta: { page: number; limit: number; total: number }; data: Project[] }> => {
  const { page, limit, search, status, sortBy = 'createdAt', sortOrder = 'desc' } = options;
  const skip = (page - 1) * limit;
  const take = limit;

  // Build Prisma query where clause
  const where: any = {};

  // Access control
  if (user.role !== Role.ADMIN) {
    where.OR = [
      { creatorId: user.id },
      { members: { some: { id: user.id } } },
    ];
  }

  // Search filter
  if (search) {
    where.name = {
      contains: search,
      mode: 'insensitive',
    };
  }

  // Status Filter
  if (status && status !== 'ALL') {
    where.status = status;
  }

  // Sorting
  const orderBy: any = {};
  orderBy[sortBy] = sortOrder;

  // Query database
  const [data, total] = await Promise.all([
    prisma.project.findMany({
      where,
      include: {
        creator: { select: { id: true, name: true, email: true } },
        members: { select: { id: true, name: true, email: true, role: true } },
        tasks: true,
      },
      orderBy,
      skip,
      take,
    }),
    prisma.project.count({ where }),
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

const getProjectById = async (id: string, user: { id: string; role: Role }): Promise<Project | null> => {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true, email: true } },
      members: { select: { id: true, name: true, email: true, role: true } },
      tasks: {
        include: {
          assignedMember: { select: { id: true, name: true, email: true } },
          attachments: true,
          comments: {
            include: { author: { select: { id: true, name: true } } },
          },
        },
        orderBy: { dueDate: 'asc' },
      },
    },
  });

  if (!project) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Project not found.');
  }

  // Access control
  const isMember = project.members.some((m) => m.id === user.id);
  const isCreator = project.creatorId === user.id;
  const isAdmin = user.role === Role.ADMIN;

  if (!isMember && !isCreator && !isAdmin) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have access to view this project.');
  }

  return project;
};

const createProject = async (payload: { name: string; description?: string; deadline: string }, user: { id: string; name: string }): Promise<Project> => {
  const parsedDeadline = new Date(payload.deadline);
  if (isNaN(parsedDeadline.getTime())) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Please select a valid deadline.');
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (parsedDeadline < today) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Please select a valid deadline.');
  }

  const project = await prisma.project.create({
    data: {
      name: payload.name,
      description: payload.description,
      deadline: parsedDeadline,
      creatorId: user.id,
      members: {
        connect: { id: user.id },
      },
    },
    include: {
      creator: { select: { id: true, name: true, email: true } },
      members: { select: { id: true, name: true, email: true } },
    },
  });

  // Track activity
  await prisma.activity.create({
    data: { description: `Project "${project.name}" created by ${user.name}` },
  });

  return project;
};

const updateProject = async (
  id: string,
  payload: { name?: string; description?: string; deadline?: string; status?: any },
  user: { id: string; name: string; role: Role }
): Promise<Project> => {
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Project not found.');
  }

  // Restrict edits to project creator, admin, or PM
  const isAdmin = user.role === Role.ADMIN;
  const isCreator = project.creatorId === user.id;
  const isPM = user.role === Role.PROJECT_MANAGER;

  if (!isAdmin && !isCreator && !isPM) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to edit this project.');
  }

  const updateData: any = {};
  if (payload.name) updateData.name = payload.name;
  if (payload.description !== undefined) updateData.description = payload.description;
  if (payload.status) updateData.status = payload.status;
  if (payload.deadline) {
    const parsedDeadline = new Date(payload.deadline);
    if (isNaN(parsedDeadline.getTime())) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Please select a valid deadline.');
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (parsedDeadline < today) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Please select a valid deadline.');
    }
    updateData.deadline = parsedDeadline;
  }

  const updatedProject = await prisma.project.update({
    where: { id },
    data: updateData,
    include: {
      creator: { select: { id: true, name: true, email: true } },
      members: { select: { id: true, name: true, email: true } },
    },
  });

  // Track activity
  await prisma.activity.create({
    data: { description: `Project "${updatedProject.name}" updated by ${user.name}` },
  });

  return updatedProject;
};

const deleteProject = async (id: string, user: { id: string; name: string; role: Role }): Promise<{ message: string }> => {
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Project not found.');
  }

  // Deletion: Admin or Creator only
  const isAdmin = user.role === Role.ADMIN;
  const isCreator = project.creatorId === user.id;

  if (!isAdmin && !isCreator) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to delete this project.');
  }

  await prisma.project.delete({ where: { id } });

  // Track activity
  await prisma.activity.create({
    data: { description: `Project "${project.name}" deleted by ${user.name}` },
  });

  return { message: 'Project deleted successfully.' };
};

const addMemberToProject = async (id: string, memberId: string, user: { id: string; name: string; role: Role }): Promise<Project> => {
  const project = await prisma.project.findUnique({
    where: { id },
    include: { members: true },
  });

  if (!project) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Project not found.');
  }

  const isAdmin = user.role === Role.ADMIN;
  const isCreator = project.creatorId === user.id;
  const isPM = user.role === Role.PROJECT_MANAGER;

  if (!isAdmin && !isCreator && !isPM) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to add members to this project.');
  }

  const userToAdd = await prisma.user.findUnique({ where: { id: memberId } });
  if (!userToAdd) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found.');
  }

  const alreadyMember = project.members.some((m) => m.id === memberId);
  if (alreadyMember) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User is already a member of this project.');
  }

  const updatedProject = await prisma.project.update({
    where: { id },
    data: {
      members: {
        connect: { id: memberId },
      },
    },
    include: {
      members: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  // Track activity
  await prisma.activity.create({
    data: { description: `Member "${userToAdd.name}" added to "${project.name}" by ${user.name}` },
  });

  return updatedProject;
};

const removeMemberFromProject = async (id: string, memberId: string, user: { id: string; name: string; role: Role }): Promise<Project> => {
  const project = await prisma.project.findUnique({
    where: { id },
    include: { members: true },
  });

  if (!project) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Project not found.');
  }

  const isAdmin = user.role === Role.ADMIN;
  const isCreator = project.creatorId === user.id;
  const isPM = user.role === Role.PROJECT_MANAGER;

  if (!isAdmin && !isCreator && !isPM) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to remove members from this project.');
  }

  const userToRemove = await prisma.user.findUnique({ where: { id: memberId } });
  if (!userToRemove) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found.');
  }

  const isMember = project.members.some((m) => m.id === memberId);
  if (!isMember) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User is not a member of this project.');
  }

  const updatedProject = await prisma.project.update({
    where: { id },
    data: {
      members: {
        disconnect: { id: memberId },
      },
    },
    include: {
      members: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  // Track activity
  await prisma.activity.create({
    data: { description: `Member "${userToRemove.name}" removed from "${project.name}" by ${user.name}` },
  });

  return updatedProject;
};

export const ProjectService = {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  addMemberToProject,
  removeMemberFromProject,
};

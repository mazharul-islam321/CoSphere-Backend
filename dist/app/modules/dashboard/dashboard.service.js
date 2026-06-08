"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../../../shared/prisma"));
const getDashboardStats = async (user) => {
    const now = new Date();
    // 1. Setup Filters
    let projectFilter = {};
    let taskFilter = {};
    if (user.role !== client_1.Role.ADMIN) {
        projectFilter = {
            OR: [
                { creatorId: user.id },
                { members: { some: { id: user.id } } },
            ],
        };
        taskFilter = {
            project: {
                OR: [
                    { creatorId: user.id },
                    { members: { some: { id: user.id } } },
                ],
            },
        };
    }
    // 2. Fetch Base Counts (KPIs)
    const totalProjects = await prisma_1.default.project.count({ where: projectFilter });
    const totalTasks = await prisma_1.default.task.count({ where: taskFilter });
    const completedTasks = await prisma_1.default.task.count({
        where: {
            ...taskFilter,
            status: client_1.TaskStatus.COMPLETED,
        },
    });
    const pendingTasks = await prisma_1.default.task.count({
        where: {
            ...taskFilter,
            status: { in: [client_1.TaskStatus.TODO, client_1.TaskStatus.IN_PROGRESS] },
        },
    });
    const overdueTasks = await prisma_1.default.task.count({
        where: {
            ...taskFilter,
            status: { in: [client_1.TaskStatus.TODO, client_1.TaskStatus.IN_PROGRESS] },
            dueDate: { lt: now },
        },
    });
    // 3. Project Summary List
    const projectsList = await prisma_1.default.project.findMany({
        where: projectFilter,
        select: {
            id: true,
            name: true,
            deadline: true,
            status: true,
            tasks: {
                select: {
                    id: true,
                    status: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
    const projectProgressList = projectsList.map((proj) => {
        const total = proj.tasks.length;
        const completed = proj.tasks.filter((t) => t.status === client_1.TaskStatus.COMPLETED).length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        const daysLeft = Math.ceil((new Date(proj.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return {
            id: proj.id,
            name: proj.name,
            totalTasks: total,
            completedTasks: completed,
            pendingTasks: total - completed,
            progress,
            deadline: proj.deadline,
            daysLeft: daysLeft > 0 ? daysLeft : 0,
            isOverdue: daysLeft < 0 && proj.status !== 'COMPLETED',
        };
    });
    // 4. Tasks by Priority Chart Data
    const priorityCounts = await prisma_1.default.task.groupBy({
        by: ['priority'],
        where: taskFilter,
        _count: { _all: true },
    });
    const priorityChartData = [
        { name: 'High', value: priorityCounts.find((p) => p.priority === 'HIGH')?._count._all || 0 },
        { name: 'Medium', value: priorityCounts.find((p) => p.priority === 'MEDIUM')?._count._all || 0 },
        { name: 'Low', value: priorityCounts.find((p) => p.priority === 'LOW')?._count._all || 0 },
    ];
    // 5. Tasks by Status Distribution Chart Data
    const statusCounts = await prisma_1.default.task.groupBy({
        by: ['status'],
        where: taskFilter,
        _count: { _all: true },
    });
    const statusChartData = [
        { name: 'Todo', value: statusCounts.find((s) => s.status === 'TODO')?._count._all || 0 },
        { name: 'In Progress', value: statusCounts.find((s) => s.status === 'IN_PROGRESS')?._count._all || 0 },
        { name: 'Completed', value: statusCounts.find((s) => s.status === 'COMPLETED')?._count._all || 0 },
    ];
    // 6. Member Workload summary
    const teamMembers = await prisma_1.default.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            assignedTasks: {
                where: taskFilter,
                select: {
                    id: true,
                    status: true,
                },
            },
        },
        where: {
            role: { in: [client_1.Role.TEAM_MEMBER, client_1.Role.PROJECT_MANAGER] },
        },
    });
    const workloadSummary = teamMembers.map((member) => {
        const total = member.assignedTasks.length;
        const completed = member.assignedTasks.filter((t) => t.status === client_1.TaskStatus.COMPLETED).length;
        return {
            id: member.id,
            name: member.name,
            email: member.email,
            role: member.role,
            totalTasks: total,
            completedTasks: completed,
            pendingTasks: total - completed,
        };
    }).sort((a, b) => b.totalTasks - a.totalTasks);
    // 7. Recent Activities (Latest 10)
    const recentActivities = await prisma_1.default.activity.findMany({
        take: 10,
        orderBy: { timestamp: 'desc' },
    });
    // 8. Upcoming deadlines (Tasks not completed, nearest due dates)
    const upcomingDeadlines = await prisma_1.default.task.findMany({
        where: {
            ...taskFilter,
            status: { not: client_1.TaskStatus.COMPLETED },
            dueDate: { gte: now },
        },
        include: {
            project: { select: { name: true } },
        },
        orderBy: { dueDate: 'asc' },
        take: 5,
    });
    // 9. High Priority pending tasks
    const highPriorityTasks = await prisma_1.default.task.findMany({
        where: {
            ...taskFilter,
            priority: 'HIGH',
            status: { not: client_1.TaskStatus.COMPLETED },
        },
        include: {
            project: { select: { name: true } },
            assignedMember: { select: { name: true } },
        },
        orderBy: { dueDate: 'asc' },
        take: 5,
    });
    return {
        kpis: {
            totalProjects,
            totalTasks,
            completedTasks,
            pendingTasks,
            overdueTasks,
        },
        projectProgressList,
        priorityChartData,
        statusChartData,
        workloadSummary,
        recentActivities,
        upcomingDeadlines,
        highPriorityTasks,
    };
};
exports.DashboardService = {
    getDashboardStats,
};

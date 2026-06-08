"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectController = void 0;
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const http_status_1 = require("../../../shared/http-status");
const project_service_1 = require("./project.service");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const getProjects = (0, catchAsync_1.default)(async (req, res) => {
    const user = req.user;
    const { page = 1, limit = 10, search, status, sortBy = "createdAt", sortOrder = "desc", } = req.query;
    const result = await project_service_1.ProjectService.getProjects(user, {
        page: Number(page),
        limit: Number(limit),
        search: search,
        status: status,
        sortBy: sortBy,
        sortOrder: sortOrder,
    });
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.httpStatus.OK,
        success: true,
        message: "Projects retrieved successfully.",
        data: result,
    });
});
const getProjectById = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    const user = req.user;
    const result = await project_service_1.ProjectService.getProjectById(id, user);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.httpStatus.OK,
        success: true,
        message: "Project details retrieved successfully.",
        data: result,
    });
});
const createProject = (0, catchAsync_1.default)(async (req, res) => {
    const { name, description, deadline } = req.body;
    const user = req.user;
    if (!name || !deadline) {
        throw new ApiError_1.default(http_status_1.httpStatus.BAD_REQUEST, "Project name and deadline are required.");
    }
    const result = await project_service_1.ProjectService.createProject({ name, description, deadline }, user);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.httpStatus.CREATED,
        success: true,
        message: "Project created successfully.",
        data: result,
    });
});
const updateProject = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    const user = req.user;
    const result = await project_service_1.ProjectService.updateProject(id, req.body, user);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.httpStatus.OK,
        success: true,
        message: "Project updated successfully.",
        data: result,
    });
});
const deleteProject = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    const user = req.user;
    const result = await project_service_1.ProjectService.deleteProject(id, user);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.httpStatus.OK,
        success: true,
        message: "Project deleted successfully.",
        data: result,
    });
});
const addMemberToProject = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    const { memberId } = req.body;
    const user = req.user;
    if (!memberId) {
        throw new ApiError_1.default(http_status_1.httpStatus.BAD_REQUEST, "Member ID is required.");
    }
    const result = await project_service_1.ProjectService.addMemberToProject(id, memberId, user);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.httpStatus.OK,
        success: true,
        message: "Member added to project successfully.",
        data: result,
    });
});
const removeMemberFromProject = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    const { memberId } = req.body;
    const user = req.user;
    if (!memberId) {
        throw new ApiError_1.default(http_status_1.httpStatus.BAD_REQUEST, "Member ID is required.");
    }
    const result = await project_service_1.ProjectService.removeMemberFromProject(id, memberId, user);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.httpStatus.OK,
        success: true,
        message: "Member removed from project successfully.",
        data: result,
    });
});
exports.ProjectController = {
    getProjects,
    getProjectById,
    createProject,
    updateProject,
    deleteProject,
    addMemberToProject,
    removeMemberFromProject,
};

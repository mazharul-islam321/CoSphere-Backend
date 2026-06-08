"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskController = void 0;
const fs = __importStar(require("fs"));
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const http_status_1 = require("../../../shared/http-status");
const task_service_1 = require("./task.service");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const getTasks = (0, catchAsync_1.default)(async (req, res) => {
    const user = req.user;
    const { page = 1, limit = 10, search, status, priority, assignedMemberId, deadlineFilter, sortBy = 'dueDate', sortOrder = 'asc', projectId, } = req.query;
    const result = await task_service_1.TaskService.getTasks(user, {
        page: Number(page),
        limit: Number(limit),
        search: search,
        status: status,
        priority: priority,
        assignedMemberId: assignedMemberId,
        deadlineFilter: deadlineFilter,
        sortBy: sortBy,
        sortOrder: sortOrder,
        projectId: projectId,
    });
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.httpStatus.OK,
        success: true,
        message: 'Tasks retrieved successfully.',
        data: result,
    });
});
const createTask = (0, catchAsync_1.default)(async (req, res) => {
    const { title, description, dueDate, priority, assignedMemberId, projectId } = req.body;
    const user = req.user;
    if (!title || !dueDate || !projectId) {
        throw new ApiError_1.default(http_status_1.httpStatus.BAD_REQUEST, 'Title, due date, and project ID are required.');
    }
    const result = await task_service_1.TaskService.createTask({ title, description, dueDate, priority, assignedMemberId, projectId }, user);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.httpStatus.CREATED,
        success: true,
        message: 'Task created successfully.',
        data: result,
    });
});
const updateTask = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    const user = req.user;
    const result = await task_service_1.TaskService.updateTask(id, req.body, user);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.httpStatus.OK,
        success: true,
        message: 'Task updated successfully.',
        data: result,
    });
});
const deleteTask = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    const user = req.user;
    const result = await task_service_1.TaskService.deleteTask(id, user);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.httpStatus.OK,
        success: true,
        message: 'Task deleted successfully.',
        data: { task: result },
    });
});
const addComment = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params; // task ID
    const { content } = req.body;
    const user = req.user;
    if (!content) {
        throw new ApiError_1.default(http_status_1.httpStatus.BAD_REQUEST, 'Comment content is required.');
    }
    const result = await task_service_1.TaskService.addComment(id, content, user);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.httpStatus.CREATED,
        success: true,
        message: 'Comment added successfully.',
        data: result,
    });
});
const addAttachment = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params; // task ID
    const user = req.user;
    if (!req.file) {
        throw new ApiError_1.default(http_status_1.httpStatus.BAD_REQUEST, 'No file uploaded.');
    }
    try {
        const result = await task_service_1.TaskService.addAttachment(id, req.file, user);
        (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.httpStatus.CREATED,
            success: true,
            message: 'Attachment uploaded successfully.',
            data: result,
        });
    }
    catch (err) {
        // Clean up uploaded file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        throw err;
    }
});
exports.TaskController = {
    getTasks,
    createTask,
    updateTask,
    deleteTask,
    addComment,
    addAttachment,
};

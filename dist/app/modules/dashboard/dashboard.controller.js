"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const http_status_1 = require("../../../shared/http-status");
const dashboard_service_1 = require("./dashboard.service");
const getDashboardStats = (0, catchAsync_1.default)(async (req, res) => {
    const user = req.user;
    const result = await dashboard_service_1.DashboardService.getDashboardStats(user);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.httpStatus.OK,
        success: true,
        message: 'Dashboard statistics calculated successfully.',
        data: result,
    });
});
exports.DashboardController = {
    getDashboardStats,
};

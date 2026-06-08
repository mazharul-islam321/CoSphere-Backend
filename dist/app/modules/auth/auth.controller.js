"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const http_status_1 = require("../../../shared/http-status");
const auth_service_1 = require("./auth.service");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const config_1 = __importDefault(require("../../../config"));
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
const setCookie = (res, token) => {
    res.cookie('token', token, {
        httpOnly: true,
        secure: config_1.default.env === 'production',
        sameSite: 'lax',
        maxAge: COOKIE_MAX_AGE,
    });
};
const signup = (0, catchAsync_1.default)(async (req, res) => {
    const { email, password, name, role } = req.body;
    if (!email || !password || !name) {
        throw new ApiError_1.default(http_status_1.httpStatus.BAD_REQUEST, 'All fields (email, password, name) are required.');
    }
    // We temporarily pass password inside passwordHash since that's what database column would be or the service parameter names it
    const user = await auth_service_1.AuthService.signup({ email, name, passwordHash: password, role });
    // Generate login token directly for immediate sign-in
    const loginResult = await auth_service_1.AuthService.login({ email, passwordHash: password });
    setCookie(res, loginResult.token);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.httpStatus.CREATED,
        success: true,
        message: 'User created successfully.',
        data: { user },
    });
});
const login = (0, catchAsync_1.default)(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new ApiError_1.default(http_status_1.httpStatus.BAD_REQUEST, 'Email and password are required.');
    }
    const result = await auth_service_1.AuthService.login({ email, passwordHash: password });
    setCookie(res, result.token);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.httpStatus.OK,
        success: true,
        message: 'Logged in successfully.',
        data: { user: result.user },
    });
});
const logout = (0, catchAsync_1.default)(async (req, res) => {
    res.clearCookie('token');
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.httpStatus.OK,
        success: true,
        message: 'Logged out successfully.',
    });
});
const me = (0, catchAsync_1.default)(async (req, res) => {
    const user = req.user;
    if (!user) {
        throw new ApiError_1.default(http_status_1.httpStatus.UNAUTHORIZED, 'Not authenticated.');
    }
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.httpStatus.OK,
        success: true,
        message: 'User retrieved successfully.',
        data: { user },
    });
});
const getUsers = (0, catchAsync_1.default)(async (req, res) => {
    const result = await auth_service_1.AuthService.getUsers();
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.httpStatus.OK,
        success: true,
        message: 'Users retrieved successfully.',
        data: result,
    });
});
exports.AuthController = {
    signup,
    login,
    logout,
    me,
    getUsers,
};

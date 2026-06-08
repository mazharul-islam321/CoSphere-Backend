"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.authenticateJWT = void 0;
const ApiError_1 = __importDefault(require("../../errors/ApiError"));
const http_status_1 = require("../../shared/http-status");
const config_1 = __importDefault(require("../../config"));
const jwtHelpers_1 = require("../../shared/jwtHelpers");
const authenticateJWT = (req, res, next) => {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    if (!token) {
        throw new ApiError_1.default(http_status_1.httpStatus.UNAUTHORIZED, 'Authentication required. Please log in.');
    }
    try {
        const decoded = jwtHelpers_1.jwtHelpers.verifyToken(token, config_1.default.jwt.secret);
        req.user = decoded;
        next();
    }
    catch (err) {
        throw new ApiError_1.default(http_status_1.httpStatus.FORBIDDEN, 'Session expired or invalid token. Please log in again.');
    }
};
exports.authenticateJWT = authenticateJWT;
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        const user = req.user;
        if (!user) {
            throw new ApiError_1.default(http_status_1.httpStatus.UNAUTHORIZED, 'Authentication required.');
        }
        if (!allowedRoles.includes(user.role)) {
            throw new ApiError_1.default(http_status_1.httpStatus.FORBIDDEN, 'Access denied. You do not have permission to perform this action.');
        }
        next();
    };
};
exports.requireRole = requireRole;

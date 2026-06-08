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
exports.AuthService = void 0;
const bcrypt = __importStar(require("bcryptjs"));
const prisma_1 = __importDefault(require("../../../shared/prisma"));
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const http_status_1 = require("../../../shared/http-status");
const client_1 = require("@prisma/client");
const config_1 = __importDefault(require("../../../config"));
const jwtHelpers_1 = require("../../../shared/jwtHelpers");
const signup = async (payload) => {
    const existingUser = await prisma_1.default.user.findUnique({ where: { email: payload.email } });
    if (existingUser) {
        throw new ApiError_1.default(http_status_1.httpStatus.BAD_REQUEST, 'A user with this email already exists.');
    }
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(payload.passwordHash, salt);
    const user = await prisma_1.default.user.create({
        data: {
            email: payload.email,
            name: payload.name,
            passwordHash,
            role: payload.role || client_1.Role.TEAM_MEMBER,
        },
    });
    // Track activity
    await prisma_1.default.activity.create({
        data: { description: `New user "${user.name}" (${user.role}) signed up` },
    });
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
    };
};
const login = async (payload) => {
    const user = await prisma_1.default.user.findUnique({ where: { email: payload.email } });
    if (!user) {
        throw new ApiError_1.default(http_status_1.httpStatus.BAD_REQUEST, 'Invalid email or password.');
    }
    const isMatch = await bcrypt.compare(payload.passwordHash, user.passwordHash);
    if (!isMatch) {
        throw new ApiError_1.default(http_status_1.httpStatus.BAD_REQUEST, 'Invalid email or password.');
    }
    const token = jwtHelpers_1.jwtHelpers.createToken({ id: user.id, email: user.email, name: user.name, role: user.role }, config_1.default.jwt.secret, config_1.default.jwt.expires_in);
    return {
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        },
        token,
    };
};
const getUsers = async () => {
    const users = await prisma_1.default.user.findMany({
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
        },
    });
    return users;
};
exports.AuthService = {
    signup,
    login,
    getUsers,
};

import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { httpStatus } from '../../../shared/http-status';
import { AuthService } from './auth.service';
import { AuthenticatedRequest } from '../../middlewares/auth';
import ApiError from '../../../errors/ApiError';
import config from '../../../config';

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

const setCookie = (res: Response, token: string) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
  });
};

const signup = catchAsync(async (req: Request, res: Response) => {
  const { email, password, name, role } = req.body;

  if (!email || !password || !name) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'All fields (email, password, name) are required.');
  }

  // We temporarily pass password inside passwordHash since that's what database column would be or the service parameter names it
  const user = await AuthService.signup({ email, name, passwordHash: password, role });

  // Generate login token directly for immediate sign-in
  const loginResult = await AuthService.login({ email, passwordHash: password });
  setCookie(res, loginResult.token);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'User created successfully.',
    data: { user },
  });
});

const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email and password are required.');
  }

  const result = await AuthService.login({ email, passwordHash: password });
  setCookie(res, result.token);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Logged in successfully.',
    data: { user: result.user },
  });
});

const logout = catchAsync(async (req: Request, res: Response) => {
  res.clearCookie('token');
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Logged out successfully.',
  });
});

const me = catchAsync(async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  if (!user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Not authenticated.');
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User retrieved successfully.',
    data: { user },
  });
});

const getUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.getUsers();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Users retrieved successfully.',
    data: result,
  });
});

export const AuthController = {
  signup,
  login,
  logout,
  me,
  getUsers,
};

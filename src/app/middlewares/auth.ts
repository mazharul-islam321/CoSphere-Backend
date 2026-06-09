import { Request, Response, NextFunction } from 'express';
import { Secret } from 'jsonwebtoken';
import { Role } from '../../generated/client/client';
import ApiError from '../../errors/ApiError';
import { httpStatus } from '../../shared/http-status';
import config from '../../config';
import { jwtHelpers } from '../../shared/jwtHelpers';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: Role;
  };
}

export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required. Please log in.');
  }

  try {
    const decoded = jwtHelpers.verifyToken(token, config.jwt.secret as Secret) as {
      id: string;
      email: string;
      name: string;
      role: Role;
    };
    (req as AuthenticatedRequest).user = decoded;
    next();
  } catch (err) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Session expired or invalid token. Please log in again.');
  }
};

export const requireRole = (allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required.');
    }

    if (!allowedRoles.includes(user.role)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Access denied. You do not have permission to perform this action.');
    }

    next();
  };
};

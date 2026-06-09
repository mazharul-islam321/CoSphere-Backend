import * as bcrypt from 'bcryptjs';
import { Secret } from 'jsonwebtoken';
import prisma from '../../../shared/prisma';
import ApiError from '../../../errors/ApiError';
import { httpStatus } from '../../../shared/http-status';
import { Role, User } from '../../../generated/client/client';
import config from '../../../config';
import { jwtHelpers } from '../../../shared/jwtHelpers';

const signup = async (payload: { email: string; name: string; passwordHash: string; role?: Role }): Promise<Partial<User>> => {
  const existingUser = await prisma.user.findUnique({ where: { email: payload.email } });
  if (existingUser) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'A user with this email already exists.');
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(payload.passwordHash, salt);

  const user = await prisma.user.create({
    data: {
      email: payload.email,
      name: payload.name,
      passwordHash,
      role: payload.role || Role.TEAM_MEMBER,
    },
  });

  // Track activity
  await prisma.activity.create({
    data: { description: `New user "${user.name}" (${user.role}) signed up` },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
};

const login = async (payload: { email: string; passwordHash: string }): Promise<{ user: Partial<User>; token: string }> => {
  const user = await prisma.user.findUnique({ where: { email: payload.email } });
  if (!user) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid email or password.');
  }

  const isMatch = await bcrypt.compare(payload.passwordHash, user.passwordHash);
  if (!isMatch) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid email or password.');
  }

  const token = jwtHelpers.createToken(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    config.jwt.secret as Secret,
    config.jwt.expires_in as string
  );

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

const getUsers = async (): Promise<Partial<User>[]> => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });
  return users;
};

export const AuthService = {
  signup,
  login,
  getUsers,
};

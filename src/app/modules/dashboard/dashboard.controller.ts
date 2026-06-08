import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { httpStatus } from '../../../shared/http-status';
import { DashboardService } from './dashboard.service';
import { AuthenticatedRequest } from '../../middlewares/auth';

const getDashboardStats = catchAsync(async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user!;
  const result = await DashboardService.getDashboardStats(user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Dashboard statistics calculated successfully.',
    data: result,
  });
});

export const DashboardController = {
  getDashboardStats,
};

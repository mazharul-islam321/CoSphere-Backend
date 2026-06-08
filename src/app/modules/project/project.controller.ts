import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { httpStatus } from "../../../shared/http-status";
import { ProjectService } from "./project.service";
import { AuthenticatedRequest } from "../../middlewares/auth";
import ApiError from "../../../errors/ApiError";

const getProjects = catchAsync(async (req: Request, res: Response) => {
	const user = (req as AuthenticatedRequest).user!;
	const {
		page = 1,
		limit = 10,
		search,
		status,
		sortBy = "createdAt",
		sortOrder = "desc",
	} = req.query;

	const result = await ProjectService.getProjects(user, {
		page: Number(page),
		limit: Number(limit),
		search: search as string,
		status: status as string,
		sortBy: sortBy as string,
		sortOrder: sortOrder as "asc" | "desc",
	});

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Projects retrieved successfully.",
		data: result,
	});
});

const getProjectById = catchAsync(async (req: Request, res: Response) => {
	const { id } = req.params;
	const user = (req as AuthenticatedRequest).user!;
	const result = await ProjectService.getProjectById(id, user);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Project details retrieved successfully.",
		data: result,
	});
});

const createProject = catchAsync(async (req: Request, res: Response) => {
	const { name, description, deadline } = req.body;
	const user = (req as AuthenticatedRequest).user!;

	if (!name || !deadline) {
		throw new ApiError(
			httpStatus.BAD_REQUEST,
			"Project name and deadline are required.",
		);
	}

	const result = await ProjectService.createProject(
		{ name, description, deadline },
		user,
	);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Project created successfully.",
		data: result,
	});
});

const updateProject = catchAsync(async (req: Request, res: Response) => {
	const { id } = req.params;
	const user = (req as AuthenticatedRequest).user!;
	const result = await ProjectService.updateProject(id, req.body, user);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Project updated successfully.",
		data: result,
	});
});

const deleteProject = catchAsync(async (req: Request, res: Response) => {
	const { id } = req.params;
	const user = (req as AuthenticatedRequest).user!;
	const result = await ProjectService.deleteProject(id, user);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Project deleted successfully.",
		data: result,
	});
});

const addMemberToProject = catchAsync(async (req: Request, res: Response) => {
	const { id } = req.params;
	const { memberId } = req.body;
	const user = (req as AuthenticatedRequest).user!;

	if (!memberId) {
		throw new ApiError(httpStatus.BAD_REQUEST, "Member ID is required.");
	}

	const result = await ProjectService.addMemberToProject(id, memberId, user);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Member added to project successfully.",
		data: result,
	});
});

const removeMemberFromProject = catchAsync(
	async (req: Request, res: Response) => {
		const { id } = req.params;
		const { memberId } = req.body;
		const user = (req as AuthenticatedRequest).user!;

		if (!memberId) {
			throw new ApiError(
				httpStatus.BAD_REQUEST,
				"Member ID is required.",
			);
		}

		const result = await ProjectService.removeMemberFromProject(
			id,
			memberId,
			user,
		);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Member removed from project successfully.",
			data: result,
		});
	},
);

export const ProjectController = {
	getProjects,
	getProjectById,
	createProject,
	updateProject,
	deleteProject,
	addMemberToProject,
	removeMemberFromProject,
};

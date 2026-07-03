import { Request, Response } from 'express';
import { UserService } from '../../service/user/user.service';
import { MESSAGES } from '../../constant/message.interface';
import { HTTP_STATUS } from '../../constant/statusCode.interface';
import { UserRole } from '../../constant/enum.constant';
const userService = new UserService();

export class UserController {
  static async findAll(req: Request, res: Response) {
    try {
      const users = await userService.listUsers(req.query);
      return res.status(HTTP_STATUS.OK).json({ message: MESSAGES.SUCCESS, ...users });
    } catch (_error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
  }

  static async me(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: MESSAGES.UNAUTHORIZED });
      }
      const user = await userService.getById(req.user.id);
      if (!user) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: MESSAGES.USER_NOT_FOUND });
      }
      return res.status(HTTP_STATUS.OK).json({ message: MESSAGES.SUCCESS, data: user });
    } catch (_error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
  }

  static async listStaff(req: Request, res: Response) {
    try {
      const result = await userService.listStaff(req.query);
      return res.status(HTTP_STATUS.OK).json({ message: MESSAGES.SUCCESS, ...result });
    } catch (_error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
  }

  static async createStaff(req: Request, res: Response) {
    try {
      const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      if (!name || !email) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: MESSAGES.BAD_REQUEST });
      }
      const data = await userService.createStaff({
        name,
        email,
        password: typeof req.body?.password === 'string' ? req.body.password : undefined,
      });
      if (!data) {
        return res.status(HTTP_STATUS.CONFLICT).json({ message: MESSAGES.USER_ALREADY_EXISTS });
      }

      return res.status(HTTP_STATUS.CREATED).json({ message: MESSAGES.CREATED_SUCCESS, data });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Cloudinary credentials are not configured')) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
      }
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
  }

  static async updateStaff(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: MESSAGES.BAD_REQUEST });
      }
      const data = await userService.updateStaff(id, {
        name: typeof req.body?.name === 'string' ? req.body.name.trim() : undefined,
        email: typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : undefined,
        password: typeof req.body?.password === 'string' ? req.body.password : undefined,
      });

      if (!data) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: MESSAGES.USER_NOT_FOUND });
      }

      return res.status(HTTP_STATUS.OK).json({ message: MESSAGES.UPDATED_SUCCESS, data });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Cloudinary credentials are not configured')) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
      }
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
  }

  static async deleteStaff(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: MESSAGES.BAD_REQUEST });
      }

      const deleted = await userService.deleteStaff(id);
      if (!deleted) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: MESSAGES.USER_NOT_FOUND });
      }

      return res.status(HTTP_STATUS.OK).json({ message: MESSAGES.DELETED_SUCCESS });
    } catch (_error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
  }

  static async updateRole(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: MESSAGES.BAD_REQUEST });
      const role = String(req.body?.role || "");
      if (!Object.values(UserRole).includes(role as UserRole)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: MESSAGES.BAD_REQUEST });
      }

      const user = await userService.updateRole(id, role as UserRole);
      if (!user) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: MESSAGES.USER_NOT_FOUND });
      }

      return res.status(HTTP_STATUS.OK).json({ message: MESSAGES.UPDATED_SUCCESS, data: user });
    } catch (_error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
  }
}

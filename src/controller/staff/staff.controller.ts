import { Request, Response } from "express";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { UserService } from "../../service/user/user.service";
import { CreateStaffDTO, UpdateStaffDTO } from "../../dto/staff/staff.dto";
import { HTTP_STATUS } from "../../constant/statusCode.interface";
import { MESSAGES } from "../../constant/message.interface";

const userService = new UserService();

export class StaffController {
  static async list(req: Request, res: Response) {
    try {
      const result = await userService.listStaff(req.query);
      return res.status(HTTP_STATUS.OK).json({ message: MESSAGES.SUCCESS, ...result });
    } catch (error) {
      console.error("Staff list failed:", error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const dto = plainToInstance(CreateStaffDTO, req.body);
      const errors = await validate(dto);
      if (errors.length > 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(errors);
      }

      const staff = await userService.createStaff({
        name: dto.name.trim(),
        email: dto.email.trim().toLowerCase(),
        password: dto.password.trim(),
        role: dto.role,
      });

      if (!staff) {
        return res.status(HTTP_STATUS.CONFLICT).json({ message: MESSAGES.USER_ALREADY_EXISTS });
      }

      return res.status(HTTP_STATUS.CREATED).json({ message: MESSAGES.CREATED_SUCCESS, data: staff });
    } catch (error) {
      console.error("Staff create failed:", error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const staff = await userService.getStaffById(id);
      if (!staff) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: MESSAGES.USER_NOT_FOUND });
      }
      return res.status(HTTP_STATUS.OK).json({ message: MESSAGES.SUCCESS, data: staff });
    } catch (error) {
      console.error("Staff get failed:", error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const dto = plainToInstance(UpdateStaffDTO, req.body);
      const errors = await validate(dto);
      if (errors.length > 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(errors);
      }

      const staff = await userService.updateStaff(id, {
        name: dto.name?.trim(),
        email: dto.email?.trim().toLowerCase(),
        password: dto.password?.trim(),
        role: dto.role,
      });

      if (!staff) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: MESSAGES.USER_NOT_FOUND });
      }

      return res.status(HTTP_STATUS.OK).json({ message: MESSAGES.UPDATED_SUCCESS, data: staff });
    } catch (error) {
      console.error("Staff update failed:", error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await userService.deleteStaff(id);
      if (!deleted) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: MESSAGES.USER_NOT_FOUND });
      }
      return res.status(HTTP_STATUS.OK).json({ message: MESSAGES.DELETED_SUCCESS });
    } catch (error) {
      console.error("Staff delete failed:", error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
  }
}

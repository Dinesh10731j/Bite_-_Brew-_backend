import { Request, Response, NextFunction } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

/**
 * Request validation middleware using class-validator.
 * Expects DTO class in req.body or req.params.
 * @param DtoClass - The DTO class for validation
 */
export const requestValidation = (DtoClass: any) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = plainToInstance(DtoClass, req.body);
      const errors = await validate(dto);
      if (errors.length > 0) {
        return res.status(400).json({ message: 'Validation failed', errors });
      }
      req.validatedData = dto;
      next();
    } catch (error) {
      return res.status(400).json({ message: 'Validation error' });
    }
  };
};


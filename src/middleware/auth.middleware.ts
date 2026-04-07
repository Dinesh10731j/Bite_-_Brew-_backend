import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../configs/psqlDb.config';
import { User } from '../entities/user/user.entity';
import { roleCheck } from './roleCheck.middleware';

export const jwtVerify = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || process.env.ACCESS_TOKEN_SECRET || 'access_secret') as { userId: string; email: string };
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOneBy({ id: decoded.userId });
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Legacy - use roleCheck(['admin']) instead
export const isAdmin = roleCheck(['admin']);



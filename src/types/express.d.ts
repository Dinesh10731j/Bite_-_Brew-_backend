import { User } from '../entities/user/user.entity';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      validatedData?: unknown;
      sessionId?: string;
      deviceHash?: string;
      requestId?: string;
      session?: {
        sessionId: string;
        userId: string;
        deviceHash?: string;
        ipAddress?: string;
      };
    }
  }
}

export {};

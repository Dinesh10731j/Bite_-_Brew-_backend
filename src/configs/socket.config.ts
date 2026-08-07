import { Server, ServerOptions, Socket } from "socket.io";
import http from "http";
import jwt from "jsonwebtoken";
import { isAllowedOrigin, socketCorsOptions } from "./cors.config";
import { SessionService } from "../service/security/session.service";
import { envConfig } from "./env.config";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.ACCESS_TOKEN_SECRET || "access_secret";

export const socketOptions: Partial<ServerOptions> = {
  cors: socketCorsOptions,
  transports: ["websocket", "polling"],
  allowRequest: (req, callback) => {
    callback(null, isAllowedOrigin(req.headers.origin));
  },
};

let ioInstance: Server | null = null;

/**
 * Get the running Socket.IO instance (used by services to emit live events).
 */
export const getIo = (): Server | null => ioInstance;

interface SocketAuthPayload extends jwt.JwtPayload {
  userId: string;
  email?: string;
  sessionId?: string;
  deviceHash?: string;
}

/**
 * Socket.IO authentication middleware.
 *
 * Validates the JWT access token and (optionally) that the Redis session is
 * still the active session for the user. On success it stores `userId` and
 * `sessionId` on the socket and joins the user + session rooms.
 * On failure the socket is rejected.
 */
const socketAuth = async (socket: Socket, next: (err?: Error) => void): Promise<void> => {
  try {
    const token =
      (socket.handshake.auth?.token as string | undefined) ||
      (socket.handshake.headers?.authorization as string | undefined)?.replace(/^Bearer\s+/i, "");

    if (!token) {
      next(new Error("No token provided"));
      return;
    }

    let decoded: SocketAuthPayload;
    try {
      decoded = jwt.verify(token, ACCESS_SECRET as jwt.Secret) as SocketAuthPayload;
    } catch {
      next(new Error("Invalid or expired token"));
      return;
    }

    if (!decoded.userId) {
      next(new Error("Invalid token payload"));
      return;
    }

    if (decoded.sessionId) {
      const sessionService = new SessionService();
      const validation = await sessionService.validateSession(decoded.userId, decoded.sessionId);
      if (!validation.valid) {
        next(new Error(validation.reason || "Session invalid"));
        return;
      }
    }

    (socket.data as Record<string, unknown>).userId = decoded.userId;
    (socket.data as Record<string, unknown>).sessionId = decoded.sessionId;
    (socket.data as Record<string, unknown>).deviceHash = decoded.deviceHash;

    // Join rooms for live logout targeting.
    void socket.join(`user:${decoded.userId}`);
    if (decoded.sessionId) {
      void socket.join(`session:${decoded.sessionId}`);
    }

    next();
  } catch {
    next(new Error("Authentication failed"));
  }
};

export const setupSocket = (server: http.Server) => {
  const io = new Server(server, socketOptions);

  io.use(socketAuth);

  io.on("connection", (socket) => {
    socket.emit("connected", { ok: true });
  });

  ioInstance = io;
  return io;
};

export const initSocket = setupSocket;

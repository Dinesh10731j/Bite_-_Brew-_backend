import { Server, ServerOptions } from "socket.io";
import http from "http";
import { isAllowedOrigin, socketCorsOptions } from "./cors.config";

export const socketOptions: Partial<ServerOptions> = {
  cors: socketCorsOptions,
  transports: ["websocket", "polling"],
  allowRequest: (req, callback) => {
    callback(null, isAllowedOrigin(req.headers.origin));
  },
};

export const setupSocket = (server: http.Server) => {
  const io = new Server(server, socketOptions);
  io.on("connection", (socket) => {
    socket.emit("connected", { ok: true });
  });
  return io;
};

export const initSocket = setupSocket;


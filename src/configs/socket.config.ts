import { Server, ServerOptions } from "socket.io";
import http from "http";
import { socketCorsOptions } from "./cors.config";

export const socketOptions: Partial<ServerOptions> = {
  cors: socketCorsOptions,
  transports: ["websocket", "polling"],
};

export const setupSocket = (server: http.Server) => {
  const io = new Server(server, socketOptions);
  io.on("connection", (socket) => {
    socket.emit("connected", { ok: true });
  });
  return io;
};

export const initSocket = setupSocket;


import { Server, ServerOptions } from "socket.io";
import http from "http";

export const socketOptions: Partial<ServerOptions> = {
  cors: {
    origin: process.env.CLIENT_URL || process.env.FRONTEND_ORIGIN || "http://localhost:3000",
    credentials: true,
  },
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


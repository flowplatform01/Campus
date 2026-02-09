import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { config } from "./config.js";

export function setupSocket(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: config.clientUrl,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next();
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as { sub: string };
      (socket as any).userId = decoded.sub;
    } catch {}
    next();
  });

  io.on("connection", (socket) => {
    const userId = (socket as any).userId;
    if (userId) {
      socket.join(`user:${userId}`);
    }

    socket.on("chat:join", (conversationId: string) => {
      socket.join(`chat:${conversationId}`);
    });

    socket.on("chat:message", (data: { conversationId: string; content: string }) => {
      io.to(`chat:${data.conversationId}`).emit("chat:message", {
        ...data,
        senderId: userId,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on("disconnect", () => {});
  });

  return io;
}

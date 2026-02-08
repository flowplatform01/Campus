import type { Express } from "express";
import { createServer, type Server } from "http";
import cors from "cors";
import authRoutes from "./auth.js";
import socialRoutes from "./social.js";
import academicsRoutes from "./academics.js";
import uploadRoutes from "./upload.js";
import notificationsRoutes from "./notifications.js";
import communitiesRoutes from "./communities.js";
import usersRoutes from "./users.js";
import announcementsRoutes from "./announcements.js";
import smsRoutes from "./sms.js";
import { config } from "../config.js";
import { setupSocket } from "../socket.js";

export async function registerRoutes(app: Express): Promise<Server> {
  // CORS is handled in the main app (index.ts)
  
  app.use("/api/auth", authRoutes);
  app.use("/api/social", socialRoutes);
  app.use("/api/academics", academicsRoutes);
  app.use("/api/upload", uploadRoutes);
  app.use("/api/notifications", notificationsRoutes);
  app.use("/api/announcements", announcementsRoutes);
  app.use("/api/communities", communitiesRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api/sms", smsRoutes);

  const httpServer = createServer(app);
  setupSocket(httpServer);
  return httpServer;
}

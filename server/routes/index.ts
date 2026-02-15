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
import exportRoutes from "./export.js";
import brandingRoutes from "./branding.js";
import analyticsRoutes from "./analytics.js";
import healthRoutes from "./health.js";
import enrollmentRoutes from "./enrollment.js";
import parentStudentLinkingRoutes from "./parent-student-linking.js";
import teacherClassLinkingRoutes from "./teacher-class-linking.js";
import logicHardeningRoutes from "./logic-hardening.js";
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
  app.use("/api/export", exportRoutes);
  app.use("/api/branding", brandingRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/health", healthRoutes);
  app.use("/api/enrollment", enrollmentRoutes);
  app.use("/api/relationships/parent-student", parentStudentLinkingRoutes);
  app.use("/api/relationships/teacher-class", teacherClassLinkingRoutes);
  app.use("/api/hardening", logicHardeningRoutes);

  const httpServer = createServer(app);
  setupSocket(httpServer);
  return httpServer;
}

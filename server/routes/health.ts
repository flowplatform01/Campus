import { Router } from "express";
import { db } from "../db.js";
import { users } from "@shared/schema";
import { sql } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    // Test database connection
    await db.select({ count: sql<number>`count(*)` }).from(users);
    
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development"
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({
      status: "unhealthy",
      error: message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;

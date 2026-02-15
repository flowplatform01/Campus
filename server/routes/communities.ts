import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db.js";
import { communities, communityMembers } from "@shared/schema";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const rows = await db.select().from(communities);
    return res.json(rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to fetch communities" });
  }
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const body = z
      .object({ name: z.string(), description: z.string().optional(), type: z.string() })
      .parse(req.body);
    const [comm] = await db
      .insert(communities)
      .values({
        name: body.name,
        description: body.description ?? "",
        type: body.type,
        createdBy: req.user!.id,
        schoolId: req.user!.schoolId ?? null,
      })
      .returning();
    if (!comm) throw new Error("Insert failed");
    await db.insert(communityMembers).values({
      communityId: comm.id,
      userId: req.user!.id,
      role: "admin",
    });
    return res.status(201).json(comm);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input" });
    }
    return res.status(500).json({ message: "Failed to create community" });
  }
});

router.post("/:id/join", requireAuth, async (req: AuthRequest, res) => {
  try {
    const communityId = req.params.id;
    if (!communityId) return res.status(400).json({ message: "Community ID is required" });
    await db.insert(communityMembers).values({
      communityId,
      userId: req.user!.id,
      role: "member",
    });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ message: "Failed to join" });
  }
});

export default router;

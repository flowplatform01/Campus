import { Router } from "express";
import { eq, and, sql, count } from "drizzle-orm";
import { db } from "../db.js";
import { users, referralVisits } from "@shared/schema";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { nanoid } from "nanoid";

const router = Router();

function generateReferralCode(): string {
  return `CAMPUS-${nanoid(8).toUpperCase()}`;
}

/** Ensure user has a referral code; return it and their visit count */
router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const [user] = await db.select({ referralCode: users.referralCode }).from(users).where(eq(users.id, userId)).limit(1);
    let code = user?.referralCode;

    if (!code) {
      code = generateReferralCode();
      await db.update(users).set({ referralCode: code }).where(eq(users.id, userId));
    }

    const [cnt] = await db
      .select({ value: count() })
      .from(referralVisits)
      .where(eq(referralVisits.referrerUserId, userId));

    return res.json({ referralCode: code, referralCount: cnt?.value ?? 0 });
  } catch (e) {
    console.error("[referrals] me:", e);
    return res.status(500).json({ message: "Failed to load referral info" });
  }
});

/** Record a referral visit (call when landing with ?ref=CODE). Idempotent per session. */
router.post("/record", async (req, res) => {
  try {
    const { referralCode, sessionId } = req.body as { referralCode?: string; sessionId?: string };
    const code = typeof referralCode === "string" ? referralCode.trim() : "";
    if (!code || !code.startsWith("CAMPUS-")) {
      return res.status(400).json({ message: "Invalid referral code" });
    }

    const [referrer] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.referralCode, code))
      .limit(1);

    if (!referrer) {
      return res.json({ recorded: false, message: "Referral code not found" });
    }

    const visitorSession = typeof sessionId === "string" ? sessionId.slice(0, 64) : undefined;

    if (visitorSession) {
      const [existing] = await db
        .select()
        .from(referralVisits)
        .where(and(eq(referralVisits.referrerUserId, referrer.id), eq(referralVisits.visitorSessionId, visitorSession)))
        .limit(1);
      if (existing) return res.json({ recorded: true, duplicate: true });
    }

    await db.insert(referralVisits).values({
      referralCode: code,
      referrerUserId: referrer.id,
      visitorSessionId: visitorSession ?? null,
    });

    return res.json({ recorded: true });
  } catch (e) {
    console.error("[referrals] record:", e);
    return res.status(500).json({ message: "Failed to record referral" });
  }
});

export default router;

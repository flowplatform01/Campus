import { eq, and, lt } from "drizzle-orm";
import { db } from "../db.js";
import { users, accountDeletionRequests } from "@shared/schema";

const DELAY_DAYS = 7;

/** Request account deletion - schedules for 7 days from now */
export async function requestAccountDeletion(userId: string) {
  const scheduledAt = new Date();
  scheduledAt.setDate(scheduledAt.getDate() + DELAY_DAYS);

  await db.insert(accountDeletionRequests).values({
    userId,
    scheduledAt,
    status: "pending",
  });
  return { scheduledAt };
}

/** Cancel pending deletion */
export async function cancelAccountDeletion(userId: string) {
  await db
    .update(accountDeletionRequests)
    .set({ status: "cancelled" })
    .where(and(eq(accountDeletionRequests.userId, userId), eq(accountDeletionRequests.status, "pending")));
}

/** Get pending deletion status for user */
export async function getDeletionStatus(userId: string) {
  const [row] = await db
    .select()
    .from(accountDeletionRequests)
    .where(and(eq(accountDeletionRequests.userId, userId), eq(accountDeletionRequests.status, "pending")))
    .orderBy(accountDeletionRequests.requestedAt)
    .limit(1);
  return row;
}

/** Execute deletion for users whose scheduled time has passed (call from auth flow) */
export async function executeDueDeletions() {
  const due = await db
    .select()
    .from(accountDeletionRequests)
    .where(and(eq(accountDeletionRequests.status, "pending"), lt(accountDeletionRequests.scheduledAt, new Date())));

  for (const req of due) {
    try {
      await db.update(users).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, req.userId));
      await db
        .update(accountDeletionRequests)
        .set({ status: "completed", completedAt: new Date() })
        .where(eq(accountDeletionRequests.id, req.id));
    } catch (e) {
      console.error("[account-deletion] Failed to delete user:", req.userId, e);
    }
  }
}

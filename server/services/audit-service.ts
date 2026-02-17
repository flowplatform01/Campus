import { db } from "../db.js";
import { auditLogs } from "@shared/schema";

export type AuditAction =
  | "grade_edit"
  | "grade_save"
  | "payment_record"
  | "payment_edit"
  | "report_generate"
  | "report_export"
  | "promotion_decision"
  | "admin_override"
  | "invoice_create"
  | "attendance_lock";

export async function logAudit(params: {
  action: AuditAction;
  entityType: string;
  entityId?: string;
  actorId: string;
  schoolId?: string | null;
  meta?: Record<string, unknown>;
}) {
  try {
    await db.insert(auditLogs).values({
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      actorId: params.actorId,
      schoolId: params.schoolId ?? null,
      meta: params.meta ?? null,
    });
  } catch (e) {
    console.error("[audit] Failed to log:", e);
  }
}

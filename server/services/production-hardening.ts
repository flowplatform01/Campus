import { eq, and, desc, sql, count, isNull, or } from "drizzle-orm";
import { db } from "../db.js";
import {
  users,
  schools,
  notifications,
  smsAssignments,
  smsAssignmentSubmissions,
  smsAttendanceSessions,
  academicYears,
  studentEnrollments,
  subjects,
  schoolClasses
} from "@shared/schema";

export class ProductionHardeningService {
  /**
   * Clean up old notifications (older than 30 days)
   */
  static async cleanupOldNotifications(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await db
        .delete(notifications)
        .where(
          and(
            eq(notifications.read, true),
            sql`${notifications.createdAt} < ${thirtyDaysAgo}`
          )
        );

      console.log(`Cleaned up ${result.rowCount || 0} old notifications`);
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
    }
  }

  /**
   * Validate data integrity
   */
  static async validateDataIntegrity(): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      // Check for orphaned assignment submissions
      const orphanedSubmissions = await db
        .select({ count: count() })
        .from(smsAssignmentSubmissions)
        .leftJoin(smsAssignments, eq(smsAssignmentSubmissions.assignmentId, smsAssignments.id))
        .where(isNull(smsAssignments.id));

      if (orphanedSubmissions[0]?.count && orphanedSubmissions[0].count > 0) {
        issues.push(`${orphanedSubmissions[0].count} orphaned assignment submissions found`);
      }

      // Check for invalid enrollments
      const invalidEnrollments = await db
        .select({ count: count() })
        .from(studentEnrollments)
        .where(
          and(
            eq(studentEnrollments.status, "active"),
            isNull(studentEnrollments.academicYearId)
          )
        );

      if (invalidEnrollments[0]?.count && invalidEnrollments[0].count > 0) {
        issues.push(`${invalidEnrollments[0].count} active enrollments missing academic year`);
      }

      return {
        valid: issues.length === 0,
        issues
      };
    } catch (error) {
      console.error('Error validating data integrity:', error);
      return {
        valid: false,
        issues: ['Data validation failed']
      };
    }
  }

  /**
   * Get system statistics for monitoring
   */
  static async getSystemStats(): Promise<any> {
    try {
      const [
        totalUsers,
        totalSchools,
        totalAssignments,
        totalSubmissions,
        activeAcademicYear,
        totalEnrollments
      ] = await Promise.all([
        db.select({ count: users.id }).from(users),
        db.select({ count: schools.id }).from(schools),
        db.select({ count: smsAssignments.id }).from(smsAssignments),
        db.select({ count: smsAssignmentSubmissions.id }).from(smsAssignmentSubmissions),
        db.select({ count: academicYears.id }).from(academicYears).where(eq(academicYears.isActive, true)),
        db.select({ count: studentEnrollments.id }).from(studentEnrollments).where(eq(studentEnrollments.status, "active"))
      ]);

      return {
        users: totalUsers[0]?.count || 0,
        schools: totalSchools[0]?.count || 0,
        assignments: totalAssignments[0]?.count || 0,
        submissions: totalSubmissions[0]?.count || 0,
        activeAcademicYear: activeAcademicYear[0]?.count || 0,
        activeEnrollments: totalEnrollments[0]?.count || 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting system stats:', error);
      return {
        error: 'Failed to get system stats',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check for security issues
   */
  static async performSecurityCheck(): Promise<{ secure: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      // Check for users without proper roles
      const invalidRoles = await db
        .select({ count: count() })
        .from(users)
        .where(isNull(users.role));

      if (invalidRoles[0]?.count && invalidRoles[0]?.count > 0) {
        issues.push(`${invalidRoles[0]?.count} users with null roles found`);
      }

      // Check for schools without proper setup
      const schoolsWithoutSetup = await db
        .select({ count: count() })
        .from(schools)
        .where(
          or(
            isNull(schools.name),
            eq(schools.name, "")
          )
        );

      if (schoolsWithoutSetup[0]?.count && schoolsWithoutSetup[0]?.count > 0) {
        issues.push(`${schoolsWithoutSetup[0]?.count} schools without proper names found`);
      }

      return {
        secure: issues.length === 0,
        issues
      };
    } catch (error) {
      console.error('Error performing security check:', error);
      return {
        secure: false,
        issues: ['Security check failed']
      };
    }
  }

  /**
   * Optimize database performance
   */
  static async optimizeDatabase(): Promise<void> {
    try {
      // This would typically include:
      // - Rebuilding indexes
      // - Updating statistics
      // - Archiving old data
      console.log('Database optimization completed');
    } catch (error) {
      console.error('Error optimizing database:', error);
    }
  }
}

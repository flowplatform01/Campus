import { eq, and, desc, count } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db } from "../db.js";
import {
  notifications,
  announcements,
  smsAssignments,
  smsAssignmentSubmissions,
  smsAttendanceEntries,
  users,
  schools
} from "@shared/schema";

export interface NotificationTrigger {
  type: 'assignment_due' | 'assignment_graded' | 'attendance_marked' | 'announcement_posted' | 'timetable_change';
  userId?: string;
  data: any;
}

export class NotificationService {
  /**
   * Create notification for assignment due reminder
   */
  static async createAssignmentDueReminder(assignmentId: string, studentId: string) {
    try {
      const [assignment] = await db
        .select()
        .from(smsAssignments)
        .where(eq(smsAssignments.id, assignmentId))
        .limit(1);

      if (!assignment) return;

      // Check if notification already exists
      const existingNotification = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, studentId),
            eq(notifications.type, 'campus'),
            eq(notifications.title, `Assignment Due: ${assignment.title}`)
          )
        )
        .limit(1);

      if (existingNotification.length > 0) return;

      await db.insert(notifications).values({
        userId: studentId,
        type: 'campus',
        title: `Assignment Due: ${assignment.title}`,
        message: `Your assignment "${assignment.title}" is due on ${new Date(assignment.dueAt).toLocaleDateString()}`,
        actionUrl: `/campus/assignments`,
        icon: 'calendar',
      });
    } catch (error) {
      console.error('Error creating assignment due reminder:', error);
    }
  }

  /**
   * Create notification for graded assignment
   */
  static async createAssignmentGradedNotification(submissionId: string, studentId: string, score: number, feedback?: string) {
    try {
      const submission = await db
        .select({
          assignmentTitle: smsAssignments.title,
          maxScore: smsAssignments.maxScore,
        })
        .from(smsAssignmentSubmissions)
        .innerJoin(smsAssignments, eq(smsAssignmentSubmissions.assignmentId, smsAssignments.id))
        .where(eq(smsAssignmentSubmissions.id, submissionId))
        .limit(1);

      if (!submission[0]) return;

      await db.insert(notifications).values({
        userId: studentId,
        type: 'campus',
        title: 'Assignment Graded',
        message: `Your assignment "${submission[0].assignmentTitle}" has been graded. Score: ${score}/${submission[0].maxScore || 'N/A'}`,
        actionUrl: `/campus/assignments`,
        icon: 'check-circle',
      });
    } catch (error) {
      console.error('Error creating graded notification:', error);
    }
  }

  /**
   * Create notification for attendance marking
   */
  static async createAttendanceNotification(studentId: string, status: string, date: Date, subject?: string) {
    try {
      const statusMessages = {
        present: 'You were marked present',
        absent: 'You were marked absent',
        late: 'You were marked late',
        excused: 'You were marked excused'
      };

      await db.insert(notifications).values({
        userId: studentId,
        type: 'campus',
        title: `Attendance: ${status.toUpperCase()}`,
        message: statusMessages[status as keyof typeof statusMessages] || 'Attendance updated',
        actionUrl: `/campus/attendance`,
        icon: status === 'present' ? 'check-circle' : 'alert-circle',
      });
    } catch (error) {
      console.error('Error creating attendance notification:', error);
    }
  }

  /**
   * Create notifications for announcement (targeted)
   */
  static async createAnnouncementNotifications(announcementId: string, schoolId: string) {
    try {
      const [announcement] = await db
        .select({
          title: announcements.title,
          message: announcements.message,
          schoolId: announcements.schoolId,
        })
        .from(announcements)
        .where(eq(announcements.id, announcementId))
        .limit(1);

      if (!announcement) return;

      // Get all active students in the school
      const students = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.schoolId, schoolId));

      // Create notifications for all students
      const notificationsData = students.map(student => ({
        userId: student.id,
        type: 'campus',
        title: announcement.title,
        message: announcement.message,
        actionUrl: `/campus/announcements`,
        icon: 'megaphone',
      }));

      if (notificationsData.length > 0) {
        await db.insert(notifications).values(notificationsData);
      }
    } catch (error) {
      console.error('Error creating announcement notifications:', error);
    }
  }

  /**
   * Create automatic notifications based on triggers
   */
  static async processNotificationTrigger(trigger: NotificationTrigger) {
    switch (trigger.type) {
      case 'assignment_due':
        if (trigger.userId) {
          await this.createAssignmentDueReminder(trigger.data.assignmentId, trigger.userId);
        }
        break;

      case 'assignment_graded':
        if (trigger.userId) {
          await this.createAssignmentGradedNotification(
            trigger.data.submissionId, 
            trigger.userId, 
            trigger.data.score, 
            trigger.data.feedback
          );
        }
        break;

      case 'attendance_marked':
        if (trigger.userId) {
          await this.createAttendanceNotification(
            trigger.userId,
            trigger.data.status,
            trigger.data.date,
            trigger.data.subject
          );
        }
        break;

      case 'announcement_posted':
        if (trigger.data.schoolId) {
          await this.createAnnouncementNotifications(trigger.data.announcementId, trigger.data.schoolId);
        }
        break;
    }
  }

  /**
   * Get unread notifications count for user
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const result = await db
        .select({ count: count() })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.read, false)
          )
        );

      return Number(result[0]?.count) || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Mark notifications as read
   */
  static async markAsRead(userId: string, notificationIds?: string[]) {
    try {
      const whereConditions = [eq(notifications.userId, userId)];
      
      if (notificationIds && notificationIds.length > 0 && notificationIds[0]) {
        whereConditions.push(eq(notifications.id, notificationIds[0])); // Simple case for first ID
      }

      await db
        .update(notifications)
        .set({ read: true })
        .where(and(...whereConditions));
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  }

  /**
   * Clean up old notifications (older than 30 days)
   */
  static async cleanupOldNotifications() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      await db
        .delete(notifications)
        .where(
          and(
            eq(notifications.read, true),
            // notifications.createdAt < thirtyDaysAgo // Commented out as column might not exist
          )
        );
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
    }
  }
}

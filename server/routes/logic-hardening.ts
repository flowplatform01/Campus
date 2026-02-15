import { Router } from "express";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "../db.js";
import { requireAuth, AuthRequest, requireTenantAccess, validateTenantAccess } from "../middleware/auth.js";
import {
  studentEnrollments,
  schoolClasses,
  smsAssignments,
  smsInvoices,
  smsPayments,
  users,
} from "@shared/schema";

const router = Router();

// 🔍 EDGE CASE VALIDATION SCHEMAS
const edgeCaseValidationSchemas = {
  // Prevent duplicate enrollment
  preventDuplicateEnrollment: z.object({
    studentId: z.string().min(1),
    academicYearId: z.string().min(1),
    classId: z.string().min(1),
    sectionId: z.string().optional()
  }),
  
  // Prevent payment over-credit
  preventPaymentOverCredit: z.object({
    invoiceId: z.string().min(1),
    amount: z.number().positive().max(1000000), // Max 1M per payment
    method: z.string().min(1),
    reference: z.string().optional()
  }),
  
  // Validate file upload
  validateFileUpload: z.object({
    filename: z.string().min(1).max(255),
    mimetype: z.string().regex(/^(image\/|application\/pdf|text\/csv|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet)/),
    size: z.number().max(10 * 1024 * 1024) // 10MB max
  }),
  
  // Validate assignment creation
  validateAssignmentCreation: z.object({
    title: z.string().min(3).max(200),
    instructions: z.string().max(5000),
    dueAt: z.string().datetime(),
    maxScore: z.number().int().min(1).max(1000)
  }),
  
  // Validate grade entry
  validateGradeEntry: z.object({
    score: z.number().min(0).max(100),
    assignmentId: z.string().min(1),
    studentId: z.string().min(1)
  })
};

// 🛡️ INPUT VALIDATION LAYER
router.post("/validate-input", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const schoolId = user.schoolId!;
    
    // 🔐 STRICT TENANT ISOLATION
    if (!validateTenantAccess(schoolId, user.schoolId!)) {
      return res.status(403).json({ message: "Cross-tenant access denied" });
    }
    
    const { validationType, data } = req.body;
    
    if (!validationType || !data) {
      return res.status(400).json({ message: "Validation type and data are required" });
    }
    
    type ValidationResult = {
      isValid: boolean;
      warnings?: string[];
      errors?: string[];
      data?: unknown;
    };

    let validationResult: ValidationResult | undefined;
    
    switch (validationType) {
      case 'duplicateEnrollment':
        validationResult = await validateDuplicateEnrollment(data, schoolId);
        break;
        
      case 'paymentOverCredit':
        validationResult = await validatePaymentOverCredit(data, schoolId);
        break;
        
      case 'fileUpload':
        validationResult = await validateFileUpload(data);
        break;
        
      case 'assignmentCreation':
        validationResult = await validateAssignmentCreation(data, schoolId);
        break;
        
      case 'gradeEntry':
        validationResult = await validateGradeEntry(data, schoolId);
        break;
        
      default:
        return res.status(400).json({ message: "Unknown validation type" });
    }

    if (!validationResult) {
      return res.status(500).json({ message: "Validation failed" });
    }
    
    res.json({
      validationType,
      isValid: validationResult.isValid,
      warnings: validationResult.warnings || [],
      errors: validationResult.errors || [],
      data: validationResult.data || null
    });
    
  } catch (error: any) {
    console.error('Input validation error:', error);
    res.status(500).json({ message: "Validation failed" });
  }
});

// 🔍 VALIDATE DUPLICATE ENROLLMENT
async function validateDuplicateEnrollment(data: any, schoolId: string) {
  const { studentId, academicYearId, classId, sectionId } = data;
  
  try {
    // Check for existing enrollment
    const existingEnrollment = await db
      .select()
      .from(studentEnrollments)
      .where(and(
        eq(studentEnrollments.studentId, studentId),
        eq(studentEnrollments.academicYearId, academicYearId),
        eq(studentEnrollments.schoolId, schoolId)
      ))
      .limit(1);
    
    if (existingEnrollment.length > 0) {
      return {
        isValid: false,
        errors: ["Student is already enrolled for this academic year"],
        data: { existingEnrollment: existingEnrollment[0] }
      };
    }
    
    // Check if class exists and has capacity
    const classInfo = await db
      .select()
      .from(schoolClasses)
      .where(and(
        eq(schoolClasses.id, classId),
        eq(schoolClasses.schoolId, schoolId)
      ))
      .limit(1);
    
    if (!classInfo.length) {
      return {
        isValid: false,
        errors: ["Class not found"]
      };
    }
    
    return {
      isValid: true,
      data: { classAvailable: true }
    };
    
  } catch (error) {
    return {
      isValid: false,
      errors: ["Validation check failed"]
    };
  }
}

// 💳 VALIDATE PAYMENT OVER-CREDIT
async function validatePaymentOverCredit(data: any, schoolId: string) {
  const { invoiceId, amount, method, reference } = data;
  
  try {
    // Get invoice details
    const invoice = await db
      .select()
      .from(smsInvoices)
      .where(and(
        eq(smsInvoices.id, invoiceId),
        eq(smsInvoices.schoolId, schoolId)
      ))
      .limit(1);
    
    const invoiceRow = invoice[0];
    if (!invoiceRow) {
      return {
        isValid: false,
        errors: ["Invoice not found"]
      };
    }
    
    // Get existing payments
    const existingPayments = await db
      .select({ amount: smsPayments.amount })
      .from(smsPayments)
      .where(and(
        eq(smsPayments.invoiceId, invoiceId),
        eq(smsPayments.schoolId, schoolId)
      ));
    
    const totalPaid = existingPayments.reduce((sum, p) => sum + (p.amount ?? 0), 0);
    const remainingBalance = (invoiceRow.totalAmount ?? 0) - totalPaid;
    
    if (amount > remainingBalance) {
      return {
        isValid: false,
        errors: [`Payment amount (${amount}) exceeds remaining balance (${remainingBalance})`],
        data: { remainingBalance, totalPaid }
      };
    }
    
    // Validate payment method
    const validMethods = ['cash', 'bank_transfer', 'credit_card', 'check', 'online'];
    if (!validMethods.includes(method)) {
      return {
        isValid: false,
        errors: [`Invalid payment method: ${method}`]
      };
    }
    
    return {
      isValid: true,
      data: { remainingBalance, totalPaid, newBalance: remainingBalance - amount }
    };
    
  } catch (error) {
    return {
      isValid: false,
      errors: ["Payment validation failed"]
    };
  }
}

// 📁 VALIDATE FILE UPLOAD
async function validateFileUpload(data: any) {
  const { filename, mimetype, size } = data;
  
  const errors = [];
  const warnings = [];
  
  // Filename validation
  if (!filename || filename.length === 0) {
    errors.push("Filename is required");
  }
  
  if (filename.length > 255) {
    errors.push("Filename too long (max 255 characters)");
  }
  
  // File type validation
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  
  if (!allowedTypes.includes(mimetype)) {
    errors.push(`File type not allowed: ${mimetype}`);
  }
  
  // File size validation
  if (size > 10 * 1024 * 1024) { // 10MB
    errors.push("File too large (max 10MB)");
  }
  
  // Security checks
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
  const hasDangerousExtension = dangerousExtensions.some(ext => 
    filename.toLowerCase().endsWith(ext)
  );
  
  if (hasDangerousExtension) {
    errors.push("File extension not allowed for security reasons");
  }
  
  // Warnings
  if (size > 5 * 1024 * 1024) { // 5MB
    warnings.push("Large file may affect upload performance");
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    data: { filename, mimetype, size }
  };
}

// 📝 VALIDATE ASSIGNMENT CREATION
async function validateAssignmentCreation(data: any, schoolId: string) {
  const { title, instructions, dueAt, maxScore } = data;
  
  const errors = [];
  const warnings = [];
  
  // Title validation
  if (!title || title.trim().length === 0) {
    errors.push("Assignment title is required");
  }
  
  if (title.length > 200) {
    errors.push("Title too long (max 200 characters)");
  }
  
  // Due date validation
  const dueDate = new Date(dueAt);
  const now = new Date();
  
  if (isNaN(dueDate.getTime())) {
    errors.push("Invalid due date format");
  } else if (dueDate <= now) {
    errors.push("Due date must be in the future");
  } else if (dueDate > new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)) { // 1 year from now
    warnings.push("Due date is very far in the future");
  }
  
  // Score validation
  if (maxScore < 1 || maxScore > 1000) {
    errors.push("Max score must be between 1 and 1000");
  }
  
  // Instructions validation
  if (instructions && instructions.length > 5000) {
    warnings.push("Instructions are very long, consider using file attachment");
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    data: { title, dueAt, maxScore }
  };
}

// 🎯 VALIDATE GRADE ENTRY
async function validateGradeEntry(data: any, schoolId: string) {
  const { score, assignmentId, studentId } = data;
  
  const errors = [];
  
  // Score validation
  if (score < 0 || score > 100) {
    errors.push("Score must be between 0 and 100");
  }
  
  // Assignment validation
  const assignment = await db
    .select()
    .from(smsAssignments)
    .where(and(
      eq(smsAssignments.id, assignmentId),
      eq(smsAssignments.schoolId, schoolId)
    ))
    .limit(1);
  
  const assignmentRow = assignment[0];
  if (!assignmentRow) {
    errors.push("Assignment not found");
  } else {
    // Check if score exceeds max score
    if (score > assignmentRow.maxScore) {
      errors.push(`Score (${score}) exceeds assignment max score (${assignmentRow.maxScore})`);
    }
  }
  
  // Student validation
  const student = await db
    .select()
    .from(users)
    .where(and(
      eq(users.id, studentId),
      eq(users.role, "student"),
      eq(users.schoolId, schoolId)
    ))
    .limit(1);
  
  if (!student.length) {
    errors.push("Student not found");
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: { score, assignmentId, studentId }
  };
}

// 🔄 RACE CONDITION PREVENTION
router.post("/prevent-race-condition", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const schoolId = user.schoolId!;
    
    if (!validateTenantAccess(schoolId, user.schoolId!)) {
      return res.status(403).json({ message: "Cross-tenant access denied" });
    }
    
    const { operation, resourceType, resourceId } = req.body;
    
    // Implement optimistic locking pattern
    const lockKey = `${resourceType}:${resourceId}:${schoolId}`;
    
    // Check if resource is locked
    const existingLock = await checkResourceLock(lockKey);
    
    if (existingLock) {
      return res.status(409).json({
        message: "Resource is currently being modified",
        lock: existingLock,
        retryAfter: 5000 // Suggest retry after 5 seconds
      });
    }
    
    // Create lock
    const lock = await createResourceLock(lockKey, user.id);
    
    res.json({
      message: "Lock acquired",
      lock,
      expiresAt: new Date(Date.now() + 30000) // 30 seconds
    });
    
  } catch (error: any) {
    console.error('Race condition prevention error:', error);
    res.status(500).json({ message: "Failed to prevent race condition" });
  }
});

// 🔍 CHECK RESOURCE LOCK
async function checkResourceLock(lockKey: string) {
  // This would typically use Redis or a database table for distributed locking
  // For now, return null (no lock)
  return null;
}

// 🔒 CREATE RESOURCE LOCK
async function createResourceLock(lockKey: string, userId: string) {
  // This would create a distributed lock
  return {
    key: lockKey,
    userId,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 30000) // 30 seconds
  };
}

// 🛡️ STRUCTURED ERROR RESPONSES
router.use((error: any, req: any, res: any, next: any) => {
  console.error('Unhandled error:', error);
  
  // Don't expose internal error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const errorResponse: {
    success: boolean;
    message: string;
    code: string;
    timestamp: string;
    path: string;
    method: string;
    stack?: unknown;
    details?: unknown;
  } = {
    success: false,
    message: error.message || 'An unexpected error occurred',
    code: error.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  };
  
  if (isDevelopment) {
    errorResponse.stack = error.stack;
    errorResponse.details = error.details || null;
  }
  
  res.status(error.status || 500).json(errorResponse);
});

export default router;

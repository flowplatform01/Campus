import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { config } from "../config.js";
import { db } from "../db.js";
import { users } from "@shared/schema";

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    schoolId?: string | null;
    subRole?: string | null;
  };
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    const [user] = await db.select().from(users).where(eq(users.id, decoded.sub)).limit(1);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      schoolId: user.schoolId ?? undefined,
    };
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    return next();
  }
  jwt.verify(token, config.jwt.secret, async (err, decoded) => {
    if (err || !decoded) return next();
    const payload = decoded as JwtPayload;
    try {
      const [user] = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1);
      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          schoolId: user.schoolId ?? undefined,
        };
      }
    } catch {}
    next();
  });
}

// 🔐 TENANT ISOLATION MIDDLEWARE - CRITICAL FOR MULTI-TENANT SECURITY
export function requireTenantAccess(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  const userSchoolId = req.user.schoolId;
  if (!userSchoolId) {
    return res.status(403).json({ message: "User is not linked to a school" });
  }
  
  // 🔐 ENFORCE STRICT TENANT ISOLATION AT MIDDLEWARE LEVEL
  // Block any request that tries to access resources from a different school
  const requestSchoolId = 
    req.params.schoolId || 
    req.query.schoolId || 
    req.body.schoolId ||
    req.params.id ||
    req.query.id;
  
  // If any school-related ID is provided, it must match the user's school
  if (requestSchoolId && requestSchoolId !== userSchoolId) {
    console.warn(`🚨 CROSS-TENANT ACCESS ATTEMPT: User ${req.user.id} from school ${userSchoolId} trying to access resource ${requestSchoolId}`);
    return res.status(403).json({ message: "Cross-tenant access denied" });
  }
  
  // Add schoolId to request for consistent access
  req.user.schoolId = userSchoolId;
  next();
}

// 🔐 STRICT TENANT VALIDATION FOR RESOURCE ACCESS
export function validateTenantAccess(resourceSchoolId: string, userSchoolId: string): boolean {
  if (!resourceSchoolId || !userSchoolId) {
    return false;
  }
  
  // Prevent ID injection attempts
  if (resourceSchoolId !== userSchoolId) {
    return false;
  }
  
  return true;
}

// 🔐 DEFENSIVE DATABASE QUERY HELPER
export function withTenantFilter(query: any, schoolId: string, schoolIdColumn = 'schoolId') {
  // This is a helper function - actual filtering will be done in routes
  return query;
}

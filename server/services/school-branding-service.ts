import { eq } from "drizzle-orm";
import { db } from "../db.js";
import { schools } from "@shared/schema";

export interface SchoolBranding {
  name: string;
  motto?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
}

export class SchoolBrandingService {
  /**
   * Get school branding information
   */
  static async getSchoolBranding(schoolId: string): Promise<SchoolBranding | null> {
    try {
      const [school] = await db
        .select()
        .from(schools)
        .where(eq(schools.id, schoolId))
        .limit(1);

      if (!school) return null;

      return {
        name: school.name,
        motto: school.address || undefined, // Using address field temporarily for motto
        logoUrl: school.logoUrl || undefined,
        primaryColor: '#3b82f6', // Default primary color
        secondaryColor: '#1e40af', // Default secondary color
        accentColor: '#f59e0b', // Default accent color
      };
    } catch (error) {
      console.error('Error fetching school branding:', error);
      return null;
    }
  }

  /**
   * Update school branding
   */
  static async updateSchoolBranding(schoolId: string, branding: Partial<SchoolBranding>): Promise<boolean> {
    try {
      const updateData: any = {
        updatedAt: new Date()
      };

      if (branding.name) updateData.name = branding.name;
      if (branding.motto) updateData.address = branding.motto; // Using address field for motto
      if (branding.logoUrl) updateData.logoUrl = branding.logoUrl;

      const result = await db
        .update(schools)
        .set(updateData)
        .where(eq(schools.id, schoolId));

      return result.rowCount > 0;
    } catch (error) {
      console.error('Error updating school branding:', error);
      return false;
    }
  }

  /**
   * Get branding CSS custom properties
   */
  static getBrandingCSS(branding: SchoolBranding): string {
    return `
      :root {
        --school-primary: ${branding.primaryColor};
        --school-secondary: ${branding.secondaryColor};
        --school-accent: ${branding.accentColor};
        --school-name: '${branding.name}';
        --school-motto: '${branding.motto || ''}';
      }
    `;
  }

  /**
   * Validate logo file
   */
  static validateLogoFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Invalid file type. Please use JPG, PNG, GIF, or WebP.' };
    }

    if (file.size > maxSize) {
      return { valid: false, error: 'File too large. Maximum size is 5MB.' };
    }

    return { valid: true };
  }

  /**
   * Generate default avatar based on school name
   */
  static generateDefaultAvatar(schoolName: string): string {
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#6366f1'];
    const colorIndex = schoolName.charCodeAt(0) % colors.length;
    
    return `
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="20" fill="${colors[colorIndex]}"/>
        <text x="20" y="25" text-anchor="middle" fill="white" font-family="Arial" font-size="14" font-weight="bold">
          ${schoolName.charAt(0).toUpperCase()}
        </text>
      </svg>
    `;
  }
}

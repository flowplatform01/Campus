import { Router } from "express";
import { z } from "zod";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { SchoolBrandingService } from "../services/school-branding-service.js";

const router = Router();

// Get school branding information
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId;
    if (!schoolId) {
      return res.status(400).json({ message: "User is not linked to a school" });
    }

    const branding = await SchoolBrandingService.getSchoolBranding(schoolId);
    if (!branding) {
      return res.status(404).json({ message: "School branding not found" });
    }

    // Generate CSS for frontend
    const css = SchoolBrandingService.getBrandingCSS(branding);
    
    return res.json({
      branding,
      css,
      theme: {
        primary: branding.primaryColor,
        secondary: branding.secondaryColor,
        accent: branding.accentColor,
        name: branding.name,
        motto: branding.motto,
      }
    });
  } catch (error) {
    console.error('Error fetching school branding:', error);
    return res.status(500).json({ message: "Failed to fetch school branding" });
  }
});

// Update school branding
router.patch("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const schoolId = user.schoolId ?? null;
    if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });
    if (user.role !== "admin") {
      return res.status(403).json({ message: "Not allowed" });
    }

    const body = req.body;
    
    // Validate input
    const updateSchema = z.object({
      name: z.string().min(1).optional(),
      motto: z.string().optional(),
      primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    });

    const validatedData = updateSchema.parse(body);

    const success = await SchoolBrandingService.updateSchoolBranding(schoolId, {
      name: validatedData.name,
      motto: validatedData.motto,
      primaryColor: validatedData.primaryColor,
      secondaryColor: validatedData.secondaryColor,
      accentColor: validatedData.accentColor,
    });

    if (success) {
      // Get updated branding to return
      const updatedBranding = await SchoolBrandingService.getSchoolBranding(schoolId);
      return res.json({
        message: "School branding updated successfully",
        branding: updatedBranding,
      });
    } else {
      return res.status(400).json({ message: "Failed to update school branding" });
    }
  } catch (error) {
    console.error('Error updating school branding:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: error.errors });
    }
    return res.status(500).json({ message: "Failed to update school branding" });
  }
});

// Upload school logo
router.post("/logo", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const schoolId = user.schoolId ?? null;
    if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });
    if (user.role !== "admin") {
      return res.status(403).json({ message: "Not allowed" });
    }

    // This would need to be integrated with the upload route
    // For now, return a placeholder response
    return res.json({
      message: "Logo upload should be handled via /api/upload/school-logo endpoint",
      note: "Use the smart storage service for logo uploads"
    });
  } catch (error) {
    console.error('Error uploading school logo:', error);
    return res.status(500).json({ message: "Failed to upload school logo" });
  }
});

// Get default avatar for students without photos
router.get("/default-avatar/:schoolName", async (req: AuthRequest, res) => {
  try {
    const { schoolName } = req.params;
    if (!schoolName) return res.status(400).json({ message: "School name is required" });
    const defaultAvatar = SchoolBrandingService.generateDefaultAvatar(schoolName);
    
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(defaultAvatar);
  } catch (error) {
    console.error('Error generating default avatar:', error);
    return res.status(500).json({ message: "Failed to generate default avatar" });
  }
});

export default router;

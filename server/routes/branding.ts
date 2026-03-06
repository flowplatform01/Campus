import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { requireAuth, AuthRequest, requireTenantAccess, validateTenantAccess } from "../middleware/auth.js";
import { SchoolBrandingService } from "../services/school-branding-service.js";
import { storeAsset } from "../services/smart-storage.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

function ensureImageMime(mime: string) {
  return mime === "image/png" || mime === "image/jpeg" || mime === "image/webp";
}

// Get school branding information
router.get("/", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId;
    if (!schoolId) {
      return res.status(400).json({ message: "User is not linked to a school" });
    }

    if (!validateTenantAccess(schoolId, req.user!.schoolId!)) {
      return res.status(403).json({ message: "Cross-tenant access denied" });
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
router.patch("/", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const schoolId = user.schoolId ?? null;
    if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });
    if (user.role !== "admin") {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (!validateTenantAccess(schoolId, req.user!.schoolId!)) {
      return res.status(403).json({ message: "Cross-tenant access denied" });
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
router.post("/logo", requireAuth, requireTenantAccess, upload.single("file"), async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const schoolId = user.schoolId ?? null;
    if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });
    if (user.role !== "admin") {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    if (!ensureImageMime(req.file.mimetype)) {
      return res.status(400).json({ message: "Invalid image type" });
    }

    if (!validateTenantAccess(schoolId, req.user!.schoolId!)) {
      return res.status(403).json({ message: "Cross-tenant access denied" });
    }

    const stored = await storeAsset(
      "school_logo",
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname,
      req.user?.id,
      schoolId
    );

    const updatedBranding = await SchoolBrandingService.getSchoolBranding(schoolId);
    const css = updatedBranding ? SchoolBrandingService.getBrandingCSS(updatedBranding) : "";

    return res.json({
      message: "School logo updated successfully",
      storage: stored,
      branding: updatedBranding,
      css,
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

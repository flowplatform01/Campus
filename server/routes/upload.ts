import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { requireAuth, AuthRequest, requireTenantAccess } from "../middleware/auth.js";
import { storeAsset, AssetType } from "../services/smart-storage.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const assetTypeSchema = z.enum([
  "profile_photo",
  "school_logo",
  "assignment_attachment",
  "assignment_submission",
  "resource_file",
  "report_export",
]);

function ensureImageMime(mime: string) {
  return mime === "image/png" || mime === "image/jpeg" || mime === "image/webp";
}

function ensureSafeBackblazeKey(assetType: AssetType, key: string) {
  return typeof key === "string" && key.startsWith(`${assetType}/`);
}

router.post("/", requireAuth, upload.single("file"), async (req: AuthRequest, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  
  const parsed = z
    .object({ assetType: assetTypeSchema.optional() })
    .parse({ assetType: req.body?.assetType });

  const assetType: AssetType = (parsed.assetType ?? "assignment_attachment") as AssetType;

  // Guard: generic endpoint is for backblaze/private assets only
  if (assetType === "profile_photo" || assetType === "school_logo") {
    return res.status(400).json({ message: "Unsupported assetType for this endpoint" });
  }
  
  try {
    const result = await storeAsset(
      assetType as AssetType,
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname,
      req.user?.id,
      req.user?.schoolId || undefined
    );
    
    return res.json(result);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Upload failed" });
  }
});

// Profile photo upload endpoint
router.post("/profile-photo", requireAuth, upload.single("file"), async (req: AuthRequest, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  
  try {
    if (!ensureImageMime(req.file.mimetype)) {
      return res.status(400).json({ message: "Invalid image type" });
    }
    const result = await storeAsset(
      "profile_photo",
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname,
      req.user?.id,
      req.user?.schoolId || undefined
    );
    
    return res.json(result);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Profile photo upload failed" });
  }
});

// School logo upload endpoint
router.post("/school-logo", requireAuth, requireTenantAccess, upload.single("file"), async (req: AuthRequest, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    if (!req.user?.schoolId) {
      return res.status(400).json({ message: "User is not linked to a school" });
    }
    if (!ensureImageMime(req.file.mimetype)) {
      return res.status(400).json({ message: "Invalid image type" });
    }
    const result = await storeAsset(
      "school_logo",
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname,
      req.user?.id,
      req.user?.schoolId || undefined
    );
    
    return res.json(result);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "School logo upload failed" });
  }
});

router.get("/url/:key", requireAuth, requireTenantAccess, async (req, res) => {
  try {
    const query = z
      .object({
        assetType: assetTypeSchema.optional(),
        storageType: z.enum(["neon", "backblaze"]).optional(),
      })
      .parse({ assetType: req.query.assetType, storageType: req.query.storageType });
    const assetType = (query.assetType ?? "assignment_attachment") as AssetType;
    const storageType = query.storageType ?? "backblaze";
    
    if (storageType === "neon") {
      const key = String(req.params.key || "");
      if (!key.startsWith("data:")) {
        return res.status(400).json({ message: "Invalid neon asset key" });
      }
      return res.json({ url: key });
    } else {
      // For backblaze, get signed URL (existing logic)
      if (!ensureSafeBackblazeKey(assetType, String(req.params.key || ""))) {
        return res.status(403).json({ message: "Invalid asset key" });
      }
      const { getSignedDownloadUrl } = await import("../services/storage-b2.js");
      const url = await getSignedDownloadUrl(req.params.key!);
      return res.json({ url });
    }
  } catch (e) {
    return res.status(500).json({ message: "Failed to get URL" });
  }
});

export default router;

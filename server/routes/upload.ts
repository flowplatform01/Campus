import { Router } from "express";
import multer from "multer";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { storeAsset, AssetType } from "../services/smart-storage.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

router.post("/", requireAuth, upload.single("file"), async (req: AuthRequest, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  
  const { assetType = "assignment_attachment" } = req.body;
  
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
router.post("/school-logo", requireAuth, upload.single("file"), async (req: AuthRequest, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  
  try {
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

router.get("/url/:key", requireAuth, async (req, res) => {
  try {
    const { assetType, storageType } = req.query;
    
    if (storageType === "neon") {
      // For neon assets, return the data URL directly
      return res.json({ url: req.params.key });
    } else {
      // For backblaze, get signed URL (existing logic)
      const { getSignedDownloadUrl } = await import("../services/storage-b2.js");
      const url = await getSignedDownloadUrl(req.params.key!);
      return res.json({ url });
    }
  } catch (e) {
    return res.status(500).json({ message: "Failed to get URL" });
  }
});

export default router;

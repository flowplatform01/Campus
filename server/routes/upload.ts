import { Router } from "express";
import multer from "multer";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { uploadToB2, generateKey, getSignedDownloadUrl } from "../services/storage-b2.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

router.post("/", requireAuth, upload.single("file"), async (req: AuthRequest, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  try {
    const ext = req.file.originalname.split(".").pop() || "bin";
    const key = generateKey("uploads", `.${ext}`);
    await uploadToB2(req.file.buffer, key, req.file.mimetype);
    const url = await getSignedDownloadUrl(key);
    return res.json({ key, url, expiresIn: 3600 });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Upload failed" });
  }
});

router.get("/url/:key", requireAuth, async (req, res) => {
  try {
    const url = await getSignedDownloadUrl(req.params.key);
    return res.json({ url });
  } catch (e) {
    return res.status(500).json({ message: "Failed to get URL" });
  }
});

export default router;

import { config } from "../config.js";
import { uploadToB2, generateKey, getSignedDownloadUrl, deleteFromB2 } from "./storage-b2.js";
import { db } from "../db.js";
import { schools, users } from "@shared/schema";
import { eq } from "drizzle-orm";

export type AssetType = 
  | "profile_photo" 
  | "school_logo" 
  | "assignment_attachment" 
  | "assignment_submission" 
  | "resource_file" 
  | "enrollment_document"
  | "social_post_media"
  | "report_export";

export interface StorageResult {
  key?: string;
  url?: string;
  neonId?: string;
  type: "neon" | "backblaze";
  expiresIn?: number;
}

/**
 * Smart storage decision engine
 * Public assets → Neon (database)
 * Private/large files → Backblaze
 */
function getStorageType(assetType: AssetType): "neon" | "backblaze" {
  switch (assetType) {
    case "profile_photo":
    case "school_logo":
      return "neon";
    
    case "assignment_attachment":
    case "assignment_submission": 
    case "resource_file":
    case "enrollment_document":
    case "social_post_media":
    case "report_export":
      return "backblaze";
      
    default:
      return "backblaze";
  }
}

/**
 * Store file in appropriate storage system
 */
export async function storeAsset(
  assetType: AssetType,
  buffer: Buffer,
  mimeType: string,
  originalName: string,
  ownerId?: string,
  schoolId?: string
): Promise<StorageResult> {
  const storageType = getStorageType(assetType);
  
  if (storageType === "neon") {
    return storeInNeon(assetType, buffer, mimeType, ownerId, schoolId);
  } else {
    return storeInBackblaze(assetType, buffer, mimeType, originalName);
  }
}

/**
 * Store public assets in Neon database
 */
async function storeInNeon(
  assetType: AssetType,
  buffer: Buffer,
  mimeType: string,
  ownerId?: string,
  schoolId?: string
): Promise<StorageResult> {
  try {
    // Convert buffer to base64 for storage
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;
    
    // Store in appropriate table based on asset type
    if (assetType === "profile_photo" && ownerId) {
      await db.update(users)
        .set({ 
          avatarUrl: dataUrl,
          updatedAt: new Date()
        })
        .where(eq(users.id, ownerId));
    } else if (assetType === "school_logo" && schoolId) {
      await db.update(schools)
        .set({ 
          logoUrl: dataUrl,
          updatedAt: new Date()
        })
        .where(eq(schools.id, schoolId));
    }
    
    return {
      neonId: ownerId || schoolId || undefined,
      url: dataUrl,
      type: "neon"
    };
  } catch (error) {
    console.error("Neon storage failed:", error);
    throw error;
  }
}

/**
 * Store private files in Backblaze
 */
async function storeInBackblaze(
  assetType: AssetType,
  buffer: Buffer,
  mimeType: string,
  originalName: string
): Promise<StorageResult> {
  try {
    const ext = originalName.split(".").pop() || "bin";
    const key = generateKey(assetType, `.${ext}`);
    
    await uploadToB2(buffer, key, mimeType);
    const url = await getSignedDownloadUrl(key);
    
    return {
      key,
      url,
      type: "backblaze",
      expiresIn: 3600 // 1 hour
    };
  } catch (error) {
    console.error("Backblaze storage failed:", error);
    throw error;
  }
}

/**
 * Retrieve asset URL with proper access method
 */
export async function getAssetUrl(
  assetType: AssetType,
  identifier: string,
  storageType: "neon" | "backblaze"
): Promise<string | null> {
  try {
    if (storageType === "neon") {
      // For neon, we'd query the database
      if (assetType === "school_logo") {
        const [school] = await db.select().from(schools).where(eq(schools.id, identifier)).limit(1);
        return school?.logoUrl || null;
      } else if (assetType === "profile_photo") {
        const [user] = await db.select().from(users).where(eq(users.id, identifier)).limit(1);
        return user?.avatarUrl || null;
      }
      return null;
    } else {
      // For backblaze, get signed URL
      return await getSignedDownloadUrl(identifier);
    }
  } catch (error) {
    console.error("Failed to get asset URL:", error);
    return null;
  }
}

/**
 * Delete asset from appropriate storage
 */
export async function deleteAsset(
  assetType: AssetType,
  identifier: string,
  storageType: "neon" | "backblaze"
): Promise<boolean> {
  try {
    if (storageType === "neon") {
      // Clear neon reference
      if (assetType === "profile_photo") {
        await db.update(users)
          .set({ 
            avatarUrl: null,
            updatedAt: new Date()
          })
          .where(eq(users.id, identifier));
      } else if (assetType === "school_logo") {
        await db.update(schools)
          .set({ 
            logoUrl: null,
            updatedAt: new Date()
          })
          .where(eq(schools.id, identifier));
      }
      return true;
    } else {
      await deleteFromB2(identifier);
      return true;
    }
  } catch (error) {
    console.error("Failed to delete asset:", error);
    return false;
  }
}

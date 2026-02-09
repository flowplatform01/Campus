import { config as loadEnv } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load server/.env (or root .env as fallback)
loadEnv({ path: path.resolve(__dirname, ".env") });
loadEnv(); // Also load root .env

export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  jwt: {
    secret: process.env.JWT_SECRET || "change-me-in-production",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "change-me-in-production",
    accessExpiry: "15m",
    refreshExpiry: "7d",
  },
  smtp: {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || "Campus <noreply@campus.com>",
  },
  b2: {
    keyId: process.env.BLACKBLAZE_KEY_ID,
    appKey: process.env.BLACKBLAZE_APPLICATION_KEY,
    bucket: process.env.BLACKBLAZE_BUCKET_NAME,
    endpoint: process.env.BLACKBLAZE_ENDPOINT,
    region: process.env.BLACKBLAZE_REGION || "auto",
  },
} as const;

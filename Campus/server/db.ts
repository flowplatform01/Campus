import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set!");
}

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });

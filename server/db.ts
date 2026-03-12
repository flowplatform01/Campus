import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "@shared/schema";

// Lazy database connection - only connects when actually used
let _db: ReturnType<typeof drizzle> | null = null;

function getDatabase() {
  if (!process.env.DATABASE_URL) {
    console.error("⚠️  WARNING: DATABASE_URL is not set!");
    console.error("⚠️  Database operations will fail");
    return null;
  }
  
  if (!_db) {
    const sql = neon(process.env.DATABASE_URL);
    _db = drizzle(sql, { schema });
  }
  
  return _db;
}

// Export a proxy that initializes database on first access
export const db = new Proxy({} as any, {
  get(target, prop) {
    const database = getDatabase();
    if (!database) {
      throw new Error("Database not available - DATABASE_URL not set");
    }
    return Reflect.get(database, prop);
  }
});

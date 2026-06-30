import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function createDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return null;
  }

  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}

let db: ReturnType<typeof createDb> | undefined;

export function getDb() {
  if (db === undefined) {
    db = createDb();
  }

  return db;
}

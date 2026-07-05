import pg from "pg";
import { config } from "shared";
// Single pool; parameterised queries everywhere (anti SQL-injection).
export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  ssl: config.nodeEnv === "production" ? { rejectUnauthorized: true } : undefined,
  max: 5,
});
export const q = (text: string, params?: unknown[]) => pool.query(text, params);

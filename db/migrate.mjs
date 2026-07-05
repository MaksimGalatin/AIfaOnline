// Minimal migration runner: applies db/migrations/*.sql in order, once each.
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const __dir = dirname(fileURLToPath(import.meta.url));
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL missing"); process.exit(1); }

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
await client.query(`CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT now())`);
const dir = join(__dir, "migrations");
const files = (await readdir(dir)).filter(f => f.endsWith(".sql")).sort();
for (const f of files) {
  const done = await client.query("SELECT 1 FROM _migrations WHERE name=$1", [f]);
  if (done.rowCount) { console.log("skip", f); continue; }
  const sql = await readFile(join(dir, f), "utf8");
  console.log("apply", f);
  await client.query("BEGIN");
  try { await client.query(sql); await client.query("INSERT INTO _migrations(name) VALUES($1)", [f]); await client.query("COMMIT"); }
  catch (e) { await client.query("ROLLBACK"); console.error("FAILED", f, e); process.exit(1); }
}
await client.end();
console.log("migrations done");

import fs from "node:fs";
import postgres from "postgres";

const configuredUrl = process.env.SUPABASE_DB_URL;
if (!configuredUrl) throw new Error("SUPABASE_DB_URL is missing");
const parsedUrl = new URL(configuredUrl);
if (parsedUrl.username.startsWith("postgres.postgres.")) {
  parsedUrl.username = parsedUrl.username.replace(/^postgres\.postgres\./, "postgres.");
  console.log("Normalized duplicated postgres prefix in pooler username.");
}
const sql = postgres(parsedUrl.toString(), { ssl: "require", max: 1, connect_timeout: 15 });
try {
  const migration = fs.readFileSync("supabase/migrations/20260921190000_mana_mart.sql", "utf8");
  await sql.unsafe(migration);
  const [result] = await sql`select count(*)::int as count from public.products where active=true`;
  console.log(`Supabase migration complete. Active sample products: ${result.count}`);
} finally {
  await sql.end();
}

// One-off migration: adds KYC columns to User table via direct Neon connection
import { readFileSync } from "fs";
import pg from "pg";

// Load .env.local manually
const env = readFileSync(".env.local", "utf-8");
let dbUrl = "";
for (const line of env.split("\n")) {
  const m = line.match(/^DATABASE_URL=(.+)$/);
  if (m) { dbUrl = m[1].trim().replace(/^["']|["']$/g, ""); break; }
}

if (!dbUrl) { console.error("DATABASE_URL not found in .env.local"); process.exit(1); }

// Strip -pooler from hostname so DDL works on Neon direct connection
const directUrl = dbUrl.replace(/-pooler(\.[^.]+\.aws\.neon\.tech)/, "$1");
console.log("Using direct connection (pooler stripped):", directUrl.replace(/:\/\/[^@]+@/, "://***@"));

const isLocal = directUrl.includes("localhost") || directUrl.includes("127.0.0.1");
const client = new pg.Client({ connectionString: directUrl, ssl: isLocal ? false : { rejectUnauthorized: false } });
await client.connect();

const sql = `
  ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "selfieUrl" TEXT;
  ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "idPhotoUrl" TEXT;
  ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "idVerificationStatus" TEXT NOT NULL DEFAULT 'unverified';
`;

await client.query(sql);

// Verify
const { rows } = await client.query(`
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'User' AND column_name IN ('selfieUrl','idPhotoUrl','idVerificationStatus')
`);
console.log("Columns confirmed in DB:", rows.map(r => r.column_name));
await client.end();

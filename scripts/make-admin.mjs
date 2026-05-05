import { readFileSync } from "fs";
import pg from "pg";

const email = process.argv[2];
if (!email) { console.error("Usage: node scripts/make-admin.mjs <email>"); process.exit(1); }

const env = readFileSync(".env.local", "utf-8");
let dbUrl = "";
for (const line of env.split("\n")) {
  const m = line.match(/^DATABASE_URL=(.+)$/);
  if (m) { dbUrl = m[1].trim().replace(/^["']|["']$/g, ""); break; }
}

const isLocal = dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1");
const client = new pg.Client({ connectionString: dbUrl, ssl: isLocal ? false : { rejectUnauthorized: false } });
await client.connect();

const { rows } = await client.query(`UPDATE "User" SET role = 'ADMIN' WHERE email = $1 RETURNING id, name, email, role`, [email]);
if (rows.length === 0) console.error("No user found with that email.");
else console.log("✓ Promoted:", rows[0]);
await client.end();

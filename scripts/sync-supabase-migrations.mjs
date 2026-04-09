/**
 * Copies SQL from database/migrations into supabase/migrations for Supabase CLI.
 * Cursor may fail to open files under supabase/migrations/; edit sources in database/migrations instead.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const srcDir = path.join(root, "database", "migrations");
const dstDir = path.join(root, "supabase", "migrations");

fs.mkdirSync(dstDir, { recursive: true });
const files = fs.readdirSync(srcDir).filter((f) => f.endsWith(".sql"));
if (files.length === 0) {
  console.warn("No .sql files in database/migrations");
  process.exit(0);
}
for (const f of files) {
  fs.copyFileSync(path.join(srcDir, f), path.join(dstDir, f));
  console.log("Copied", f);
}

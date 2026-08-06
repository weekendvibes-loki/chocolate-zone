// Secrets guard — docs/SUPABASE.md §8 hardening.
// Fails the build if a service-role key ever risks being bundled client-side,
// which is what a NEXT_PUBLIC_ prefix would cause. Run via `pnpm lint:secrets`.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const scanDirs = ["src"];
const fileRe = /\.(ts|tsx|js|mjs|cjs)$/;
const forbidden = /NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY/;

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full);
      continue;
    }
    if (!fileRe.test(entry)) continue;
    const content = readFileSync(full, "utf8");
    if (forbidden.test(content)) {
      console.error(`[lint:secrets] forbidden literal in ${full}`);
      process.exitCode = 1;
    }
  }
}

for (const dir of scanDirs) walk(join(root, dir));
if (!process.exitCode) console.log("[lint:secrets] OK — no NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY usage.");

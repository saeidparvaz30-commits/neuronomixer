/**
 * F5: strip the " — NeuroNomixer" / " | NeuroNomixer" suffix from TOP-LEVEL
 * metadata `title:` fields only. openGraph/twitter titles are left alone.
 * Heuristic: a title line is "nested" if an unclosed `openGraph: {` or
 * `twitter: {` block is open at that point in the file.
 */
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";

// glob is not a dependency; walk src/app recursively for page.tsx files.
function collectPageFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectPageFiles(full));
    } else if (entry.isFile() && entry.name === "page.tsx") {
      out.push(full);
    }
  }
  return out;
}

const files = collectPageFiles("src/app");
const TITLE_RE = /^(\s*title:\s*")(.*?)(\s*(?:—|\|)\s*NeuroNomixer)(",?)\s*$/;

let changed = 0;
for (const file of files) {
  if (file.replace(/\\/g, "/") === "src/app/(en)/page.tsx") continue; // handled manually (absolute)
  const lines = readFileSync(file, "utf8").split("\n");
  let depthSinceNested = 0;
  let inNested = false;
  let fileChanged = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!inNested && /^\s*(openGraph|twitter):\s*{/.test(line)) {
      inNested = true;
      depthSinceNested = 0;
    }
    if (inNested) {
      depthSinceNested += (line.match(/{/g) || []).length;
      depthSinceNested -= (line.match(/}/g) || []).length;
      if (depthSinceNested <= 0) inNested = false;
      continue;
    }
    const m = line.match(TITLE_RE);
    if (m) {
      lines[i] = `${m[1]}${m[2]}${m[4]}`;
      fileChanged = true;
    }
  }
  if (fileChanged) {
    writeFileSync(file, lines.join("\n"));
    changed++;
  }
}
console.log(`updated ${changed} files`);

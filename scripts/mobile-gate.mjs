// SPEC v3 §15 mobile gate: asserts guide pages are usable at 360px client width.
// Decorative icons (svg[aria-hidden="true"]) are exempt from the tiny-text
// assertion: per SPEC 15.3 it applies to informative text only.
// Usage: node scripts/mobile-gate.mjs [slug ...]        (no args = all built guides)
//        node scripts/mobile-gate.mjs --list-only       (print slugs and exit)
// Requires a dev server on localhost:3000 (npx next dev). Uses puppeteer-core +
// system Chrome (no new dependencies).
import puppeteer from "puppeteer-core";
import { readdirSync, existsSync } from "node:fs";
import path from "node:path";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = process.env.GATE_BASE_URL ?? "http://localhost:3000";

function allSlugs() {
  const dir = path.join(process.cwd(), "src", "app", "(en)", "visual-guides");
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(path.join(dir, e.name, "page.tsx")))
    .map((e) => e.name)
    .sort();
}

const args = process.argv.slice(2);
const slugs = args.filter((a) => !a.startsWith("--"));
const targets = slugs.length ? slugs : allSlugs();
if (args.includes("--list-only")) {
  console.log(targets.join("\n"));
  process.exit(0);
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 360, height: 800 });

const failures = [];
for (const slug of targets) {
  try {
    await page.goto(`${BASE}/visual-guides/${slug}`, { waitUntil: "networkidle2", timeout: 60000 });
    // let client hydration + first paint settle
    await new Promise((r) => setTimeout(r, 700));
    const r = await page.evaluate(() => {
      const doc = document.documentElement;
      const overflow = doc.scrollWidth - doc.clientWidth;
      const tinyTexts = [...document.querySelectorAll("svg text")]
        .filter((t) => !t.closest('svg[aria-hidden="true"]'))
        .map((t) => t.getBoundingClientRect().height)
        .filter((h) => h > 0 && h < 9);
      const thinSliders = [...document.querySelectorAll('input[type="range"]')]
        .map((s) => s.getBoundingClientRect().height)
        .filter((h) => h > 0 && h < 20);
      return {
        overflow,
        tinyTextCount: tinyTexts.length,
        minTextH: tinyTexts.length ? Math.min(...tinyTexts.map((h) => Math.round(h * 10) / 10)) : null,
        thinSliderCount: thinSliders.length,
      };
    });
    const bad = r.overflow > 5 || r.tinyTextCount > 0 || r.thinSliderCount > 0;
    if (bad) failures.push({ slug, ...r });
    process.stdout.write(`${bad ? "FAIL" : "ok  "} ${slug}  ovf=${r.overflow} tiny=${r.tinyTextCount} thin=${r.thinSliderCount}\n`);
  } catch (err) {
    failures.push({ slug, error: String(err).slice(0, 120) });
    process.stdout.write(`ERR  ${slug}  ${String(err).slice(0, 80)}\n`);
  }
}
await browser.close();

console.log(`\n${targets.length - failures.length}/${targets.length} passed`);
if (failures.length) {
  console.log(JSON.stringify(failures, null, 2));
  process.exit(1);
}

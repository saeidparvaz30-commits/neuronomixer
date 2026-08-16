/**
 * Route smoke for the (en) route-group move (phase 01). Record a baseline from the
 * tree before the move, then verify the identical URL set after it. A diff of the
 * recorded fields is the "rendering behavior unchanged" half of ROUTE-02; the
 * app-path-routes-manifest diff is the URL half.
 *
 * Requires a running server on GATE_BASE_URL (default http://localhost:3000):
 *   npx next start          (production mode — what the phase gates against)
 *   npx next dev            (also fine; keep both runs on the same server mode)
 *
 * Run: node scripts/checks/route-smoke.mjs --record
 *      node scripts/checks/route-smoke.mjs --verify
 *
 * No new dependencies: Node 20+ global fetch, node:assert, node:fs.
 */
import assert from "node:assert";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const BASE = process.env.GATE_BASE_URL ?? "http://localhost:3000";
const BASELINE_PATH =
  ".planning/phases/01-route-groups/artifacts/route-smoke.baseline.json";

const FIXED_ROUTES = [
  "/",
  "/blog",
  "/visual-guides",
  "/authors",
  "/contact",
  "/privacy",
  "/review",
  "/auth/sign-in",
  "/dashboard",
  "/dashboard/admin/api-key",
  "/dashboard/admin/suggest-category",
  "/studio",
  "/sitemap.xml",
  "/robots.txt",
  "/icon.svg",
  "/cv/__smoke-check",
  "/share/__smoke-check",
  "/__unmatched-url-smoke-check",
];

const HTML_TAG_RE = /<html[^>]*>/;

async function probe(url) {
  const res = await fetch(BASE + url, { redirect: "follow" });
  const body = await res.text();
  const htmlTag = HTML_TAG_RE.exec(body)?.[0] ?? null;
  return {
    url,
    status: res.status,
    redirected: res.redirected,
    finalPath: new URL(res.url).pathname,
    contentType: res.headers.get("content-type"),
    htmlTag,
    hasNav: body.includes("<nav"),
    hasFooter: body.includes("<footer"),
    hasBrandedNotFound: body.includes("Page not found"),
  };
}

function collectHrefs(html, re) {
  const seen = [];
  for (const m of html.matchAll(re)) {
    if (!seen.includes(m[1])) seen.push(m[1]);
  }
  return seen;
}

async function discoverRoutes() {
  const blogHtml = await (await fetch(BASE + "/blog")).text();
  const blogHrefs = collectHrefs(blogHtml, /href="(\/blog\/[^"?#]+)"/g);
  const post = blogHrefs.find((h) => h.slice("/blog/".length).split("/").length === 2);
  if (!post) {
    console.error(
      `route-smoke: discovery failed on /blog — no two-segment post href found among ${blogHrefs.length} hrefs`,
    );
    process.exit(1);
  }
  // The blog index links posts only, never category pages, so derive the category
  // from the post's own first segment rather than hunting for a one-segment href.
  const category =
    blogHrefs.find((h) => h.slice("/blog/".length).split("/").length === 1) ??
    "/blog/" + post.slice("/blog/".length).split("/")[0];

  // The /visual-guides index builds its catalog client-side, so the served HTML
  // carries no guide links. The sitemap is server-rendered and lists every
  // published guide, which makes it the only fetch-based source that works here.
  const sitemapXml = await (await fetch(BASE + "/sitemap.xml")).text();
  const guideHrefs = collectHrefs(sitemapXml, /<loc>[^<]*(\/visual-guides\/[^<]+)<\/loc>/g);
  const step = Math.max(1, Math.floor(guideHrefs.length / 7));
  const guides = [];
  for (let i = 0; i < guideHrefs.length && guides.length < 8; i += step) {
    guides.push(guideHrefs[i]);
  }
  if (guides.length < 5) {
    console.error(
      `route-smoke: discovery failed on /sitemap.xml — only ${guides.length} guide URLs collected from ${guideHrefs.length} sitemap entries; expected at least 5`,
    );
    process.exit(1);
  }

  return [...FIXED_ROUTES, category, post, ...guides];
}

function pick(results, url) {
  const r = results.find((x) => x.url === url);
  assert.ok(r, `route-smoke: expected ${url} in the probed set`);
  return r;
}

function assertAbsolutes(results) {
  const notFound = pick(results, "/__unmatched-url-smoke-check");
  assert.strictEqual(
    notFound.status,
    404,
    `unmatched URL must return 404, got ${notFound.status}`,
  );
  assert.strictEqual(
    notFound.hasBrandedNotFound,
    true,
    "unmatched URL must render the branded 404 body marker 'Page not found'",
  );
  assert.ok(
    notFound.htmlTag && notFound.htmlTag.includes('lang="en"'),
    `unmatched URL <html> must carry lang="en", got ${notFound.htmlTag}`,
  );
  assert.ok(
    notFound.htmlTag && !notFound.htmlTag.includes("dir="),
    `unmatched URL <html> must carry no dir attribute, got ${notFound.htmlTag}`,
  );

  const cv = pick(results, "/cv/__smoke-check");
  assert.strictEqual(
    cv.hasNav,
    false,
    "a /cv/ URL must render bare chrome (no <nav>) — the ConditionalChrome special case",
  );

  const home = pick(results, "/");
  assert.strictEqual(
    home.htmlTag,
    '<html lang="en">',
    `home <html> tag must be exactly '<html lang="en">', got ${home.htmlTag}`,
  );
}

const args = process.argv.slice(2);

if (args.includes("--record")) {
  const routes = await discoverRoutes();
  const results = [];
  for (const url of routes) {
    results.push(await probe(url));
  }
  assertAbsolutes(results);
  mkdirSync(path.dirname(BASELINE_PATH), { recursive: true });
  writeFileSync(
    BASELINE_PATH,
    JSON.stringify({ recordedAt: new Date().toISOString(), base: BASE, routes: results }, null, 2) + "\n",
  );
  console.log(`route-smoke: RECORDED ${results.length} routes`);
} else if (args.includes("--verify")) {
  const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
  const failures = [];
  const results = [];
  for (const recorded of baseline.routes) {
    const actual = await probe(recorded.url);
    results.push(actual);
    const deltas = {};
    for (const key of Object.keys(recorded)) {
      if (key === "url") continue;
      if (JSON.stringify(actual[key]) !== JSON.stringify(recorded[key])) {
        deltas[key] = { expected: recorded[key], actual: actual[key] };
      }
    }
    const bad = Object.keys(deltas).length > 0;
    if (bad) failures.push({ url: recorded.url, deltas });
    process.stdout.write(`${bad ? "FAIL" : "ok  "} ${recorded.url}\n`);
  }
  assertAbsolutes(results);
  console.log(`\n${baseline.routes.length - failures.length}/${baseline.routes.length} passed`);
  if (failures.length) {
    console.log(JSON.stringify(failures, null, 2));
    process.exit(1);
  }
  console.log("route-smoke.mjs: ALL PASS");
} else {
  console.log("Usage: node scripts/checks/route-smoke.mjs --record");
  console.log("       node scripts/checks/route-smoke.mjs --verify");
  console.log(`Requires a server on ${BASE} (override with GATE_BASE_URL).`);
  process.exit(1);
}

// One-off diagnostic: for each slug, list SVGs containing sub-9px text with
// their viewBox, rendered width, and the distinct font sizes of tiny texts.
import puppeteer from "puppeteer-core";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = process.env.GATE_BASE_URL ?? "http://localhost:3001";
const slugs = process.argv.slice(2);

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 360, height: 800 });

for (const slug of slugs) {
  await page.goto(`${BASE}/visual-guides/${slug}`, { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 700));
  const rows = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll("svg").forEach((svg) => {
      const tiny = [...svg.querySelectorAll("text")].filter((t) => {
        const h = t.getBoundingClientRect().height;
        return h > 0 && h < 9;
      });
      if (!tiny.length) return;
      const fonts = [...new Set(tiny.map((t) => t.getAttribute("font-size") || t.getAttribute("fontSize") || getComputedStyle(t).fontSize))];
      out.push({
        viewBox: svg.getAttribute("viewBox"),
        renderedW: Math.round(svg.getBoundingClientRect().width),
        tinyCount: tiny.length,
        fonts,
        sampleText: tiny[0].textContent?.slice(0, 30),
      });
    });
    return out;
  });
  console.log(`\n== ${slug}`);
  console.log(JSON.stringify(rows, null, 1));
}
await browser.close();

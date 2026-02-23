#!/usr/bin/env node

import { parse } from "node-html-parser";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, extname, resolve } from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const DIST = join(ROOT, "dist");

// ---------------------------------------------------------------------------
// CLI flags
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const skipBuild = args.includes("--skip-build");
const checkExternal = args.includes("--check-external");

// ---------------------------------------------------------------------------
// Report accumulator
// ---------------------------------------------------------------------------
const results = new Map(); // key → section name, value → { errors: [], warnings: [], passes: [] }

function section(name) {
  if (!results.has(name))
    results.set(name, { errors: [], warnings: [], passes: [] });
  return results.get(name);
}

function error(sec, msg) {
  section(sec).errors.push(msg);
}
function warn(sec, msg) {
  section(sec).warnings.push(msg);
}
function pass(sec, msg) {
  section(sec).passes.push(msg);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function readText(path) {
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return null;
  }
}

function walkFiles(dir, ext) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full, ext));
    else if (!ext || extname(entry.name) === ext) out.push(full);
  }
  return out;
}

function fileSize(path) {
  try {
    return statSync(path).size;
  } catch {
    return 0;
  }
}

function fmtSize(bytes) {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)}MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${bytes}B`;
}

function pagePath(htmlFile) {
  const rel = relative(DIST, htmlFile);
  if (rel === "index.html") return "/";
  if (rel.endsWith("/index.html"))
    return "/" + rel.replace(/\/index\.html$/, "");
  return "/" + rel;
}

// ---------------------------------------------------------------------------
// Step 1: Build (unless --skip-build)
// ---------------------------------------------------------------------------
if (!skipBuild) {
  console.log("Building site...\n");
  try {
    execSync("pnpm build", { cwd: ROOT, stdio: "inherit" });
    console.log("");
  } catch {
    console.error("\nBuild failed. Fix build errors and try again.");
    process.exit(2);
  }
}

if (!existsSync(DIST)) {
  console.error(
    `dist/ directory not found. Run "pnpm build" first or omit --skip-build.`,
  );
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Step 2: File & config checks
// ---------------------------------------------------------------------------
const SEC_FILES = "FILES & CONFIG";

// Required files
const requiredFiles = [
  ["favicon.ico", join(DIST, "favicon.ico")],
  ["robots.txt", join(DIST, "robots.txt")],
  ["sitemap-index.xml", join(DIST, "sitemap-index.xml")],
];
for (const [name, path] of requiredFiles) {
  if (existsSync(path)) pass(SEC_FILES, `${name} exists`);
  else error(SEC_FILES, `Missing ${name} in dist`);
}

// Optional files (warn only)
const ogImagePath = join(ROOT, "public/og-image.jpg");
const optionalSrc = [
  ["favicon.svg", join(ROOT, "public/favicon.svg")],
  ["OG image", ogImagePath],
  [".env file", join(ROOT, ".env")],
];
for (const [name, path] of optionalSrc) {
  if (existsSync(path)) pass(SEC_FILES, `${name} exists`);
  else warn(SEC_FILES, `Missing ${name}`);
}

// OG image dimensions (should be 1200×630)
if (existsSync(ogImagePath)) {
  try {
    const sharp = (await import("sharp")).default;
    const metadata = await sharp(ogImagePath).metadata();
    if (metadata.width === 1200 && metadata.height === 630)
      pass(SEC_FILES, `OG image is ${metadata.width}×${metadata.height}`);
    else
      warn(
        SEC_FILES,
        `OG image is ${metadata.width}×${metadata.height} (recommended 1200×630)`,
      );
  } catch {
    /* sharp unavailable or file unreadable */
  }
}

// .env leaked into dist
if (existsSync(join(DIST, ".env")))
  error(SEC_FILES, `.env file leaked into dist/`);

// robots.txt content
const robotsTxt = readText(join(DIST, "robots.txt"));
if (robotsTxt?.includes("example.com"))
  error(SEC_FILES, `robots.txt contains example.com`);

// sitemap content
for (const f of walkFiles(DIST, ".xml")) {
  const content = readText(f);
  if (content?.includes("example.com")) {
    error(SEC_FILES, `Sitemap ${relative(DIST, f)} references example.com`);
    break;
  }
}

// astro.config.mjs
const astroConfig = readText(join(ROOT, "astro.config.mjs"));
if (astroConfig?.includes("example.com"))
  warn(SEC_FILES, `astro.config.mjs still has example.com as site URL`);

// site.ts placeholder detection
const siteTs = readText(join(ROOT, "src/data/site.ts"));
if (siteTs) {
  if (/["']hello@example\.com["']/.test(siteTs))
    error(SEC_FILES, `Contact email still hello@example.com in site.ts`);
  if (/["']https?:\/\/example\.com["']/.test(siteTs))
    error(SEC_FILES, `Site URL still example.com in site.ts`);
  if (/name:\s*["']Site Name["']/.test(siteTs))
    warn(SEC_FILES, `Business name still "Site Name" in site.ts`);
  if (/["']Company Pty Ltd["']/.test(siteTs))
    warn(SEC_FILES, `Legal name still "Company Pty Ltd" in site.ts`);
  if (/["']00 000 000 000["']/.test(siteTs))
    warn(SEC_FILES, `Placeholder ABN "00 000 000 000" in site.ts`);
  if (/["']000 000 000["']/.test(siteTs))
    warn(SEC_FILES, `Placeholder ACN "000 000 000" in site.ts`);
  if (/["']\+61 400 000 000["']/.test(siteTs))
    warn(SEC_FILES, `Placeholder phone "+61 400 000 000" in site.ts`);
  if (/["']123 Example Street["']/.test(siteTs))
    warn(SEC_FILES, `Placeholder address "123 Example Street" in site.ts`);

  // Social media links still "#"
  const socialBlock = siteTs.match(/social:\s*\{([^}]+)\}/s);
  if (socialBlock) {
    const hashCount = (socialBlock[1].match(/["']#["']/g) || []).length;
    if (hashCount > 0)
      warn(
        SEC_FILES,
        `${hashCount} social media link(s) still set to "#" in site.ts`,
      );
    else pass(SEC_FILES, "Social media links configured");
  }
}

// .env placeholder detection
const envFile = readText(join(ROOT, ".env"));
if (envFile) {
  if (/MAIL_FROM_NAME=Site Name/.test(envFile))
    warn(SEC_FILES, `.env MAIL_FROM_NAME still "Site Name"`);

  // Form submissions going to internal agency emails instead of client
  const mailTo = envFile.match(/MAIL_TO_EMAIL=(.+)/)?.[1]?.trim();
  const internalDomains = ["cjco.com.au", "medicalmarketinggroup.com.au"];
  if (mailTo) {
    const domain = mailTo.split("@")[1]?.toLowerCase();
    if (internalDomains.some((d) => domain === d))
      error(
        SEC_FILES,
        `MAIL_TO_EMAIL is ${mailTo} — still set to internal agency address, not client`,
      );
    else pass(SEC_FILES, `MAIL_TO_EMAIL set to ${mailTo}`);
  }
}

// Check all HTML files in dist for lorem ipsum and placeholder nav links
const allHtmlFiles = walkFiles(DIST, ".html");
let loremFound = false;
let placeholderNavFound = false;
for (const f of allHtmlFiles) {
  const content = readText(f);
  if (!content) continue;
  if (!loremFound && /lorem ipsum/i.test(content)) {
    loremFound = true;
    warn(SEC_FILES, `Lorem ipsum content found in dist HTML files`);
  }
  if (!placeholderNavFound && />\s*Link [0-9]+\s*</.test(content)) {
    placeholderNavFound = true;
    warn(SEC_FILES, `Placeholder nav links ("Link 1", "Link 2", etc.) found`);
  }
}

// Em/en dash detection (looks like AI-generated copy)
const SEC_COPY = "COPY QUALITY";
const dashPages = [];
for (const f of allHtmlFiles) {
  const content = readText(f);
  if (!content) continue;
  const doc = parse(content);
  // Remove script/style tags to only check visible copy
  for (const el of doc.querySelectorAll("script, style, code, pre"))
    el.remove();
  const text = doc.textContent ?? "";
  const emDashes = (text.match(/\u2014/g) || []).length;
  const enDashes = (text.match(/\u2013/g) || []).length;
  if (emDashes + enDashes > 0) {
    const pg = pagePath(f);
    const parts = [];
    if (emDashes > 0) parts.push(`${emDashes} em dash(es)`);
    if (enDashes > 0) parts.push(`${enDashes} en dash(es)`);
    dashPages.push(`${pg}: ${parts.join(", ")}`);
  }
}
if (dashPages.length > 0) {
  for (const msg of dashPages)
    warn(SEC_COPY, `${msg} — replace with hyphens or rewrite`);
} else {
  pass(SEC_COPY, "No em/en dashes found in copy");
}

// placehold.co images
for (const f of allHtmlFiles) {
  const content = readText(f);
  if (content?.includes("placehold.co")) {
    error(SEC_FILES, `placehold.co placeholder images still referenced`);
    break;
  }
}

// Analytics & tracking scripts (check homepage output + source config)
const SEC_TRACKING = "ANALYTICS & TRACKING";
const homepageContent = readText(join(DIST, "index.html")) ?? "";
const hasGA4 = /gtag\(|googletagmanager\.com\/gtag|G-[A-Z0-9]+/.test(
  homepageContent,
);
const hasGTM = /googletagmanager\.com\/gtm\.js|GTM-[A-Z0-9]+/.test(
  homepageContent,
);
const hasMeta = /fbq\(|connect\.facebook\.net/.test(homepageContent);

const analyticsFile = readText(join(ROOT, "src/data/analytics.ts")) ?? "";
const cfgGtm = /gtmId:\s*"([^"]*)"/.exec(analyticsFile)?.[1] ?? "";
const cfgGa4 = /ga4Id:\s*"([^"]*)"/.exec(analyticsFile)?.[1] ?? "";
const cfgMeta = /metaPixelId:\s*"([^"]*)"/.exec(analyticsFile)?.[1] ?? "";

if (hasGA4 || hasGTM)
  pass(
    SEC_TRACKING,
    hasGTM
      ? `Google Tag Manager detected (${cfgGtm})`
      : `GA4 detected (${cfgGa4})`,
  );
else warn(SEC_TRACKING, "No GA4 or GTM ID set in src/data/analytics.ts");

if (hasMeta) pass(SEC_TRACKING, `Meta Pixel detected (${cfgMeta})`);
else warn(SEC_TRACKING, "No Meta Pixel ID set in src/data/analytics.ts");

if (cfgGtm && cfgGa4)
  warn(
    SEC_TRACKING,
    "Both gtmId and ga4Id are set — GA4 is ignored when GTM is active",
  );

// ---------------------------------------------------------------------------
// Step 3: Build known internal paths for link checking
// ---------------------------------------------------------------------------
const knownPaths = new Set();
for (const f of allHtmlFiles) {
  const p = pagePath(f);
  knownPaths.add(p);
  knownPaths.add(p + "/");
  if (p !== "/") knownPaths.add(p.replace(/\/$/, ""));
}
// Also add all static files
for (const f of walkFiles(DIST)) {
  knownPaths.add("/" + relative(DIST, f));
}

// ---------------------------------------------------------------------------
// Step 4: Per-page HTML checks
// ---------------------------------------------------------------------------
const externalUrls = new Set();

for (const htmlFile of allHtmlFiles) {
  const pageName = pagePath(htmlFile);
  const sec = pageName === "/" ? "/ (index.html)" : pageName;
  const content = readText(htmlFile);
  if (!content) continue;

  const doc = parse(content);

  // --- SEO ---
  const title = doc.querySelector("title");
  const titleText = title?.textContent?.trim() ?? "";
  if (!titleText) error(sec, "Missing or empty <title>");
  else if (titleText.length > 60)
    warn(sec, `Title is ${titleText.length} chars (recommended ≤60)`);
  else pass(sec, "Has <title> tag");

  const metaDesc = doc.querySelector('meta[name="description"]');
  const descText = metaDesc?.getAttribute("content")?.trim() ?? "";
  if (!descText) error(sec, "Missing or empty meta description");
  else if (descText.length > 160)
    warn(
      sec,
      `Meta description is ${descText.length} chars (recommended ≤160)`,
    );
  else pass(sec, "Has meta description");

  const canonical = doc.querySelector('link[rel="canonical"]');
  if (!canonical) warn(sec, "Missing canonical link");
  else if (canonical.getAttribute("href")?.includes("example.com"))
    error(sec, "Canonical URL contains example.com");
  else pass(sec, "Has canonical link");

  const ogTitle = doc.querySelector('meta[property="og:title"]');
  const ogDesc = doc.querySelector('meta[property="og:description"]');
  const ogImage = doc.querySelector('meta[property="og:image"]');
  const ogUrl = doc.querySelector('meta[property="og:url"]');
  if (!ogTitle) warn(sec, "Missing og:title");
  if (!ogDesc) warn(sec, "Missing og:description");
  if (!ogImage) warn(sec, "Missing og:image");
  if (ogUrl?.getAttribute("content")?.includes("example.com"))
    error(sec, "og:url contains example.com");

  const twitterCard = doc.querySelector('meta[name="twitter:card"]');
  if (!twitterCard) warn(sec, "Missing twitter:card meta");

  // Heading structure
  const h1s = doc.querySelectorAll("h1");
  if (h1s.length === 0) warn(sec, "Missing <h1> tag");
  else if (h1s.length > 1) warn(sec, `Multiple <h1> tags (${h1s.length})`);
  else pass(sec, "Has <h1> tag");

  // Check heading level skips (h1→h3 without h2, etc.)
  const headings = doc.querySelectorAll("h1, h2, h3, h4, h5, h6");
  let prevLevel = 0;
  for (const h of headings) {
    const level = parseInt(h.tagName.charAt(1));
    if (prevLevel > 0 && level > prevLevel + 1) {
      warn(sec, `Skipped heading level: <h${prevLevel}> → <h${level}>`);
      break;
    }
    prevLevel = level;
  }

  // --- Images ---
  const images = doc.querySelectorAll("img");
  let missingAlt = 0;
  let missingDimensions = 0;
  for (const img of images) {
    const alt = img.getAttribute("alt");
    if (alt === null || alt === undefined) missingAlt++;
    if (
      !img.getAttribute("width") &&
      !img.getAttribute("style")?.includes("width")
    )
      if (
        !img.getAttribute("height") &&
        !img.getAttribute("style")?.includes("height")
      )
        missingDimensions++;
  }
  if (missingAlt > 0) warn(sec, `${missingAlt} image(s) missing alt attribute`);
  if (missingDimensions > 0)
    warn(sec, `${missingDimensions} image(s) missing width/height attributes`);

  // --- Links ---
  const links = doc.querySelectorAll("a[href]");
  let hashLinks = 0;
  let emptyHrefs = 0;
  let jsHrefs = 0;
  let brokenInternal = [];
  let missingRel = 0;
  for (const a of links) {
    const href = a.getAttribute("href") ?? "";
    if (href === "#") {
      hashLinks++;
      continue;
    }
    if (href === "") {
      emptyHrefs++;
      continue;
    }
    if (href.startsWith("javascript:")) {
      jsHrefs++;
      continue;
    }
    if (href.startsWith("mailto:") || href.startsWith("tel:")) continue;

    if (href.startsWith("http://") || href.startsWith("https://")) {
      // External link
      const rel = a.getAttribute("rel") ?? "";
      if (!rel.includes("noopener") || !rel.includes("noreferrer"))
        missingRel++;
      if (checkExternal) externalUrls.add(href);
    } else if (href.startsWith("/") || !href.includes("://")) {
      // Internal link — check if target exists
      const cleanHref = href.split("#")[0].split("?")[0];
      if (
        cleanHref &&
        !knownPaths.has(cleanHref) &&
        !knownPaths.has(cleanHref + "/")
      ) {
        brokenInternal.push(cleanHref);
      }
    }
  }
  if (jsHrefs > 0) error(sec, `${jsHrefs} link(s) with javascript: href`);
  if (brokenInternal.length > 0) {
    const unique = [...new Set(brokenInternal)];
    error(
      sec,
      `${unique.length} broken internal link(s): ${unique.join(", ")}`,
    );
  }
  if (hashLinks > 0) warn(sec, `${hashLinks} link(s) point to "#"`);
  if (emptyHrefs > 0) warn(sec, `${emptyHrefs} link(s) with empty href`);
  if (missingRel > 0)
    warn(
      sec,
      `${missingRel} external link(s) missing rel="noopener noreferrer"`,
    );

  // --- Accessibility ---
  const htmlTag = doc.querySelector("html");
  if (!htmlTag?.getAttribute("lang"))
    error(sec, `Missing lang attribute on <html>`);
  else pass(sec, "Has lang attribute");

  const skipLink = doc.querySelector(
    'a[href="#main"], a[href="#content"], a[href="#main-content"]',
  );
  if (!skipLink) {
    const allAnchors = doc.querySelectorAll("a");
    const hasSkip = allAnchors.some((a) =>
      /skip.*(content|main|nav)/i.test(a.textContent),
    );
    if (!hasSkip) warn(sec, "Missing skip-to-content link");
    else pass(sec, "Has skip-to-content link");
  } else {
    pass(sec, "Has skip-to-content link");
  }

  // Empty buttons/links without aria-label
  const interactives = doc.querySelectorAll("button, a");
  let emptyInteractive = 0;
  for (const el of interactives) {
    const text = el.textContent?.trim() ?? "";
    const ariaLabel = el.getAttribute("aria-label") ?? "";
    const ariaLabelledBy = el.getAttribute("aria-labelledby") ?? "";
    const title = el.getAttribute("title") ?? "";
    const hasImg = el.querySelector("img[alt]");
    const hasSvgTitle = el.querySelector("svg title");
    if (
      !text &&
      !ariaLabel &&
      !ariaLabelledBy &&
      !title &&
      !hasImg &&
      !hasSvgTitle
    ) {
      emptyInteractive++;
    }
  }
  if (emptyInteractive > 0)
    warn(sec, `${emptyInteractive} empty button(s)/link(s) without aria-label`);

  // Form inputs without labels
  const inputs = doc.querySelectorAll("input, textarea, select");
  let unlabelled = 0;
  for (const input of inputs) {
    const type = input.getAttribute("type") ?? "";
    if (type === "hidden" || type === "submit" || type === "button") continue;
    const id = input.getAttribute("id");
    const ariaLabel = input.getAttribute("aria-label") ?? "";
    const ariaLabelledBy = input.getAttribute("aria-labelledby") ?? "";
    const placeholder = input.getAttribute("placeholder") ?? "";
    const hasLabel = id && doc.querySelector(`label[for="${id}"]`);
    if (!hasLabel && !ariaLabel && !ariaLabelledBy && !placeholder)
      unlabelled++;
  }
  if (unlabelled > 0) warn(sec, `${unlabelled} form input(s) without labels`);

  // Viewport meta
  const viewport = doc.querySelector('meta[name="viewport"]');
  if (!viewport) warn(sec, "Missing viewport meta tag");

  // --- Performance (homepage only) ---
  if (pageName === "/") {
    const heroImgs = doc.querySelectorAll("img");
    const firstImg = heroImgs[0];
    if (firstImg) {
      const loading = firstImg.getAttribute("loading") ?? "";
      const fetchpriority = firstImg.getAttribute("fetchpriority") ?? "";
      if (loading !== "eager" && fetchpriority !== "high") {
        warn(
          sec,
          `First image missing loading="eager" or fetchpriority="high"`,
        );
      }
    }

    // Font preconnect
    const preconnects = doc.querySelectorAll('link[rel="preconnect"]');
    if (preconnects.length === 0) warn(sec, "No font preconnect hints found");
  }
}

// ---------------------------------------------------------------------------
// Step 5: Image file checks in dist
// ---------------------------------------------------------------------------
const SEC_IMAGES = "IMAGE FILES";
const astroAssets = join(DIST, "_astro");
const allDistImages = walkFiles(DIST).filter((f) =>
  /\.(jpg|jpeg|png|gif|webp|avif|svg|ico)$/i.test(f),
);

let largeImages = 0;
for (const img of allDistImages) {
  const size = fileSize(img);
  if (size > 512_000) {
    warn(SEC_IMAGES, `${relative(DIST, img)} is ${fmtSize(size)} (>500KB)`);
    largeImages++;
  }
}
if (largeImages === 0) pass(SEC_IMAGES, "All images under 500KB");

// Non-WebP/AVIF in _astro/
if (existsSync(astroAssets)) {
  const nonOptimal = walkFiles(astroAssets).filter((f) =>
    /\.(jpg|jpeg|png|gif)$/i.test(f),
  );
  if (nonOptimal.length > 0)
    warn(
      SEC_IMAGES,
      `${nonOptimal.length} non-WebP/AVIF image(s) in _astro/ directory`,
    );
  else pass(SEC_IMAGES, "All _astro/ images are WebP or AVIF");
}

// ---------------------------------------------------------------------------
// Step 6: JS bundle size checks
// ---------------------------------------------------------------------------
const SEC_PERF = "PERFORMANCE";
const jsFiles = walkFiles(DIST, ".js");
let totalJs = 0;
let largeJs = 0;
for (const f of jsFiles) {
  const size = fileSize(f);
  totalJs += size;
  if (size > 204_800) {
    warn(SEC_PERF, `${relative(DIST, f)} is ${fmtSize(size)} (>200KB)`);
    largeJs++;
  }
}
if (largeJs === 0 && jsFiles.length > 0)
  pass(SEC_PERF, "All JS files under 200KB");
if (totalJs > 512_000)
  warn(SEC_PERF, `Total JS is ${fmtSize(totalJs)} (>500KB)`);
else if (jsFiles.length > 0) pass(SEC_PERF, `Total JS is ${fmtSize(totalJs)}`);

// ---------------------------------------------------------------------------
// Step 7: External URL validation (opt-in)
// ---------------------------------------------------------------------------
if (checkExternal && externalUrls.size > 0) {
  console.log(`\nChecking ${externalUrls.size} external URL(s)...\n`);
  const SEC_EXT = "EXTERNAL LINKS";
  const urls = [...externalUrls];
  const concurrency = 5;
  const timeout = 5000;

  const checkUrl = async (url) => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      const res = await fetch(url, {
        method: "HEAD",
        signal: controller.signal,
        redirect: "follow",
        headers: { "User-Agent": "PrelaunchChecker/1.0" },
      });
      clearTimeout(timer);
      if (res.status >= 400) warn(SEC_EXT, `${url} → HTTP ${res.status}`);
      else pass(SEC_EXT, `${url} → ${res.status}`);
    } catch (e) {
      warn(SEC_EXT, `${url} → ${e.message || "failed"}`);
    }
  };

  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    await Promise.all(batch.map(checkUrl));
  }
}

// ---------------------------------------------------------------------------
// Step 8: Print report
// ---------------------------------------------------------------------------
const RESET = "\x1b[0m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const BOLD = "\x1b[1m";

let totalErrors = 0;
let totalWarnings = 0;

console.log(`\n${BOLD}Pre-Launch Check${RESET}`);
console.log("================\n");

// Print sections in a specific order: FILES & CONFIG first, then IMAGE FILES, PERFORMANCE, then pages
const sectionOrder = [SEC_FILES, SEC_TRACKING, SEC_COPY, SEC_IMAGES, SEC_PERF];
const pageKeys = [...results.keys()]
  .filter((k) => !sectionOrder.includes(k))
  .sort();
const orderedKeys = [
  ...sectionOrder.filter((k) => results.has(k)),
  ...pageKeys,
];

for (const key of orderedKeys) {
  const { errors: errs, warnings: warns, passes: passList } = results.get(key);
  if (errs.length === 0 && warns.length === 0 && passList.length === 0)
    continue;

  console.log(`${BOLD}${key}${RESET}`);
  for (const msg of errs) {
    console.log(`  ${RED}✗ [ERROR]${RESET} ${msg}`);
    totalErrors++;
  }
  for (const msg of warns) {
    console.log(`  ${YELLOW}! [WARN]${RESET}  ${msg}`);
    totalWarnings++;
  }
  for (const msg of passList) {
    console.log(`  ${GREEN}✓ [PASS]${RESET}  ${msg}`);
  }
  console.log("");
}

console.log("================");
if (totalErrors > 0)
  console.log(
    `${RED}${BOLD}SUMMARY: ${totalErrors} error(s), ${totalWarnings} warning(s)${RESET}`,
  );
else if (totalWarnings > 0)
  console.log(
    `${YELLOW}${BOLD}SUMMARY: 0 errors, ${totalWarnings} warning(s)${RESET}`,
  );
else console.log(`${GREEN}${BOLD}SUMMARY: All checks passed!${RESET}`);

process.exit(totalErrors > 0 ? 1 : 0);

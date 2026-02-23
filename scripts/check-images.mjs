#!/usr/bin/env node
/**
 * Image Optimisation Checker
 *
 * Two checks:
 * 1. Source check — scans .astro files for <Image> tags missing a `width` prop
 * 2. Build check  — scans dist/ for images exceeding a size threshold
 *
 * Usage:
 *   node scripts/check-images.mjs              # source check only (pre-build)
 *   node scripts/check-images.mjs --dist       # both source + dist checks (post-build)
 *   node scripts/check-images.mjs --threshold 300  # custom KB threshold (default: 500)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const srcDir = path.resolve(rootDir, "src");
const distDir = path.resolve(rootDir, "dist");

const args = process.argv.slice(2);
const checkDist = args.includes("--dist");
const thresholdIdx = args.indexOf("--threshold");
const thresholdKB =
  thresholdIdx !== -1 ? parseInt(args[thresholdIdx + 1], 10) : 500;

const IMAGE_EXTENSIONS = new Set([
  ".webp",
  ".jpg",
  ".jpeg",
  ".png",
  ".avif",
  ".gif",
]);

let hasErrors = false;

// ── Source check: <Image> without width ──────────────────────────────

function getAstroFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "ui") continue;
      files.push(...getAstroFiles(full));
    } else if (entry.name.endsWith(".astro")) {
      files.push(full);
    }
  }
  return files;
}

function checkSourceImages() {
  const astroFiles = getAstroFiles(srcDir);
  const issues = [];

  const imageTagRegex = /<Image\b[^>]*?\/?>/gs;
  const widthPropRegex = /\bwidth[={]/;
  const getImageRegex = /getImage\s*\(/;

  for (const file of astroFiles) {
    const content = fs.readFileSync(file, "utf-8");

    if (getImageRegex.test(content)) continue;

    let match;
    while ((match = imageTagRegex.exec(content)) !== null) {
      const tag = match[0];
      if (!widthPropRegex.test(tag)) {
        const lineNum = content.substring(0, match.index).split("\n").length;
        const relPath = path.relative(rootDir, file);
        issues.push({ file: relPath, line: lineNum, tag: tag.trim() });
      }
    }
  }

  if (issues.length > 0) {
    hasErrors = true;
    console.log(`\n  Found ${issues.length} <Image> tag(s) missing width:\n`);
    for (const { file, line, tag } of issues) {
      const preview = tag.length > 100 ? tag.substring(0, 100) + "..." : tag;
      console.log(`    ${file}:${line}`);
      console.log(`      ${preview}\n`);
    }
  } else {
    console.log("\n  All <Image> tags have width constraints.\n");
  }
}

// ── Dist check: oversized images ─────────────────────────────────────

function getImageFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getImageFiles(full));
    } else if (IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(full);
    }
  }
  return files;
}

function checkDistImages() {
  if (!fs.existsSync(distDir)) {
    console.log("  dist/ not found — skipping build output check.\n");
    return;
  }

  const images = getImageFiles(distDir);
  const oversized = [];

  for (const file of images) {
    const stats = fs.statSync(file);
    const sizeKB = stats.size / 1024;
    if (sizeKB > thresholdKB) {
      oversized.push({
        file: "/" + path.relative(distDir, file),
        sizeKB: Math.round(sizeKB),
      });
    }
  }

  oversized.sort((a, b) => b.sizeKB - a.sizeKB);

  if (oversized.length > 0) {
    hasErrors = true;
    console.log(
      `  Found ${oversized.length} image(s) exceeding ${thresholdKB}KB:\n`,
    );
    for (const { file, sizeKB } of oversized) {
      console.log(`    ${sizeKB}KB  ${file}`);
    }
    console.log();
  } else {
    console.log(`  All images in dist/ are under ${thresholdKB}KB.\n`);
  }
}

// ── Run ──────────────────────────────────────────────────────────────

console.log("\nImage optimisation check");
console.log("─".repeat(40));

console.log("\n[Source] Checking <Image> tags for width constraints...");
checkSourceImages();

if (checkDist) {
  console.log(`[Build] Checking dist/ images (threshold: ${thresholdKB}KB)...`);
  checkDistImages();
}

if (hasErrors) {
  console.log("Image check failed.\n");
  process.exit(1);
} else {
  console.log("Image check passed.\n");
  process.exit(0);
}

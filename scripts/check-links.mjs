#!/usr/bin/env node
/**
 * Internal Link Checker
 *
 * Scans all HTML files in dist/ and reports broken internal links.
 * Runs automatically after build via: pnpm build
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../dist");

if (!fs.existsSync(distDir)) {
  console.error("dist/ not found. Run pnpm build first.");
  process.exit(1);
}

const hrefRegex = /href=["']?(\/[^"'#?\s>]*)/g;

function getHtmlFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getHtmlFiles(full));
    } else if (entry.name.endsWith(".html")) {
      files.push(full);
    }
  }
  return files;
}

function resolveLink(href) {
  const cleaned = href.replace(/\/$/, "") || "/";
  if (cleaned === "/") return path.join(distDir, "index.html");

  const asFile = path.join(distDir, cleaned);
  const asDir = path.join(distDir, cleaned, "index.html");

  if (fs.existsSync(asFile)) return asFile;
  if (fs.existsSync(asDir)) return asDir;

  if (!path.extname(cleaned)) {
    const withHtml = asFile + ".html";
    if (fs.existsSync(withHtml)) return withHtml;
  }

  return null;
}

function run() {
  const htmlFiles = getHtmlFiles(distDir);
  const broken = new Map();
  let totalLinks = 0;

  for (const file of htmlFiles) {
    const content = fs.readFileSync(file, "utf-8");
    const sourcePath =
      "/" +
      path
        .relative(distDir, file)
        .replace(/index\.html$/, "")
        .replace(/\/$/, "");
    let match;

    while ((match = hrefRegex.exec(content)) !== null) {
      const href = match[1];

      if (
        href.startsWith("/api/") ||
        href.startsWith("/images/") ||
        href.startsWith("/assets/") ||
        href.startsWith("/fonts/")
      )
        continue;

      if (
        href.endsWith(".xml") ||
        href.endsWith(".json") ||
        href.endsWith(".txt") ||
        href.endsWith(".ico") ||
        href.endsWith(".webmanifest") ||
        href.endsWith(".svg") ||
        href.endsWith(".css") ||
        href.endsWith(".js")
      )
        continue;

      totalLinks++;
      const resolved = resolveLink(href);

      if (!resolved) {
        if (!broken.has(href)) {
          broken.set(href, []);
        }
        broken.get(href).push(sourcePath || "/");
      }
    }
  }

  console.log(
    `\nScanned ${htmlFiles.length} pages, checked ${totalLinks} internal links.\n`,
  );

  if (broken.size === 0) {
    console.log("No broken internal links found.\n");
    process.exit(0);
  }

  console.log(`Found ${broken.size} broken link(s):\n`);

  const sorted = [...broken.entries()].sort(
    (a, b) => b[1].length - a[1].length,
  );

  for (const [href, sources] of sorted) {
    console.log(`  ${href}`);
    console.log(`    linked from ${sources.length} page(s):`);
    const show = sources.slice(0, 5);
    for (const s of show) {
      console.log(`      ${s}`);
    }
    if (sources.length > 5) {
      console.log(`      ...and ${sources.length - 5} more`);
    }
    console.log();
  }

  process.exit(1);
}

run();

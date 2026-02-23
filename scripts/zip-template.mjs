#!/usr/bin/env node

/**
 * Creates a clean zip of the template for starting new projects.
 * Excludes git history, node_modules, build output, and other non-template files.
 */

import { execSync } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const OUTPUT = resolve(ROOT, "astro-starter-template.zip");

const EXCLUDE = [
  ".git/*",
  ".astro/*",
  "node_modules/*",
  "dist/*",
  "mockups/*",
  ".DS_Store",
  "**/.DS_Store",
  ".env",
  ".env.production",
  "astro-starter-template.zip",
];

if (existsSync(OUTPUT)) {
  unlinkSync(OUTPUT);
}

const excludeFlags = EXCLUDE.map((p) => `-x '${p}'`).join(" ");
execSync(`cd "${ROOT}" && zip -r "${OUTPUT}" . ${excludeFlags}`, {
  stdio: "inherit",
});

console.log(`\n✓ Template zip created: astro-starter-template.zip`);

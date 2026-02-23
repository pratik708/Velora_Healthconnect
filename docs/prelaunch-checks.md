# Pre-Launch Checks

Run before deploying any site built from this template. The script analyses the built `dist/` directory and source config files for placeholder values, SEO issues, broken links, accessibility problems, and performance concerns.

```bash
pnpm prelaunch        # Check existing dist/ (skip build)
pnpm prelaunch:full   # Rebuild + check external URLs (slow)
```

Or run directly with flags:

```bash
node scripts/prelaunch.mjs                  # Full build + check
node scripts/prelaunch.mjs --skip-build     # Check existing dist/
node scripts/prelaunch.mjs --check-external # Also HEAD-request external URLs
```

## What it checks

| Category          | Examples                                                                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Placeholders**  | `example.com` in URLs, `hello@example.com`, `Site Name`, `Company Pty Ltd`, lorem ipsum, placeholder nav links, `placehold.co` images, social media links still `#` |
| **Form & Email**  | `MAIL_TO_EMAIL` still set to internal agency address (`@cjco.com.au`, `@medicalmarketinggroup.com.au`) — **error**, must be set to client email                     |
| **Analytics**     | Missing GA4/GTM script, missing Meta Pixel                                                                                                                          |
| **SEO**           | Missing/empty `<title>`, meta description, canonical, OG tags, Twitter card, heading structure, OG image dimensions (should be 1200x630)                            |
| **Images**        | Missing `alt`/`width`/`height`, files >500KB, non-WebP/AVIF in `_astro/`                                                                                            |
| **Links**         | Broken internal links, `javascript:` hrefs, `#` placeholders, missing `rel="noopener noreferrer"` on external links                                                 |
| **Accessibility** | Missing `lang` on `<html>`, skip-to-content link, empty buttons/links without `aria-label`, form inputs without labels, viewport meta                               |
| **Performance**   | JS files >200KB, total JS >500KB, missing font preconnect, hero image missing `loading="eager"`                                                                     |
| **Files**         | Missing favicon, robots.txt, sitemap; `.env` leaked into dist                                                                                                       |

## Exit codes

- `0` — only warnings (or all clear)
- `1` — errors found (blocking issues)
- `2` — build failed or `dist/` missing

## Fixing issues

After running the script, address errors first (exit code 1), then warnings. Most placeholder warnings are resolved by updating `src/data/site.ts`, `astro.config.mjs`, `public/robots.txt`, and `.env`.

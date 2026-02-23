# Astro Starter Template — Agent Instructions

## Purpose

This is a perfectly configured Astro base that gets duplicated for every new site. As an AI agent, your job is to:

1. **Copy the folder** → update a few placeholder values → immediately start building
2. **Use shadcn/ui components and blocks** without fighting setup — everything is pre-installed, wrapped in Astro components, and ready to drop into pages
3. **Build elite-quality sites** that score 100 across Lighthouse out of the box — SEO, accessibility, performance, and image handling are all baked into the template
4. **Work fast and autonomously** — the typed props, path aliases, and clear component architecture mean you know exactly where everything goes, what patterns to follow, and what not to do

Zero setup friction, maximum build speed, elite quality floor.

---

## Quick Reference

- **Framework**: Astro 5 + React 19 (islands architecture)
- **Styling**: Tailwind CSS v4 (CSS-first, via `@tailwindcss/vite` plugin)
- **Components**: shadcn/ui (new-york style, neutral base)
- **TypeScript**: Strict mode with path aliases
- **Package Manager**: pnpm

```bash
pnpm dev          # Start dev server at localhost:4321
pnpm build        # Full pipeline: type check → lint → format check → build → link check
pnpm preview      # Preview production build
pnpm check        # TypeScript type checking only
pnpm clean        # Remove dist and .astro cache
pnpm lint         # ESLint + Stylelint check
pnpm lint:fix     # ESLint + Stylelint auto-fix
pnpm format       # Prettier format all files
pnpm format:check # Prettier check (CI-friendly)
pnpm knip         # Detect unused files, exports, and dependencies
pnpm shadcn:add   # Install shadcn component/block + auto-restore pill button
pnpm restore-button # Manually restore pill button styles if needed
pnpm prelaunch    # Comprehensive pre-launch audit
```

---

## Build Playbook

Every new site follows this flow: **Setup → Design Mockup → Approve → Team Build**.

### Phase 1: Setup

```bash
pnpm install
```

Copy `.env.example` to `.env` and set the shadcn blocks API key:

```
SHADCNBLOCKS_API_KEY=sk_live_mR_RSAg9oP4GV6oey-kuOFoeHpfDWQ-Z
```

**Set project identity:**

| File                          | What to Set                                                                                   |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| `src/data/site.ts`            | Business name, legal name, ABN/ACN, contact email, phone, address, social links, SEO defaults |
| `astro.config.mjs`            | `site` URL (e.g. `https://smithplumbing.com.au`)                                              |
| `.env`                        | `MAIL_FROM_NAME`, `MAIL_FROM_EMAIL`, `MAIL_TO_EMAIL`, `MAIL_TO_NAME`                          |
| `public/robots.txt`           | Update sitemap URL to match the `site` URL                                                    |
| `public/favicon.svg` / `.ico` | Replace with client's favicon                                                                 |
| `public/og-image.jpg`         | Replace with a branded 1200x630 OG image                                                      |

`site.ts` is the single source of truth — update it first.

**Set the brand:**

Fonts — Edit the `experimental.fonts` array in `astro.config.mjs`. Then reference them in `src/styles/global.css`:

```css
@theme inline {
  --font-sans: var(--font-your-body-font), system-ui, sans-serif;
  --font-heading: var(--font-your-heading-font), sans-serif;
}
```

Colours — Edit the `:root` variables in `src/styles/global.css` (oklch colour space):

```css
:root {
  --primary: oklch(0.205 0 0);
  --accent: oklch(0.637 0.237 25.331);
}
```

### Phase 2: Design Mockup (HARD GATE)

**This is the most critical step. Nothing else proceeds until the user approves the design.**

Create `mockups/homepage.html` — a single self-contained HTML file using Tailwind CDN, Google Fonts CDN, and the brand colours/fonts from Phase 1 (convert oklch to hex for CDN compatibility). Include real copy (not lorem ipsum), placeholder images, responsive layout, and enough sections to evaluate the full design system — colours, typography hierarchy, spacing, and component patterns all working together.

Open the mockup in the browser and ask the user for feedback. Iterate until they explicitly approve. Once approved, carry any colour/font/spacing changes back to `global.css`, then delete `mockups/` (it's gitignored).

**DO NOT spin up the team build, create planning docs, or write any Astro code until the user has explicitly approved the homepage mockup.** Iterating on one HTML file is fast — rebuilding pages across multiple agents after the fact is not.

### Phase 3: Team Build

Once the design is approved, spin up the multi-agent team workflow. This parallelises the remaining work across specialised agents: strategy/SEO planning, foundation setup, page building, SEO verification, and QA.

Full phase definitions, prompt templates, and orchestration notes are in `docs/team-build-workflow.md`.

**Quick reference for what happens after design approval:**

- Strategy & SEO Architect → outputs `SITE-PLAN.md`
- Design Architect → outputs `DESIGN-PLAN.md` (encoding the approved mockup design)
- Foundation Agent → updates config, navbar, footer, global styles
- Page Builders (parallel) → build all pages using both plan docs
- SEO Verification → targeted on-page SEO fixes
- QA + Launch → `pnpm build`, `pnpm lint`, `pnpm prelaunch`

### Connect Services (during or after team build)

- **Analytics** — Set tracking IDs in `src/data/analytics.ts`. Empty = nothing output.
- **Email** — Set AWS SES credentials in `.env`. See `docs/contact-form-email.md`.

### Verify & Launch

```bash
pnpm build        # Runs full pipeline (must pass with 0 errors)
pnpm knip         # Detect unused files/deps
pnpm prelaunch    # Comprehensive pre-launch audit
```

`pnpm build` automatically runs `prebuild` first: `astro check` (TypeScript) → `eslint .` (JS/TS linting) → `stylelint` (CSS linting) → `prettier --check .` (formatting). If any check fails, the build never starts. After the build, `check-links.mjs` validates all internal links.

See `docs/prelaunch-checks.md` for what the prelaunch script checks and how to fix issues.

---

## Project Architecture

### Directory Structure

```
src/
├── assets/images/        # Images optimised by Astro (NOT public/)
├── components/
│   ├── ui/               # React shadcn/ui components (DO NOT EDIT directly)
│   ├── astro-ui/         # Astro wrappers for shadcn components (USE THESE)
│   ├── sections/         # Reusable page sections (Hero, Features, Section)
│   └── common/           # Shared components (Header.astro, Footer.astro)
├── content/blog/         # Markdown/MDX blog posts
├── data/                 # Static data files (site.ts, analytics.ts)
├── hooks/                # React hooks (use-mobile.ts)
├── layouts/
│   ├── BaseLayout.astro  # Root HTML document (<head>, SEO, transitions)
│   ├── PageLayout.astro  # Standard page (header + main + footer)
│   └── BlogLayout.astro  # Blog post (article + metadata)
├── lib/utils.ts          # cn() class merging utility
├── pages/                # File-based routing
├── styles/global.css     # Tailwind v4 theme + design tokens
└── content.config.ts     # Content collection schemas
```

### Component Architecture

**shadcn/ui primitives** (`src/components/ui/*.tsx`): Raw React components. Do not import directly in `.astro` files without a `client:*` directive. Do not edit these files.

**Astro wrappers** (`src/components/astro-ui/*.astro`): Use these in Astro pages for zero-JS rendering of static elements or automatic hydration for interactive ones.

**Page-level Astro components** (`src/components/*.astro`): Converted shadcn blocks and page sections using Astro's `<Image>`. The template ships zero React JS on all default pages.

### How to Use Components in Pages

```astro
---
import Button from "@components/astro-ui/Button.astro";
import Card from "@components/astro-ui/Card.astro";
import CardHeader from "@components/astro-ui/CardHeader.astro";
import CardTitle from "@components/astro-ui/CardTitle.astro";
import CardContent from "@components/astro-ui/CardContent.astro";
import Badge from "@components/astro-ui/Badge.astro";
---

<!-- Static button (no JS) -->
<Button variant="default" size="lg">Click Me</Button>

<!-- Link button (renders as <a>, no JS) -->
<Button href="/about" variant="outline">Learn More</Button>

<!-- Interactive button (React hydration) -->
<Button interactive variant="destructive">Delete</Button>

<!-- Cards and badges render as static HTML -->
<Card>
  <CardHeader><CardTitle>Title</CardTitle></CardHeader>
  <CardContent><p>Content</p></CardContent>
</Card>
<Badge variant="secondary">New</Badge>
```

### Component Hydration Rules

| Directive             | When                         | Use For                                                       |
| --------------------- | ---------------------------- | ------------------------------------------------------------- |
| None                  | Always                       | Static display components (Badge, Card, Input, Label, etc.)   |
| `client:visible`      | When element enters viewport | Most interactive components (Accordion, Tabs, Carousel, etc.) |
| `client:load`         | Immediately on page load     | Overlays/modals (Dialog, Sheet, Drawer, AlertDialog)          |
| `client:idle`         | When browser is idle         | Low-priority interactivity                                    |
| `client:only="react"` | Never SSR                    | Components that need browser APIs on initial render           |

### React Context Rule

**shadcn/ui components that share React context MUST be in a single `.tsx` file.** Do not split Popover, PopoverTrigger, and PopoverContent across separate Astro component boundaries — they will not share context. Wrap them in a single React component and use `client:visible` on the Astro side.

---

## Path Aliases

| Alias           | Maps To              |
| --------------- | -------------------- |
| `@/*`           | `./src/*`            |
| `@components/*` | `./src/components/*` |
| `@layouts/*`    | `./src/layouts/*`    |
| `@assets/*`     | `./src/assets/*`     |
| `@lib/*`        | `./src/lib/*`        |
| `@hooks/*`      | `./src/hooks/*`      |

Always use these aliases instead of relative paths.

---

## Images

**Always store images in `src/assets/images/`** — never `public/` for content images. Astro optimises images in `src/` (format conversion, responsive srcset, lazy loading).

```astro
---
import { Image } from "astro:assets";
import heroImage from "@assets/images/hero.jpg";
---

<Image src={heroImage} alt="Description" width={800} height={400} />
<Image src={heroImage} alt="Hero" loading="eager" width={1200} height={600} />
```

The `image.layout: 'constrained'` setting in `astro.config.mjs` means all images automatically get responsive `srcset` attributes. Only use `public/` for assets that must keep their exact filename (favicons, robots.txt).

**Images in React islands:** Use `getImage()` in the Astro frontmatter to optimise, then pass the URL as a prop. Prefer converting static blocks to Astro so images go through `<Image>` directly. **Never pass `.src` from an imported image directly to a React `<img>` tag.**

---

## Styling

There is **no `tailwind.config.js`**. Tailwind v4 uses CSS-first config — all theme tokens are in `src/styles/global.css` (`@theme inline` block + `:root` variables). All colour values use oklch. This template is **light mode only** — do not add `dark:` variants.

---

## Content Collections (Blog)

Blog posts go in `src/content/blog/` as `.md` or `.mdx` files. Schema is in `src/content.config.ts`.

```yaml
---
title: "Post Title" # Required
description: "Short summary" # Required
pubDate: 2024-01-15 # Required (YYYY-MM-DD)
updatedDate: 2024-02-01 # Optional
author: "Name" # Optional (default: "Anonymous")
image: "./hero.jpg" # Optional (relative to post file)
tags: ["tag1", "tag2"] # Optional (default: [])
draft: true # Optional (default: false, excluded from build)
---
```

The blog listing (`/blog`) and dynamic routes (`/blog/my-post`) are already configured.

---

## SEO

Built into `BaseLayout.astro`. Every page automatically gets `<title>`, meta description, canonical, Open Graph, Twitter Card, and sitemap. Homepage title renders as just "Site Name", other pages as `{title} | Site Name`.

| Prop          | Type     | Default           | Description                              |
| ------------- | -------- | ----------------- | ---------------------------------------- |
| `title`       | `string` | Required          | Page title                               |
| `description` | `string` | Required          | Meta description                         |
| `image`       | `string` | `'/og-image.jpg'` | OG image path                            |
| `canonical`   | `string` | Current URL       | Canonical URL                            |
| `ogType`      | `string` | `'website'`       | OG type (use `'article'` for blog posts) |
| `robots`      | `string` | `'index, follow'` | Robots directive                         |

Blog posts automatically get JSON-LD structured data (BlogPosting schema).

---

## Accessibility Checklist

- Skip-to-content link is in `BaseLayout.astro`
- Use semantic HTML: `<main>`, `<nav>`, `<article>`, `<section>`, `<header>`, `<footer>`
- Every `<Image>` requires an `alt` attribute
- Use `<button>` for actions, `<a>` for navigation
- Ensure 4.5:1 colour contrast ratio minimum
- Add `aria-label` to icon-only buttons

---

## Reusable Page Sections

Three pre-built section components in `src/components/sections/`:

```astro
<Hero
  title="Welcome"
  subtitle="Description"
  badge="New"
  primaryCta={{ text: "Get Started", href: "/signup" }}
  secondaryCta={{ text: "Learn More", href: "/about" }}
  align="center"
/>

<Features
  title="Why Choose Us"
  subtitle="Built with the best tools"
  columns={3}
  features={[
    { title: "Fast", description: "Lightning fast load times" },
    { title: "Secure", description: "Enterprise-grade security" },
  ]}
/>

<Section id="about" padding="lg" container>
  <h2>About Us</h2>
  <p>Content here</p>
</Section>
```

---

## Site Globals

All business details are centralised in `src/data/site.ts` — the single source of truth for business name, contact info, social URLs, and SEO defaults. Values flow into navbar, footer, privacy page, contact page, and base layout automatically.

```typescript
import { site } from "@/data/site";

<a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>
```

---

## Analytics & Tracking

All tracking IDs are in `src/data/analytics.ts`. Set an ID → the script loads on all pages. Leave blank → nothing output.

- **GTM takes precedence over GA4** — if `gtmId` is set, `ga4Id` is ignored
- **Meta Pixel** loads independently alongside either GTM or GA4
- All scripts use `async` loading — no Lighthouse impact
- Conversion tracking (`fireConversionEvents()` in `src/lib/tracking.ts`) fires on form success

---

## Code Quality

- **ESLint**: Flat config in `eslint.config.mjs`. `src/components/ui/` is ignored. Includes `eslint-plugin-compat` to flag JS APIs not supported by the browserslist target.
- **Stylelint**: Config in `.stylelintrc.json`. Lints CSS and `<style>` blocks in `.astro` files. Includes `stylelint-no-unsupported-browser-features` to flag unsupported CSS properties.
- **Browser Baseline**: Target is **Baseline Widely Available** (supported in Chrome, Edge, Firefox, Safari for 30+ months). Configured via `browserslist-config-baseline` in `package.json`. Both ESLint and Stylelint check against this automatically.
- **Prettier**: `prettier-plugin-astro` + `prettier-plugin-tailwindcss` for class sorting.
- **Knip**: Detects unused files/exports/deps. Template library dirs are ignored in `knip.json`.
- **Date formatting**: Uses Australian English locale (`en-AU`). Search for `en-AU` if building for another region.

---

## Do Not

- Do not import from `src/components/ui/` directly in `.astro` files without a `client:*` directive
- Do not put content images in `public/` — use `src/assets/images/`
- Do not create a `tailwind.config.js` — Tailwind v4 uses CSS-first config in `global.css`
- Do not split React context-dependent components across Astro boundaries
- Do not use `class` prop on React components — use `className` (astro-ui wrappers handle the conversion)
- Do not add `dark:` Tailwind variants — light mode only
- Do not forget `alt` on images or `title`/`description` on layouts
- Do not edit `src/components/ui/` files
- Do not remove dependencies from `knip.json` `ignoreDependencies`

---

## Reference Docs

Detailed guides for specific tasks — read these on-demand, not loaded by default:

| Document                      | When to Read                                                                 |
| ----------------------------- | ---------------------------------------------------------------------------- |
| `docs/team-build-workflow.md` | Multi-agent site builds (4+ pages)                                           |
| `docs/contact-form-email.md`  | Working on forms, email, UTM tracking, spam prevention, or conversion events |
| `docs/shadcn-guide.md`        | Adding or converting shadcn/ui components and blocks                         |
| `docs/prelaunch-checks.md`    | Running pre-launch audits before deployment                                  |
| `docs/git-strategy.md`        | Branching, staging vs production, dev + copywriter workflow                  |

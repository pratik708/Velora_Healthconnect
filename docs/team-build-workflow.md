# Team Build Workflow (Multi-Agent)

The default workflow for building sites. Uses specialised agents working in parallel to build the full site fast.

**PREREQUISITE:** The homepage HTML mockup (Phase 2 in the Build Playbook) must be approved by the user BEFORE this workflow starts. The approved mockup sets the visual direction — colours, typography, spacing, component patterns — that every agent in this workflow follows. Do not start this workflow without an approved design.

## Overview

```
Phase 0: Strategy & SEO Architect (1 agent, plans)     → SITE-PLAN.md
Phase 1: Design Architect (1 agent, plans)              → DESIGN-PLAN.md (encodes the approved mockup)
Phase 2: Foundation (1 agent, builds)                   → shared components + config
Phase 3: Page Builders (N agents, parallel)             → complete pages
Phase 4: SEO Verification & Polish (1 agent, edits)     → targeted optimisations
Phase 5: QA + Launch Prep (1 agent, verifies)           → prelaunch checks + build
```

Each phase depends on the previous one. Phase 3 is fully parallel with zero coordination between agents.

## Document Chain

Context flows downward through planning documents, not through agent messages:

```
Client Brief (human input)
    ↓
SITE-PLAN.md (Phase 0 output — what to build + SEO strategy)
    ↓
DESIGN-PLAN.md (Phase 1 output — how it should look)
    ↓
Foundation builds shared pieces (reads both plans)
    ↓
Page Builders construct pages (reads both plans)
    ↓
SEO Optimizer verifies strategy execution (reads plans + built files)
    ↓
QA verifies everything (reads all files + runs prelaunch)
```

Two planning docs become the contract. Every building agent references both. Consistency without coordination.

## Client Brief Template

The team lead must collect this information before starting. The more detail provided, the less human review needed at the end.

```markdown
## Business Details

- Company name:
- Legal name:
- ABN/ACN:
- Industry:
- Location (full address):
- Phone:
- Email:
- Website URL:
- Social media URLs:

## Brand

- Primary colour: (hex)
- Secondary colour: (hex)
- Accent colour: (hex)
- Heading font: (Google Font name)
- Body font: (Google Font name)
- Brand voice: (e.g. professional but approachable, technical authority, warm and friendly)

## Pages to Build

1. Homepage — [key message, hero headline direction, main sections needed]
2. About — [founding story notes, team info, values, differentiators]
3. Services — [list each service with 1-2 sentence descriptions]
4. Contact — [what info to collect, office details]
5. Blog — [initial post topics, 2-3 posts]
6. [Additional pages as needed]

## Target Audience

[Who they are, what they care about, pain points, desired action]

## SEO

- Primary keywords: [3-5 terms]
- Secondary keywords: [5-10 terms]
- Local SEO: [yes/no, target areas]
- Competitors: [2-3 competitor URLs for reference]

## Content & Assets

- Existing copy: [yes/no, where to find it]
- Images: [provided/need sourcing/use placeholders]
- Testimonials: [available/not available]
- Logo: [provided/need creating]
```

## Phase 0 — Strategy & SEO Architect

**Agent type:** general-purpose (needs Write tool for SITE-PLAN.md)
**Model:** sonnet
**Reads:** Client brief, existing starter template structure
**Outputs:** `SITE-PLAN.md` in project root

This agent combines information architecture and SEO strategy into a single planning pass. It decides what pages exist, what content goes on each page, and how SEO is baked in from the start — not bolted on at the end.

**Prompt template:**

```
You are a Strategy & SEO Architect. Read the client brief below and the starter
template structure at [PROJECT_PATH]. Output a comprehensive SITE-PLAN.md to
the project root.

SITE-PLAN.md must contain:

1. SITEMAP & HIERARCHY
   - Every page with its URL path and parent/child relationships
   - Navigation structure (main nav items, dropdown groupings, footer nav)
   - Which pages are top-level vs supporting

2. PAGE-BY-PAGE SPECIFICATIONS
   For each page:
   - Purpose and conversion goal (what action should the user take?)
   - Sections in order (hero, features, testimonials, CTA, FAQ, etc.)
   - Key messaging points and headline direction
   - Primary keyword + secondary keywords (no cannibalization across pages)
   - Internal links to/from other pages
   - CTAs — text, destination, and placement
   - Schema.org markup type (Organization, LocalBusiness, Service, FAQPage, etc.)

3. KEYWORD MAP
   - Table mapping each page to its target keywords
   - Ensures no two pages compete for the same primary term
   - Search intent classification per page (informational, commercial, transactional)

4. CONVERSION FLOW
   - The intended user journey (e.g. homepage → services → contact)
   - Where trust signals appear (testimonials, stats, certifications)
   - CTA strategy (primary vs secondary CTAs per page)

5. INTERNAL LINKING STRATEGY
   - Cross-link map between related pages
   - Contextual link opportunities within copy
   - Footer and nav link structure

6. CONTENT REQUIREMENTS
   - Blog post topics with target keywords and outlines
   - FAQ content mapped to relevant pages
   - Testimonial/social proof placement

7. TECHNICAL SEO CHECKLIST
   - Meta title format per page (keep under 60 chars)
   - Meta description guidelines per page (keep under 155 chars)
   - Canonical URL structure
   - Open Graph and Twitter Card requirements
   - Schema markup per page

[PASTE CLIENT BRIEF HERE]
```

## Phase 1 — Design Architect

**Agent type:** general-purpose (needs Write tool for DESIGN-PLAN.md)
**Model:** sonnet
**Reads:** `SITE-PLAN.md`, starter template components (astro-ui directory, sections, existing pages), `global.css`
**Outputs:** `DESIGN-PLAN.md` in project root

This agent determines the visual system and component selections. It reads the available component library thoroughly before making decisions.

**Prompt template:**

```
You are a Design Architect. Read SITE-PLAN.md and thoroughly explore the
starter template at [PROJECT_PATH] — especially:
- src/components/astro-ui/ (all available Astro wrapper components)
- src/components/sections/ (Hero, Features, Section)
- src/components/ui/ (shadcn/ui primitives available)
- src/styles/global.css (current theme tokens)
- The existing pages for design patterns

Output DESIGN-PLAN.md to the project root.

DESIGN-PLAN.md must contain:

1. BRAND TOKENS
   - Exact oklch colour values for primary, secondary, accent, destructive
     (converted from the client's hex values)
   - Font selections (Google Font names for heading, body, mono)
   - Border radius preference (e.g. rounded-lg, rounded-xl)
   - Shadow style (subtle, medium, dramatic)

2. COMPONENT SELECTIONS
   For each section on each page (referencing SITE-PLAN.md):
   - Which existing component to use (e.g. "Hero: use sections/Hero.astro with
     center alignment", "Features: use sections/Features.astro with 3 columns")
   - Props to pass (align, columns, badge text, CTA config)
   - If no existing component fits, specify what new component is needed
     and which astro-ui primitives it should compose

3. LAYOUT PATTERNS
   - Section ordering principles (hero → social proof → features → CTA pattern)
   - Spacing scale (section padding, gap between elements)
   - Container max-widths per section type
   - Whether to use constrained (max-w-4xl) or full-width sections

4. VISUAL HIERARCHY
   - Heading sizes per level (h1 through h4)
   - Body text sizes and line heights
   - Font weight usage (when to use semibold vs bold vs extrabold)
   - When to use accent colours vs primary vs muted

5. INTERACTION PATTERNS
   - Hover effects on cards, buttons, links
   - Any animation preferences (subtle transitions, no animations, etc.)
   - Mobile-specific behaviour (hamburger menu is already built)
   - CTA button styles (primary vs outline vs ghost)

6. PAGE WIREFRAMES (text-based)
   For each page:
   - Ordered list of sections with component names
   - Layout notes (full-width vs contained, background colours)
   - Image placement and sizing guidance
   - CTA placement and styling

7. NEW COMPONENTS NEEDED
   - List of any components not in the existing library that need building
   - For each: purpose, which astro-ui primitives to compose, rough structure

8. CSS CUSTOM PROPERTIES
   - The exact values to set in global.css :root block
   - Any @theme inline additions needed
   - Any custom utility classes to add
```

## Phase 2 — Foundation Agent

**Agent type:** general-purpose
**Model:** sonnet
**Reads:** `SITE-PLAN.md`, `DESIGN-PLAN.md`
**Builds:** Shared config and components that all pages depend on

**Tasks:**

1. Update `src/data/site.ts` with real business details from the client brief
2. Update `astro.config.mjs` — site URL, fonts
3. Update `.env` with mail settings
4. Update `public/robots.txt` with real sitemap URL
5. Implement brand tokens in `src/styles/global.css` (colours, fonts from DESIGN-PLAN.md)
6. Build the real navbar in `src/components/navbar.astro` with actual page links and dropdown structure from SITE-PLAN.md
7. Build the real footer in `src/components/footer.astro` with actual links
8. Create any new shared section components specified in DESIGN-PLAN.md
9. Update `src/data/analytics.ts` if tracking IDs are provided

**This must complete before Phase 3.** It establishes the shared foundation.

## Phase 3 — Page Builders (Parallel)

**Agent type:** general-purpose
**Model:** sonnet
**Reads:** `SITE-PLAN.md`, `DESIGN-PLAN.md`, foundation files (site.ts, global.css, shared components)
**Builds:** Complete pages — copy, components, SEO, everything

Each agent owns specific pages and is prompted as a full-stack expert. They write the copy, build the components, handle on-page SEO, and ensure design consistency. All in one pass.

**Splitting strategy:**

- Group related pages per agent (e.g. Homepage + About, Services + Contact, Blog posts)
- Each agent only touches their own page files — zero file conflicts
- Every agent gets the same brief (both plan documents) for consistency

**Prompt template (per agent):**

```
You are a Page Builder on the site-build team. You are a full-stack expert —
you write compelling copy, build components, handle SEO, and ensure design
quality. All in one pass.

Read these planning documents first:
- SITE-PLAN.md (your content specs, keywords, CTAs, internal links)
- DESIGN-PLAN.md (your component selections, layout patterns, visual hierarchy)

Also read the foundation files to understand what's already built:
- src/data/site.ts (business details)
- src/styles/global.css (brand tokens)
- src/components/navbar.astro (navigation structure)
- src/components/footer.astro (footer structure)

YOUR PAGES: [List specific pages this agent owns]

For each page:
1. Create the page file in src/pages/ using PageLayout
2. Write compelling, conversion-focused copy following SITE-PLAN.md specs
3. Use the exact components specified in DESIGN-PLAN.md
4. Set proper title and description props on PageLayout
5. Include all internal links specified in SITE-PLAN.md
6. Add schema.org JSON-LD markup as specified
7. Follow the heading hierarchy from DESIGN-PLAN.md
8. Use proper image handling (src/assets/images/, <Image> component)

IMPORTANT:
- Follow the component architecture rules in CLAUDE.md
- Use astro-ui wrappers, not raw React imports
- Use @components/, @layouts/, @assets/ path aliases
- Store images in src/assets/images/, never public/
- Every page needs title and description props
```

## Phase 4 — SEO Verification & Polish

**Agent type:** general-purpose
**Model:** sonnet
**Reads:** `SITE-PLAN.md`, all built pages, `global.css`, layouts
**Edits:** Targeted SEO improvements only — does not rewrite copy or restructure pages

**Tasks:**

1. Verify keyword map execution — check each page targets its assigned keywords
2. Check meta titles (under 60 chars) and descriptions (under 155 chars)
3. Verify schema.org markup on every page matches SITE-PLAN.md spec
4. Check internal linking — ensure all cross-links from SITE-PLAN.md are implemented
5. Verify Open Graph tags, Twitter Card tags, canonical URLs on all pages
6. Check heading hierarchy (single h1 per page, logical h2/h3 nesting)
7. Review image alt text quality and descriptive filenames
8. Verify sitemap will include all pages
9. Check that no two pages compete for the same primary keyword
10. Add any missing schema markup or structured data

**Prompt instruction:** "Make targeted edits to existing content. Do not rewrite copy or restructure pages. Focus on SEO enhancements that don't change the user-facing design."

## Phase 5 — QA + Launch Prep

**Agent type:** general-purpose
**Model:** sonnet
**Reads:** All project files
**Runs:** Build and verification commands

**Tasks:**

1. Run `pnpm build` — must pass with zero errors
2. Run `pnpm lint` — fix any linting issues
3. Run `pnpm prelaunch` — address errors and warnings
4. Verify consistency across pages:
   - Same navbar/footer on every page
   - Consistent heading sizes and spacing
   - CTA buttons follow the same pattern
   - Brand colours used correctly throughout
5. Check all internal links resolve to real pages
6. Verify contact form has correct field labels and spam prevention
7. Test that blog posts render correctly
8. Confirm favicon, og-image, and robots.txt are properly configured

## Team Orchestration Notes

**Token efficiency:** The document chain approach (plan docs as contracts) eliminates back-and-forth messaging between agents. Each agent reads two files and builds. No review loops, no coordination overhead.

**Agent model:** Use `sonnet` for all agents. The planning documents provide enough context that the faster model produces excellent results.

**Typical agent count:**

- 2 planning agents (sequential)
- 1 foundation agent
- 2-3 page builder agents (parallel)
- 1 SEO agent
- 1 QA agent
- Total: 6-8 agents, but only 2-3 running concurrently at peak

**When to use this vs solo Build Playbook:**

- Solo: Quick sites, 2-3 pages, simple requirements, hands-on building
- Team: Full sites, 4+ pages, clear client brief, maximum speed

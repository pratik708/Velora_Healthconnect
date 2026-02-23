# Adding shadcn/ui Components

## Add a standard component or block

```bash
pnpm shadcn:add [component-or-block-name]
```

This wraps the shadcn CLI and **automatically restores the customised pill button styles** after installation. The shadcn CLI always overwrites `button.tsx` with defaults — this script fixes that.

If you install manually (`pnpm dlx shadcn@latest add ...`), run `pnpm restore-button` afterwards.

Components install to `src/components/ui/`. Blocks (larger pre-built sections) install to `src/components/`. The shadcnblocks API key is configured in `components.json`.

## Converting blocks from React to Astro

shadcn blocks install as React `.tsx` files, but **most blocks don't need React hydration** — they're purely static content (text, images, links, CSS hover effects). These should be converted to Astro `.astro` components. This is critical for two reasons:

1. **Image optimisation** — Astro's `<Image>` component (from `astro:assets`) provides responsive `srcset`, automatic WebP conversion via Sharp, and proper `loading`/`fetchpriority` attributes. React `<img>` tags bypass this entirely — images ship unoptimised at full size.

2. **Zero JavaScript** — Static content rendered as an Astro component ships no JS to the browser. A React island for the same content ships the React runtime + component code, hydrates on load, and adds to bundle size for no benefit.

**Rule of thumb:** If a block has no `useState`, `useEffect`, event handlers, or React-specific interactivity — convert it to Astro.

### How to convert

1. Install the block: `pnpm shadcn:add @shadcnblocks/block-name`
2. Create a new `.astro` file with the same name (e.g. `hero206.astro`)
3. Move the markup from JSX to Astro template syntax:
   - `className` → `class`
   - `{cn("...", className)}` → `{cn("...", className)}` (works the same — `cn()` is plain TypeScript)
   - React `<img>` → Astro `<Image>` with `src` accepting `ImageMetadata` (imported image objects)
   - `React.Fragment` / `<>` → Astro fragments work the same way
   - lucide-react icons → inline SVG (Astro can't hydrate React icon components without `client:*`)
   - React `Button` → `@components/astro-ui/Button.astro` (same `buttonVariants` source, no JS)
4. Update props interface to use Astro conventions (`class?` instead of `className?`, `ImageMetadata` instead of `string` for images)
5. Delete the `.tsx` file
6. Update page imports — remove `client:load`/`client:visible` directives (Astro components don't need them)

### Example: passing images correctly

```astro
---
// In the page (e.g. src/pages/index.astro)
import Hero from "@components/hero.astro";
import heroImage from "@assets/images/hero.jpg";
---

<!-- Pass the ImageMetadata object, NOT .src -->
<Hero image={heroImage} />
```

```astro
---
// In the component (e.g. src/components/hero.astro)
import { Image } from "astro:assets";
import type { ImageMetadata } from "astro";

interface Props {
  image: ImageMetadata;
}

const { image } = Astro.props;
---

<Image
  src={image}
  alt="Hero"
  widths={[640, 1024, 1920]}
  sizes="(max-width: 1280px) 100vw, 1280px"
  loading="eager"
  fetchpriority="high"
  class="w-full object-cover"
/>
```

Sharp generates multiple WebP variants at the specified widths. The browser picks the best size for the viewport.

### What stays as React

The default pages (home, blog, contact, privacy) ship **zero React JS**. The navbar, footer, and contact form are all native Astro components with inline `<script>` tags for interactivity.

Only use React `.tsx` islands when you genuinely need React-specific features:

- **Accordion, Tabs, Dialog** — shadcn/ui components with open/close state (use via astro-ui wrappers)
- **Custom interactive widgets** — complex state management, animations, or third-party React libraries

The astro-ui Button wrapper imports `buttonVariants` from the same `button.tsx`, so button styling is always a single source of truth regardless of whether you use the React or Astro version.

## Useful CLI commands

```bash
pnpm dlx shadcn@latest add -a                    # Install ALL components
pnpm dlx shadcn@latest view button card           # Preview before installing
pnpm dlx shadcn@latest search @shadcn -q "form"   # Search components
pnpm dlx shadcn@latest list @shadcnblocks          # List available blocks
pnpm dlx shadcn@latest add button -o               # Overwrite existing
```

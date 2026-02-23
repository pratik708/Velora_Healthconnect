# Astro Starter Template

Built and maintained by **CJ&CO** — a digital marketing agency based in Australia.

## Purpose

This is our internal starter template for building client websites. It's designed to be duplicated for every new project, giving us (and our AI agents) a production-ready foundation with zero setup friction.

The goal: update a few config files with the client's details, set the brand colours and fonts, then immediately start building pages. SEO, accessibility, performance, image optimisation, contact forms, analytics, and email delivery are all pre-configured and ready to go.

## What's Included

- **Astro 5** with static site generation and View Transitions
- **Tailwind CSS v4** (CSS-first config, no JS config file)
- **shadcn/ui** component library with Astro wrappers for zero-JS rendering
- **Self-hosted Google Fonts** via Astro's experimental Fonts API
- **Contact form** with spam prevention (honeypot + timing + token), UTM tracking, and conversion events
- **PHP/AWS SES email backend** with professional HTML email templates
- **Analytics config** for GTM, GA4, and Meta Pixel (empty = nothing output)
- **Pre-launch audit script** that checks for placeholders, SEO issues, broken links, accessibility problems, and performance concerns
- **Comprehensive CLAUDE.md** with an 8-step build playbook and full reference guide for AI agents

## Quick Start

```bash
pnpm install
pnpm dev
```

See `CLAUDE.md` for the full build playbook and detailed documentation.

## Commands

| Command           | Action                                                     |
| :---------------- | :--------------------------------------------------------- |
| `pnpm dev`        | Start dev server at `localhost:4321`                       |
| `pnpm build`      | Type check + production build                              |
| `pnpm preview`    | Preview production build locally                           |
| `pnpm lint`       | ESLint check                                               |
| `pnpm format`     | Prettier format all files                                  |
| `pnpm knip`       | Detect unused files, exports, and dependencies             |
| `pnpm prelaunch`  | Pre-launch audit on existing build                         |
| `pnpm shadcn:add` | Install shadcn component/block (auto-restores pill button) |

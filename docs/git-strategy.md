# Git Strategy

> Referenced from CLAUDE.md. Read this when setting up a new project or onboarding team members.

## Branching Model

```
main (production)     ← deployed to live site
  └── staging         ← deployed to preview URL for review
        └── feature/* ← individual work branches
```

| Branch      | Purpose                              | Deploys To          | Who Merges         |
| ----------- | ------------------------------------ | ------------------- | ------------------ |
| `main`      | Production — the live site           | Production URL      | Dev (after review) |
| `staging`   | Review — copywriter checks here      | Preview URL         | Dev                |
| `feature/*` | Individual tasks (pages, fixes, etc) | PR preview (if any) | Dev → staging      |

## Setup (Per Project)

1. The duplicated starter template starts on `main`
2. Create the `staging` branch:
   ```bash
   git checkout -b staging
   git push -u origin staging
   ```
3. Configure hosting (Netlify/Vercel/Cloudflare Pages):
   - **Production branch**: `main` → deploys to `clientsite.com.au`
   - **Preview branch**: `staging` → deploys to `staging.clientsite.com.au` (or auto-generated preview URL)
   - Enable branch deploy previews for PRs (optional but useful)
4. Share the staging preview URL with the copywriter

## Daily Workflow

### Dev Building Pages

```bash
git checkout staging
git checkout -b feature/homepage

# ... build the page ...

git add src/pages/index.astro src/components/hero.astro
git commit -m "Build homepage with hero and features sections"
git push -u origin feature/homepage

# Merge to staging for review
git checkout staging
git merge feature/homepage
git push
```

Or use PRs into `staging` if you want a review step before merging.

### Copywriter Reviewing

1. Open the staging preview URL in the browser
2. Review copy, headings, CTAs, and overall flow
3. Provide feedback through the agreed channel (ClickUp, email, Slack, etc.)

**If the copywriter edits files directly** (e.g. via GitHub web editor or local clone):

```bash
git checkout staging
# Edit content files (pages, blog posts, data files)
git add -A
git commit -m "Update homepage copy and CTA text"
git push
```

The staging preview URL rebuilds automatically.

**If the copywriter doesn't use git**, the dev makes changes based on their feedback and pushes to staging for re-review.

### Pushing to Production

Once the copywriter approves the staging preview:

```bash
git checkout main
git merge staging
git push
```

This triggers a production deploy. The live site updates.

## Branch Rules

- **Never push directly to `main`** — always go through `staging` first
- **Never force push to `main` or `staging`** — this destroys history
- **Feature branches are short-lived** — merge to staging within a day or two, then delete
- **`staging` is the single review gate** — if it looks good on staging, it's ready for production

## Commit Messages

Keep them descriptive and in imperative mood:

```
Build about page with team section and values
Update homepage hero copy per client feedback
Fix mobile nav not closing on link click
Add blog post: 5 tips for choosing a plumber
Configure GA4 and Meta Pixel tracking
```

No need for conventional commit prefixes (`feat:`, `fix:`) unless the team prefers them.

## Handling Conflicts

If `staging` and a feature branch diverge:

```bash
git checkout feature/my-branch
git merge staging
# Resolve conflicts
git commit
git push
```

Always merge staging INTO your feature branch (not the other way around) to keep staging stable.

## Content vs Code Changes

| Change Type        | Who        | Branch               | Example                                |
| ------------------ | ---------- | -------------------- | -------------------------------------- |
| New page/component | Dev        | feature/\* → staging | Building the services page             |
| Copy updates       | Copywriter | staging              | Fixing headlines, rewriting paragraphs |
| Bug fixes          | Dev        | feature/\* → staging | Fixing broken link, layout issue       |
| Blog posts         | Copywriter | staging              | Adding new .md files to content/blog/  |
| Config changes     | Dev        | feature/\* → staging | Analytics IDs, site.ts updates         |
| Asset updates      | Either     | staging              | Replacing images, updating favicon     |

Copywriters work directly on `staging` for content-only changes. Devs use feature branches for code changes to avoid breaking the staging preview.

## Pre-Production Checklist

Before merging `staging` → `main`:

```bash
git checkout staging
pnpm build          # Must pass clean
pnpm knip           # No dead code
pnpm prelaunch      # All checks pass
```

Only merge to production if all checks pass with zero errors.

## Multiple Sites

Each client site is its own repository (duplicated from the starter template). There is no monorepo. Each repo follows this same branching strategy independently.

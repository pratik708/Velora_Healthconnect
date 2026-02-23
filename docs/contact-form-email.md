# Contact Form & Email

## Architecture Overview

The form system has three layers:

1. **UTM Capture** (`src/lib/tracking.ts` + `BaseLayout.astro`) — runs on every page, persists ad attribution data
2. **Astro Form** (`src/components/contact-form.astro`) — static HTML + inline `<script>` for validation, spam checks, and conversion tracking (no React)
3. **PHP Backend** (`public/api/contact.php`) — validates server-side, sends email via AWS SES

## Form Submission Flow

```
User lands on site (e.g. from a Meta ad with UTMs)
  → BaseLayout script captures UTM params → stored in localStorage (30-day expiry)

User navigates to /contact and fills out the form
  → On submit, inline script:
    1. Checks honeypot field (if filled → fake success, abort)
    2. Checks timing (if < 3 seconds since page load → fake success, abort)
    3. Appends spam prevention token + timestamp to FormData
    4. Appends stored UTM data to FormData
    5. POSTs FormData to /api/contact.php

  → PHP handler:
    1. Re-validates honeypot, token, and timing server-side
    2. Sanitises all input fields
    3. Validates required fields (name, email, message)
    4. Builds HTML email with contact details, message, and attribution data
    5. Sends via PHPMailer → AWS SES SMTP
    6. Returns JSON { success: true/false, message: "..." }

  → On success response, inline script:
    1. Fires Google Ads Enhanced Conversion (gtag + dataLayer)
    2. Fires Meta Pixel Lead event (fbq)
    3. Redirects to /thanks page
```

## Form Fields

**Visible fields:** Name (required), Phone, Email (required), Message (required)

**Appended at submit time (via JavaScript, not hidden DOM inputs):**

- `_token` — spam prevention hash
- `_ts` — timestamp when form loaded
- `_source` — page pathname
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`
- `gclid`, `fbclid`
- `_landing_page` — original landing page URL

## Spam Prevention (3 layers)

| Layer    | Client-side                                             | Server-side                                             |
| -------- | ------------------------------------------------------- | ------------------------------------------------------- |
| Honeypot | Hidden `company_url` field positioned offscreen via CSS | Checks `$_POST['company_url']` — if filled, fake 200    |
| Token    | `generateFormToken(timestamp)` in `tracking.ts`         | `generateToken($timestamp)` in PHP — must match exactly |
| Timing   | Rejects if `Date.now() - loadedAt < 3000ms`             | Rejects if `time() - $_POST['_ts']` is < 3s or > 3600s  |

All spam rejections return `{ success: true }` to avoid revealing detection to bots.

The token is a deterministic hash of the Unix timestamp + a shared salt (`starter_form_2025`). Both the TypeScript and PHP implementations must produce identical output. If you change the salt in one, update the other.

## UTM Tracking

**Capture:** A script in `BaseLayout.astro` calls `captureUTMParams()` on every `astro:page-load` event (works with View Transitions). It reads UTM params from the URL query string and stores them in localStorage under the key `utm_data`.

**Storage:** localStorage with a `captured_at` timestamp. Data expires after 30 days — `getStoredUTMParams()` checks the age and clears stale data.

**Tracked parameters:**

| Param          | Source                               |
| -------------- | ------------------------------------ |
| `utm_source`   | Ad platform (facebook, google, etc.) |
| `utm_medium`   | Traffic type (cpc, email, organic)   |
| `utm_campaign` | Campaign name                        |
| `utm_content`  | Ad creative variant                  |
| `utm_term`     | Keyword (Google Ads)                 |
| `gclid`        | Google Click ID                      |
| `fbclid`       | Facebook Click ID                    |
| `landing_page` | Full URL of first page hit           |
| `referrer`     | `document.referrer`                  |

**Form integration:** On submit, the inline script reads stored UTM data and appends each non-empty value to the `FormData` object. The PHP handler includes this data in the lead notification email under an "Attribution Data" section.

**Testing UTMs locally:**

```
http://localhost:4321/?utm_source=facebook&utm_medium=cpc&utm_campaign=test&fbclid=abc123
```

Then check DevTools → Application → Local Storage → `utm_data`.

## Conversion Tracking

Conversion events fire client-side after a successful form submission (PHP returns `{ success: true }`). All tracking is in `fireConversionEvents()` in `src/lib/tracking.ts`.

**Google Ads Enhanced Conversions:**

```javascript
// Sets user data for Enhanced Conversions matching
gtag("set", "user_data", {
  email: "user@example.com",
  phone_number: "+61412345678", // Australian E.164 format
  address: { first_name: "john", last_name: "smith", country: "AU" },
});
gtag("event", "generate_lead", {
  event_category: "form",
  event_label: "/contact",
});
```

Also pushes to `window.dataLayer` for GTM-based setups:

```javascript
dataLayer.push({
  event: "generate_lead",
  form_id: "contact",
  form_source: "/contact",
  user_data: { email_address, phone_number, first_name, last_name },
});
```

**Meta Pixel:**

```javascript
fbq("track", "Lead", {
  content_name: "/contact",
  content_category: "Contact Form",
  value: 0,
  currency: "AUD",
});
```

Meta's Advanced Matching picks up user data if the pixel is initialised with it on the page. For server-side Meta CAPI, the UTM data (especially `fbclid`) enables offline conversion matching.

**Phone normalisation:** Australian numbers are converted to E.164 (`0412 345 678` → `+61412345678`) before being sent to tracking platforms.

**Prerequisites:** These events only fire if `gtag`/`fbq` are loaded on the page. Add Google Tag or Meta Pixel scripts to `BaseLayout.astro` (or via GTM) for production sites.

## Email Sending (AWS SES)

Emails are sent via `public/api/contact.php` using PHPMailer with AWS SES SMTP. **This requires PHP-capable hosting** — it will not work during `pnpm dev` (Astro's dev server is Node.js).

The PHP handler automatically converts the IAM secret key to an SES SMTP password at runtime (no manual conversion needed). It also loads `.env` variables from the project root as a fallback if server environment variables aren't set.

**Email format:** Professional HTML template with:

- Blue gradient header with "New Lead" label and date
- Contact details table (name, email, phone with clickable links)
- Message in a styled blockquote
- "Reply to Lead" and "Call Now" action buttons
- Attribution data footer (UTM params, landing page, source page, timestamp)
- Plain text fallback for email clients that don't render HTML

**Environment variables (`.env`):**

| Variable          | Purpose                                                           |
| ----------------- | ----------------------------------------------------------------- |
| `SES_SMTP_HOST`   | SES endpoint (default: `email-smtp.ap-southeast-2.amazonaws.com`) |
| `SES_SMTP_USER`   | IAM access key ID                                                 |
| `SES_SMTP_PASS`   | IAM secret key (auto-converted to SMTP password by PHP)           |
| `MAIL_FROM_EMAIL` | Verified SES sender address (must be verified in SES console)     |
| `MAIL_FROM_NAME`  | Sender display name (e.g. "Site Name")                            |
| `MAIL_TO_EMAIL`   | Where lead notifications are sent                                 |
| `MAIL_TO_NAME`    | Recipient display name                                            |

## Adding Forms to Other Pages

To add a contact form to a new page, import the Astro component:

```astro
---
import ContactForm from "@components/contact-form.astro";
---

<ContactForm />
```

The UTM data, spam prevention, and conversion tracking are all self-contained — they work automatically on any page. No `client:*` directive needed since it's a native Astro component.

For custom forms (e.g. quote request, newsletter), create a new `.astro` component following the same pattern as `contact-form.astro`:

1. Set `loadedAt`, UTM data, and spam token at script init time
2. Append values to `FormData` in the submit handler
3. Call `fireConversionEvents()` on success
4. Re-init on `astro:after-swap` for View Transitions support
5. Add the new form type to `contact.php` if needed (it already validates name + email + message)

## Key Files

| File                                | Purpose                                                        |
| ----------------------------------- | -------------------------------------------------------------- |
| `src/lib/tracking.ts`               | UTM capture/storage, spam token generation, conversion events  |
| `src/components/contact-form.astro` | Contact form UI, client-side validation, submit handler        |
| `src/layouts/BaseLayout.astro`      | UTM capture script (runs on every page via `astro:page-load`)  |
| `public/api/contact.php`            | Server-side spam validation, field sanitisation, email sending |
| `public/api/PHPMailer/`             | PHPMailer library (PHPMailer.php, SMTP.php, Exception.php)     |
| `.env`                              | AWS SES credentials and mail recipient settings                |

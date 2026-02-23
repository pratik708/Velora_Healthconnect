// =============================================================================
// UTM Parameter Capture & Storage
// =============================================================================

const UTM_STORAGE_KEY = "utm_data";
const UTM_EXPIRY_DAYS = 30;

interface UTMData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  gclid?: string;
  fbclid?: string;
  landing_page?: string;
  referrer?: string;
  captured_at: number;
}

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "fbclid",
] as const;

export function captureUTMParams(): void {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);
  const data: Partial<UTMData> = {};
  let hasParams = false;

  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value) {
      data[key] = value;
      hasParams = true;
    }
  }

  if (!hasParams) return;

  data.landing_page = window.location.origin + window.location.pathname;
  data.referrer = document.referrer || undefined;
  data.captured_at = Date.now();

  try {
    localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage unavailable
  }
}

export function getStoredUTMParams(): Partial<UTMData> {
  if (typeof window === "undefined") return {};

  try {
    const stored = localStorage.getItem(UTM_STORAGE_KEY);
    if (!stored) return {};

    const data: UTMData = JSON.parse(stored);
    const expiryMs = UTM_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

    if (Date.now() - data.captured_at > expiryMs) {
      localStorage.removeItem(UTM_STORAGE_KEY);
      return {};
    }

    return data;
  } catch {
    return {};
  }
}

// =============================================================================
// Spam Prevention Token
// Must match the PHP implementation in public/api/contact.php
// =============================================================================

export function generateFormToken(timestamp: number): string {
  const salt = "starter_form_2025";
  const data = `${timestamp}_${salt}`;

  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }

  const base = Math.abs(hash).toString(36);
  const check = (timestamp % 9973).toString(36);
  return `${base}_${check}`;
}

// =============================================================================
// Phone Number Normalisation (Australian E.164)
// =============================================================================

function normalisePhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-().]/g, "");
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    return "+61" + cleaned.substring(1);
  }
  return cleaned;
}

// =============================================================================
// Conversion Events
// =============================================================================

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
    fbq: (...args: unknown[]) => void;
    gtag: (...args: unknown[]) => void;
  }
}

interface ConversionData {
  name: string;
  email: string;
  phone: string;
  formSource?: string;
}

export function fireConversionEvents(data: ConversionData): void {
  if (typeof window === "undefined") return;

  const [firstName, ...lastParts] = data.name.trim().split(" ");
  const lastName = lastParts.join(" ");
  const normalisedPhone = normalisePhone(data.phone);
  const email = data.email.toLowerCase().trim();
  const formSource = data.formSource || window.location.pathname;

  // --- Google Ads Enhanced Conversions via gtag ---
  if (typeof window.gtag === "function") {
    window.gtag("set", "user_data", {
      email: email,
      phone_number: normalisedPhone,
      address: {
        first_name: firstName?.toLowerCase().trim(),
        last_name: lastName?.toLowerCase().trim(),
        country: "AU",
      },
    });

    window.gtag("event", "generate_lead", {
      event_category: "form",
      event_label: formSource,
    });
  }

  // --- DataLayer push for GTM-based setups ---
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: "generate_lead",
    form_id: "contact",
    form_source: formSource,
    user_data: {
      email_address: email,
      phone_number: normalisedPhone,
      first_name: firstName?.toLowerCase().trim(),
      last_name: lastName?.toLowerCase().trim(),
    },
  });

  // --- Meta Pixel Lead Event with Advanced Matching ---
  if (typeof window.fbq === "function") {
    window.fbq("track", "Lead", {
      content_name: formSource,
      content_category: "Contact Form",
      value: 0,
      currency: "AUD",
    });
  }
}

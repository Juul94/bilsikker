import * as cheerio from "cheerio";

import {
  ALLOWED_AD_HOSTS,
  FETCH_TIMEOUT_MS,
  MAX_RAW_TEXT_CHARS,
  MIN_USABLE_CONTENT_CHARS,
} from "@/lib/config";
import type { AdData } from "@/types/analysis";

export type UrlValidation =
  | { ok: true; url: string }
  | { ok: false; reason: string };

/**
 * Validates an ad URL. Only http/https on the allow-listed ad hosts are
 * accepted — this keeps the MVP scoped to DBA/Bilbasen and mitigates SSRF.
 */
export function validateAdUrl(input: string): UrlValidation {
  let parsed: URL;
  try {
    parsed = new URL(input.trim());
  } catch {
    return { ok: false, reason: "Linket er ikke en gyldig URL." };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, reason: "Kun http- og https-links understøttes." };
  }

  const host = parsed.hostname.toLowerCase();
  const allowed = ALLOWED_AD_HOSTS.some(
    (h) => host === h || host.endsWith(`.${h}`)
  );
  if (!allowed) {
    return {
      ok: false,
      reason:
        "Lige nu understøtter vi kun links fra DBA og Bilbasen. Slå i stedet bilen op på nummerplade.",
    };
  }

  return { ok: true, url: parsed.toString() };
}

export interface FetchResult {
  success: boolean;
  data?: AdData;
  /**
   * True when the marketplace answered with a bot-protection / challenge page
   * (AWS WAF, Cloudflare) instead of the real ad. The caller can use this to
   * steer the user towards the official nummerplade lookup.
   */
  blocked?: boolean;
}

/**
 * Detects the lightweight challenge pages served by AWS WAF and Cloudflare bot
 * protection. Those pages are tiny and carry very specific markers, so we keep a
 * generous size guard to avoid false positives on real (large) ad pages.
 */
function looksLikeBotChallenge(html: string): boolean {
  if (html.length > 60_000) return false;
  return /awsWafCookieDomainList|gokuProps|aws-waf-token|challenge-platform|cf-chl|Just a moment|Checking your browser/i.test(
    html
  );
}

/**
 * Fetches and extracts ad content from an allow-listed URL. Never throws —
 * a failed, blocked, or thin fetch returns `{ success: false }` so the caller
 * can ask the user for a nummerplade instead.
 */
export async function fetchAdContent(url: string): Promise<FetchResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "da,en;q=0.8",
      },
    });

    // Bot-protection gateways answer automated requests with a challenge page.
    // 202 (AWS WAF) and 403/429/503 (Cloudflare/rate-limits) are the usual
    // statuses; flag them so the caller can fall back to the register lookup.
    if (res.status === 202 || [403, 429, 503].includes(res.status)) {
      return { success: false, blocked: true };
    }
    if (!res.ok) return { success: false };

    const contentType = res.headers.get("content-type") ?? "";
    if (
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml")
    ) {
      return { success: false };
    }

    const html = await res.text();
    if (looksLikeBotChallenge(html)) {
      return { success: false, blocked: true };
    }

    const data = extractAdFromHtml(html, url);

    const usable =
      (data.rawText?.length ?? 0) >= MIN_USABLE_CONTENT_CHARS ||
      Boolean(data.title && (data.price || data.mileage));

    return { success: usable, data };
  } catch {
    return { success: false };
  } finally {
    clearTimeout(timeout);
  }
}

/** Parses raw HTML into structured ad data using meta tags, JSON-LD and text heuristics. */
export function extractAdFromHtml(html: string, url: string): AdData {
  const $ = cheerio.load(html);

  // 1. JSON-LD structured data (parsed before we strip <script> tags).
  const ld: Partial<AdData> = {};
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw) return;
    try {
      walkJsonLd(JSON.parse(raw), ld);
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  });

  // 2. Meta tags and headings.
  const ogTitle = $('meta[property="og:title"]').attr("content")?.trim();
  const ogDesc = $('meta[property="og:description"]').attr("content")?.trim();
  const metaDesc = $('meta[name="description"]').attr("content")?.trim();
  const docTitle = $("title").first().text().trim();
  const h1 = $("h1").first().text().trim();

  // 3. Visible body text (strip non-content nodes only). We append a space to
  //    every element first so adjacent labels and values from spec lists
  //    (e.g. "Modelår" + "1967") don't get glued together into "Modelår1967"
  //    when Cheerio concatenates sibling text nodes — that breaks both our
  //    heuristics and the model's ability to read the values.
  $("script, style, noscript, svg, iframe, template").remove();
  $("body *").each((_, el) => {
    $(el).append(" ");
  });
  const rawText = cleanText($("body").text()).slice(0, MAX_RAW_TEXT_CHARS);

  const title = firstNonEmpty(ld.title, ogTitle, h1, docTitle);
  const description = firstNonEmpty(ld.description, ogDesc, metaDesc);

  const haystack = `${title ?? ""}\n${rawText}`;
  const price = ld.price ?? guessPrice(haystack);
  const mileage = ld.mileage ?? guessMileage(haystack);
  const year = ld.year ?? guessYear(title, haystack);
  const regNumber = guessRegNumber(haystack);
  const vin = guessVin(haystack);

  return {
    url,
    title,
    price,
    mileage,
    year,
    regNumber,
    vin,
    description,
    rawText: rawText || undefined,
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/** Recursively scans JSON-LD nodes for vehicle/offer fields. */
function walkJsonLd(node: unknown, out: Partial<AdData>, depth = 0): void {
  if (node == null || depth > 6) return;

  if (Array.isArray(node)) {
    for (const child of node) walkJsonLd(child, out, depth + 1);
    return;
  }
  if (!isRecord(node)) return;

  if (!out.title && typeof node.name === "string") {
    const name = node.name.trim();
    if (name.length > 3 && name.length <= 200) out.title = name;
  }

  if (!out.description && typeof node.description === "string") {
    const desc = node.description.trim();
    if (desc) out.description = desc;
  }

  if (!out.price) {
    const offers = isRecord(node.offers) ? node.offers : undefined;
    const priceSpec = isRecord(node.priceSpecification)
      ? node.priceSpecification
      : undefined;
    const price = node.price ?? offers?.price ?? priceSpec?.price;
    if (typeof price === "string" || typeof price === "number") {
      const currency =
        node.priceCurrency ?? offers?.priceCurrency ?? priceSpec?.priceCurrency;
      out.price = `${price} ${
        typeof currency === "string" ? currency : "DKK"
      }`.trim();
    }
  }

  if (!out.mileage) {
    const m = node.mileageFromOdometer;
    if (isRecord(m) && (typeof m.value === "string" || typeof m.value === "number")) {
      const unit = m.unitCode === "SMI" ? "mi" : "km";
      out.mileage = `${m.value} ${unit}`;
    } else if (typeof m === "string" || typeof m === "number") {
      out.mileage = `${m} km`;
    }
  }

  if (!out.year) {
    const y =
      node.modelDate ??
      node.productionDate ??
      node.vehicleModelDate ??
      node.releaseDate;
    if (typeof y === "string" || typeof y === "number") {
      const match = String(y).match(/\b(?:19|20)\d{2}\b/);
      if (match) out.year = match[0];
    }
  }

  for (const key of Object.keys(node)) {
    const value = node[key];
    if (value && typeof value === "object") walkJsonLd(value, out, depth + 1);
  }
}

function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    if (value && value.trim()) return value.trim();
  }
  return undefined;
}

function cleanText(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function guessPrice(text: string): string | undefined {
  const match =
    text.match(
      /(\d{1,3}(?:[.\s]\d{3})+|\d{4,7})\s*(?:kr\.?|,-|DKK)/i
    ) ?? text.match(/(?:kr\.?|DKK)\s*(\d{1,3}(?:[.\s]\d{3})+|\d{4,7})/i);
  if (!match) return undefined;

  const value = Number(match[1].replace(/[.\s]/g, ""));
  if (!Number.isFinite(value) || value < 1000 || value > 5_000_000) {
    return undefined;
  }
  return `${value.toLocaleString("da-DK")} kr.`;
}

function guessMileage(text: string): string | undefined {
  const match = text.match(/(\d{1,3}(?:[.\s]\d{3})+|\d{2,7})\s*km\b/i);
  if (!match) return undefined;

  const value = Number(match[1].replace(/[.\s]/g, ""));
  if (!Number.isFinite(value) || value < 1 || value > 1_000_000) {
    return undefined;
  }
  return `${value.toLocaleString("da-DK")} km`;
}

function guessYear(title: string | undefined, text: string): string | undefined {
  const currentYear = new Date().getFullYear();
  const inRange = (value: string): boolean => {
    const year = Number(value);
    return year >= 1900 && year <= currentYear + 1;
  };

  // An explicit spec label followed by an (optionally dated) 4-digit year, e.g.
  // DBA's "Modelår 1967", "Årgang 1998" or "1. registrering 01.07.1967".
  const labelled = text.match(
    /(?:modelår|modelaar|årgang|aargang|reg(?:istrering)?\.?\s*år|1\.?\s*reg(?:istrering)?\.?)\s*[:.]?\s*(?:\d{1,2}[./-]\d{1,2}[./-])?((?:18|19|20)\d{2})\b/i
  );
  if (labelled && inRange(labelled[1])) return labelled[1];

  // Fall back to a 4-digit year in the ad title (e.g. "Ford Mustang - 1967").
  const fromTitle = title?.match(/\b((?:18|19|20)\d{2})\b/);
  if (fromTitle && inRange(fromTitle[1])) return fromTitle[1];

  return undefined;
}

/**
 * Extracts a Danish registration number (nummerplade: 2 letters + 5 digits).
 * Prefers a value next to an explicit label to avoid false positives, then
 * falls back to a bare uppercase plate pattern.
 */
export function guessRegNumber(text: string): string | undefined {
  const labelled = text.match(
    /(?:registreringsnummer|reg(?:istrerings)?\.?\s*nr\.?|nummerplade)\s*[:.]?\s*([A-Z]{2})\s?(\d{5})\b/i
  );
  if (labelled) return `${labelled[1].toUpperCase()}${labelled[2]}`;

  const bare = text.match(/\b([A-Z]{2})\s?(\d{5})\b/);
  if (bare) return `${bare[1]}${bare[2]}`;

  return undefined;
}

/**
 * Extracts a chassis number (stelnummer / VIN). Modern VINs are 17 chars; older
 * cars use shorter numbers, so we accept 11-17 chars after an explicit label and
 * only fall back to the strict 17-char pattern when unlabelled.
 */
export function guessVin(text: string): string | undefined {
  const labelled = text.match(
    /(?:stelnummer|stelnr\.?|vin)\s*[:.]?\s*([A-HJ-NPR-Z0-9]{11,17})\b/i
  );
  if (labelled) return labelled[1].toUpperCase();

  const bare = text.match(/\b([A-HJ-NPR-Z0-9]{17})\b/);
  if (bare) return bare[1].toUpperCase();

  return undefined;
}

/**
 * Central configuration for BilSikker.
 * Values can be overridden via environment variables where it makes sense.
 */

/** OpenAI model used for the analysis. Must support Structured Outputs. */
export const OPENAI_MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-4o";

/**
 * Hosts we are allowed to fetch ad content from. Restricting this both keeps
 * the MVP focused on DBA/Bilbasen and mitigates SSRF (only known car-ad sites).
 */
export const ALLOWED_AD_HOSTS = ["dba.dk", "bilbasen.dk"] as const;

/** Abort the remote fetch if the ad page takes too long to respond. */
export const FETCH_TIMEOUT_MS = 12_000;

/** Upper bound on how much raw page text we forward to the model. */
export const MAX_RAW_TEXT_CHARS = 12_000;

/**
 * If we extract fewer usable characters than this from a link, we treat the
 * extraction as failed and ask the user to paste the ad text manually.
 */
export const MIN_USABLE_CONTENT_CHARS = 220;

/**
 * Synsbasen API — licensed access to official Danish vehicle data (Motorstyrelsen
 * / Færdselsstyrelsen / Tinglysningen). Optional: when the key is absent, the
 * register-based enrichment is silently skipped and we fall back to ad-only
 * analysis. This is the legal alternative to scraping aggregator sites.
 */
export const SYNSBASEN_API_KEY = process.env.SYNSBASEN_API_KEY?.trim() || "";

export const SYNSBASEN_BASE_URL =
  process.env.SYNSBASEN_BASE_URL?.trim() || "https://api.synsbasen.dk/v1";

/** Abort the Synsbasen lookup if it takes too long, so it never blocks analysis. */
export const SYNSBASEN_TIMEOUT_MS = 10_000;

/**
 * Tinglysning (restgæld/pant) lookups cost tokens and require a paid plan or an
 * uploaded OCES3 certificate, so they are opt-in. Without it we still get the
 * official vehicle identity plus syn- and km-history.
 */
export const SYNSBASEN_ENABLE_TINGLYSNING =
  (process.env.SYNSBASEN_ENABLE_TINGLYSNING ?? "").toLowerCase() === "true";

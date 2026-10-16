import { NextResponse } from "next/server";

import { MAX_RAW_TEXT_CHARS } from "@/lib/config";
import { analyzeCar, MissingApiKeyError } from "@/lib/openai";
import type {
  AdData,
  AnalyzeContext,
  AnalyzeErrorCode,
  AnalyzeErrorResponse,
  AnalyzeFullResponse,
  VehicleRegister,
} from "@/types/analysis";

// OpenAI requires the Node.js runtime (not Edge).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function jsonError(
  code: AnalyzeErrorCode,
  message: string,
  status: number
): NextResponse<AnalyzeErrorResponse> {
  return NextResponse.json<AnalyzeErrorResponse>(
    { ok: false, code, message },
    { status }
  );
}

/**
 * Paid step: runs the AI buy-advice. The client sends back the context it
 * received from the free `/api/analyze` step, so we neither re-scrape the ad
 * nor re-charge the register lookup.
 *
 * TODO(payment): gate this behind real payment verification and rate limiting
 * before launch. For the MVP the client simply asserts it has paid, so the
 * input is clamped to bound prompt size but the call is otherwise open.
 */
export async function POST(req: Request): Promise<NextResponse> {
  let body: Partial<AnalyzeContext>;
  try {
    body = (await req.json()) as Partial<AnalyzeContext>;
  } catch {
    return jsonError("INVALID_INPUT", "Ugyldig forespørgsel.", 400);
  }

  if (!body.ad || typeof body.ad !== "object") {
    return jsonError("INVALID_INPUT", "Manglende bildata.", 400);
  }

  const ad = sanitizeAd(body.ad);
  const register = sanitizeRegister(body.register);

  try {
    const analysis = await analyzeCar(ad, register);
    const response: AnalyzeFullResponse = {
      ok: true,
      step: "full",
      analysis,
    };
    return NextResponse.json<AnalyzeFullResponse>(response);
  } catch (err) {
    if (err instanceof MissingApiKeyError) {
      return jsonError(
        "MISSING_API_KEY",
        "OpenAI API-nøgle mangler. Sæt OPENAI_API_KEY i .env.local og genstart serveren.",
        500
      );
    }
    console.error("[BilSikker] Analysefejl:", err);
    return jsonError(
      "OPENAI_ERROR",
      "Vi kunne ikke analysere bilen. Prøv igen om lidt.",
      502
    );
  }
}

function clamp(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

/** Clamps caller-supplied ad fields to bound the OpenAI prompt size. */
function sanitizeAd(ad: Partial<AdData>): AdData {
  return {
    url: clamp(ad.url, 2_000),
    title: clamp(ad.title, 300),
    price: clamp(ad.price, 100),
    mileage: clamp(ad.mileage, 100),
    year: clamp(ad.year, 20),
    regNumber: clamp(ad.regNumber, 20),
    vin: clamp(ad.vin, 40),
    description: clamp(ad.description, 6_000),
    equipment: clamp(ad.equipment, 4_000),
    rawText: clamp(ad.rawText, MAX_RAW_TEXT_CHARS),
  };
}

/** Passes register data through with bounded arrays and key strings. */
function sanitizeRegister(
  register: VehicleRegister | undefined
): VehicleRegister | undefined {
  if (!register || typeof register !== "object") return undefined;
  return {
    ...register,
    brand: clamp(register.brand, 100),
    model: clamp(register.model, 100),
    variant: clamp(register.variant, 200),
    specs: Array.isArray(register.specs) ? register.specs.slice(0, 30) : [],
    kpis: Array.isArray(register.kpis) ? register.kpis.slice(0, 12) : [],
    timeline: Array.isArray(register.timeline)
      ? register.timeline.slice(0, 50)
      : [],
    sources: Array.isArray(register.sources)
      ? register.sources.slice(0, 12)
      : [],
  };
}

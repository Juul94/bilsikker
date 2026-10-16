import { NextResponse } from "next/server";

import { fetchAdContent, validateAdUrl } from "@/lib/scraper";
import {
  isSynsbasenEnabled,
  lookupVehicleByRegistration,
  lookupVehicleByVin,
} from "@/lib/synsbasen";
import type {
  AdData,
  AnalyzeErrorCode,
  AnalyzeErrorResponse,
  AnalyzeNeedsPlateResponse,
  AnalyzeOverviewResponse,
  AnalyzeRequestBody,
  InputType,
  VehicleRegister,
} from "@/types/analysis";

// Cheerio requires the Node.js runtime (not Edge).
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

export async function POST(req: Request): Promise<NextResponse> {
  let body: Partial<AnalyzeRequestBody>;
  try {
    body = (await req.json()) as Partial<AnalyzeRequestBody>;
  } catch {
    return jsonError("INVALID_INPUT", "Ugyldig forespørgsel.", 400);
  }

  const inputType = body.inputType;
  if (inputType !== "link" && inputType !== "reg") {
    return jsonError("INVALID_INPUT", "Vælg en gyldig input-type.", 400);
  }

  return inputType === "reg" ? analyzeByReg(body) : analyzeByLink(body);
}

/**
 * Registration-only lookup: the user just typed a plate, so the official
 * register is our sole data source. Requires Synsbasen to be configured.
 */
async function analyzeByReg(
  body: Partial<AnalyzeRequestBody>
): Promise<NextResponse> {
  const reg = (body.regNumber ?? "").trim();
  if (!reg) {
    return jsonError("INVALID_INPUT", "Indtast en nummerplade.", 400);
  }
  if (!isSynsbasenEnabled()) {
    return jsonError(
      "EXTRACTION_FAILED",
      "Nummerplade-opslag er ikke tilgængeligt lige nu. Indsæt et annonce-link i stedet.",
      503
    );
  }

  let register: VehicleRegister | undefined;
  try {
    register = (await lookupVehicleByRegistration(reg)) ?? undefined;
  } catch {
    register = undefined;
  }

  if (!register) {
    return jsonError(
      "EXTRACTION_FAILED",
      `Vi kunne ikke finde en bil med nummerpladen "${reg.toUpperCase()}". Tjek pladen, eller brug et annonce-link.`,
      404
    );
  }

  return overviewResponse(adFromRegister(register), register, {
    inputType: "reg",
    extracted: false,
  });
}

/**
 * Link analysis: scrape the ad, then enrich with official register data when we
 * can find a plate. If none is found we ask the user for one (unless they have
 * opted out via `skipRegister`).
 */
async function analyzeByLink(
  body: Partial<AnalyzeRequestBody>
): Promise<NextResponse> {
  const rawUrl = (body.url ?? "").trim();
  if (!rawUrl) {
    return jsonError("INVALID_INPUT", "Indsæt et link til annoncen.", 400);
  }

  const validation = validateAdUrl(rawUrl);
  if (!validation.ok) {
    return jsonError("UNSUPPORTED_URL", validation.reason, 422);
  }

  // An explicit plate from the user (e.g. via the follow-up prompt) takes
  // priority over anything we might scrape.
  const userPlate = (body.regNumber ?? "").trim();
  const result = await fetchAdContent(validation.url);

  // The ad could not be read — usually because the marketplace (Bilbasen/DBA)
  // serves a bot-protection page to automated requests. Rather than dead-ending,
  // fall back to the official register, which is fully within the rules.
  if (!result.success || !result.data) {
    if (isSynsbasenEnabled()) {
      // The user already gave us a plate: skip the ad entirely and build the
      // overview straight from official data.
      if (userPlate) {
        const register = await lookupRegister({ regNumber: userPlate });
        if (register) {
          return overviewResponse(adFromRegister(register), register, {
            inputType: "link",
            url: validation.url,
            extracted: false,
          });
        }
        return jsonError(
          "EXTRACTION_FAILED",
          `Vi kunne hverken læse annoncen eller finde en bil med nummerpladen "${userPlate.toUpperCase()}". Tjek pladen og prøv igen.`,
          404
        );
      }

      // No plate yet: ask for one instead of failing outright.
      if (!body.skipRegister) {
        const response: AnalyzeNeedsPlateResponse = {
          ok: true,
          needsPlate: true,
          source: {
            inputType: "link",
            url: validation.url,
            extracted: false,
          },
        };
        return NextResponse.json<AnalyzeNeedsPlateResponse>(response);
      }
    }

    return jsonError(
      "EXTRACTION_FAILED",
      result.blocked
        ? "Annoncesiden blokerer automatisk indlæsning. Slå bilen op på nummerplade i stedet — så henter vi de officielle data."
        : "Vi kunne ikke hente nok indhold fra linket. Prøv et andet link, eller slå bilen op på nummerplade i stedet.",
      422
    );
  }

  const ad = result.data;

  // An explicit plate from the user takes priority over the scraped value.
  const plate = userPlate || ad.regNumber;
  if (plate) ad.regNumber = plate;

  // No plate, Synsbasen available, and the user hasn't opted out yet: ask for a
  // plate so we can build the free official overview.
  if (!plate && !body.skipRegister && isSynsbasenEnabled()) {
    const response: AnalyzeNeedsPlateResponse = {
      ok: true,
      needsPlate: true,
      source: {
        inputType: "link",
        url: ad.url,
        extracted: true,
        ad: adSummary(ad),
      },
    };
    return NextResponse.json<AnalyzeNeedsPlateResponse>(response);
  }

  const register = await lookupRegister(ad);
  return overviewResponse(ad, register, {
    inputType: "link",
    url: ad.url,
    extracted: true,
  });
}

/** Builds the free overview response (no AI) returned by both entry points. */
function overviewResponse(
  ad: AdData,
  register: VehicleRegister | undefined,
  meta: { inputType: InputType; url?: string; extracted: boolean }
): NextResponse {
  const response: AnalyzeOverviewResponse = {
    ok: true,
    step: "overview",
    source: {
      inputType: meta.inputType,
      url: meta.url,
      extracted: meta.extracted,
      ad: adSummary(ad),
      register,
    },
    context: {
      ad,
      register,
    },
  };

  return NextResponse.json<AnalyzeOverviewResponse>(response);
}

/** Builds a minimal ad payload from official register data for the reg-only flow. */
function adFromRegister(register: VehicleRegister): AdData {
  const title = [register.brand, register.model, register.variant]
    .filter(Boolean)
    .join(" ");

  return {
    title: title || undefined,
    year: register.modelYear?.toString(),
    mileage:
      typeof register.mileageLatest === "number"
        ? `${register.mileageLatest.toLocaleString("da-DK")} km`
        : undefined,
    regNumber: register.registration,
    vin: register.vin,
  };
}

/** Strips the bulky raw text before returning ad fields to the client. */
function adSummary(ad: AdData): Omit<AdData, "rawText"> {
  return {
    url: ad.url,
    title: ad.title,
    price: ad.price,
    mileage: ad.mileage,
    year: ad.year,
    regNumber: ad.regNumber,
    vin: ad.vin,
    description: ad.description,
    equipment: ad.equipment,
  };
}

/**
 * Best-effort official-register enrichment. Returns undefined when Synsbasen is
 * not configured, no identifier was found, or the lookup fails for any reason.
 */
async function lookupRegister(ad: AdData): Promise<VehicleRegister | undefined> {
  if (!isSynsbasenEnabled()) return undefined;
  try {
    if (ad.regNumber) {
      return (await lookupVehicleByRegistration(ad.regNumber)) ?? undefined;
    }
    if (ad.vin && ad.vin.length === 17) {
      return (await lookupVehicleByVin(ad.vin)) ?? undefined;
    }
  } catch {
    // Swallow — register data is an enhancement, not a requirement.
  }
  return undefined;
}

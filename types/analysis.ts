export type InputType = "link" | "reg";

/** Structured data extracted from an ad (link or pasted text). */
export interface AdData {
  url?: string;
  title?: string;
  price?: string;
  mileage?: string;
  year?: string;
  description?: string;
  equipment?: string;
  /** Danish registration number (nummerplade), e.g. "DM75963". */
  regNumber?: string;
  /** Vehicle identification / chassis number (stelnummer). */
  vin?: string;
  /** Cleaned, truncated raw text of the ad/page. */
  rawText?: string;
}

/** The car purchase assessment returned by the model. */
export interface CarAnalysis {
  score: number;
  summary: string;
  positives: string[];
  risks: string[];
  knownIssues: string[];
  priceEvaluation: string;
  sellerQuestions: string[];
  inspectionChecklist: string[];
  recommendation: string;
}

export interface AnalyzeRequestBody {
  inputType: InputType;
  url?: string;
  /** Registration number — the primary input on the "reg" tab, or an override for a link. */
  regNumber?: string;
  /** When a link has no plate, the user can choose to proceed without official data. */
  skipRegister?: boolean;
}

/** Strength of a single register-based health indicator. */
export type KpiStatus = "strong" | "ok" | "weak" | "unknown";

/** A condensed, at-a-glance health indicator derived from official register data. */
export interface RegisterKpi {
  /** Stable key, e.g. "inspections" | "mileage" | "debt" | "status". */
  key: string;
  /** Short Danish label, e.g. "Synshistorik". */
  label: string;
  status: KpiStatus;
  /** One-line plain-Danish explanation behind the status. */
  detail: string;
}

export type TimelineTone = "neutral" | "positive" | "warning";

/** A single point on the vehicle's official history timeline. */
export interface TimelineEvent {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  kind: "registration" | "inspection" | "status";
  title: string;
  detail?: string;
  tone: TimelineTone;
}

/** Which group a technical spec belongs to, used for grouping in the UI. */
export type SpecGroup = "engine" | "body" | "general";

/** A single display-ready technical fact, e.g. { label: "Hestekræfter", value: "366 hk" }. */
export interface RegisterSpec {
  label: string;
  value: string;
  group: SpecGroup;
}

/** Estimated recurring ownership tax (grøn ejerafgift / vægtafgift). */
export interface PeriodicTax {
  /** Primary tax type, e.g. "Grøn ejerafgift" or "Vægtafgift". */
  label: string;
  /** Estimated total per half-year in DKK. */
  amountHalfYear: number;
  /** Estimated total per year in DKK. */
  amountPerYear: number;
}

/**
 * Normalised vehicle data sourced from official Danish registers via the
 * Synsbasen API. No personal data (owner/creditor identities) is ever included.
 */
export interface VehicleRegister {
  registration?: string;
  vin?: string;
  brand?: string;
  model?: string;
  variant?: string;
  modelYear?: number;
  firstRegistration?: string;
  fuelType?: string;
  /** Body style, e.g. "Coupe" or "Stationcar". */
  bodyType?: string;
  /** Registered use, e.g. "Privat personkørsel". */
  usage?: string;
  /** Vehicle kind, e.g. "Personbil". */
  vehicleKind?: string;
  /** Age in whole years, derived from first registration. */
  ageYears?: number;
  /** Most recent odometer reading from an inspection, in km. */
  mileageLatest?: number;
  /** Register's average km/year. */
  mileageAnnualAverage?: number;
  registrationStatus?: string;
  nextInspection?: string;
  /** Display-ready technical specs (engine, body, weight). */
  specs: RegisterSpec[];
  /** Estimated recurring ownership tax, when available. */
  periodicTax?: PeriodicTax;
  /** Condensed health indicators for the quick overview. */
  kpis: RegisterKpi[];
  /** Chronological history for the "Tidslinje" view. */
  timeline: TimelineEvent[];
  /** Human-readable source attribution for the trust line. */
  sources: string[];
}

/** Display metadata for the free overview part of a report. */
export interface AnalyzeSource {
  inputType: InputType;
  url?: string;
  /** Whether usable structured/raw data was obtained from a link. */
  extracted: boolean;
  /** The fields we managed to read, shown back to the user for transparency. */
  ad?: Omit<AdData, "rawText">;
  /** Official register enrichment, present only when a lookup succeeded. */
  register?: VehicleRegister;
}

/**
 * Context echoed to the client after the free step so the paid `/unlock` call
 * needs no re-scraping or re-charged register lookup. It is sent back verbatim.
 */
export interface AnalyzeContext {
  /** Full ad data including rawText (used to build the AI prompt). */
  ad: AdData;
  register?: VehicleRegister;
}

/**
 * Free step response: the official overview only. The paid AI analysis is
 * unlocked separately via `/api/analyze/unlock` using `context`.
 */
export interface AnalyzeOverviewResponse {
  ok: true;
  step: "overview";
  source: AnalyzeSource;
  context: AnalyzeContext;
}

/** Paid step response: the AI buy-advice, returned by `/api/analyze/unlock`. */
export interface AnalyzeFullResponse {
  ok: true;
  step: "full";
  analysis: CarAnalysis;
}

/**
 * Returned when a link was scraped successfully but no registration number was
 * found. The user is then asked to supply one, or to proceed without the
 * official register data.
 */
export interface AnalyzeNeedsPlateResponse {
  ok: true;
  needsPlate: true;
  source: {
    inputType: "link";
    url?: string;
    extracted: boolean;
    ad?: Omit<AdData, "rawText">;
  };
}

export type AnalyzeErrorCode =
  | "INVALID_INPUT"
  | "UNSUPPORTED_URL"
  | "EXTRACTION_FAILED"
  | "MISSING_API_KEY"
  | "OPENAI_ERROR"
  | "UNKNOWN";

export interface AnalyzeErrorResponse {
  ok: false;
  code: AnalyzeErrorCode;
  message: string;
}

/** Response from the free step (`POST /api/analyze`). */
export type AnalyzeResponse =
  | AnalyzeOverviewResponse
  | AnalyzeNeedsPlateResponse
  | AnalyzeErrorResponse;

/** Response from the paid step (`POST /api/analyze/unlock`). */
export type UnlockResponse = AnalyzeFullResponse | AnalyzeErrorResponse;

import {
  SYNSBASEN_API_KEY,
  SYNSBASEN_BASE_URL,
  SYNSBASEN_ENABLE_TINGLYSNING,
  SYNSBASEN_TIMEOUT_MS,
} from "@/lib/config";
import type {
  KpiStatus,
  PeriodicTax,
  RegisterKpi,
  RegisterSpec,
  SpecGroup,
  TimelineEvent,
  VehicleRegister,
} from "@/types/analysis";

/**
 * Client for the Synsbasen API — a licensed gateway to official Danish vehicle
 * data (Motorstyrelsen / Færdselsstyrelsen / Tinglysningen). This is the legal
 * alternative to scraping aggregator sites.
 *
 * GDPR: we deliberately normalise away every personal identifier (owner,
 * creditor and debtor names/birth dates). Only aggregate, non-personal facts
 * (dates, results, mileage, whether a liability exists) ever leave this module.
 */

/** True when a Synsbasen API key is configured. */
export function isSynsbasenEnabled(): boolean {
  return SYNSBASEN_API_KEY.length > 0;
}

/** Shallow inspection summary, included by default on the vehicles endpoint. */
interface SbInspection {
  date?: string | null;
  result?: string | null;
  mileage?: number | null;
}

interface SbLiability {
  amount?: number | null;
  currency?: string | null;
}

interface SbTinglysning {
  service_available?: boolean;
  liabilities?: SbLiability[] | null;
  notices?: unknown[] | null;
  error?: { message?: string | null } | null;
  status?: number | null;
}

/** Expanded engine/performance data (expand[]=engine). */
interface SbEngine {
  fuel_efficiency?: number | null;
  electricity_efficiency?: number | null;
  top_speed?: number | null;
  gears?: number | null;
  automatic_transmission?: boolean | null;
  cylinders?: number | null;
  engine_displacement?: number | null;
  engine_power?: number | null;
  horsepower?: number | null;
}

/** Expanded emission/environment data (expand[]=emission). */
interface SbEmission {
  co2?: number | null;
  energy_class?: string | null;
  euronorm?: string | null;
  allowed_in_environmental_zones?: boolean | null;
}

/** Expanded body data (expand[]=body). */
interface SbBody {
  doors?: number | null;
  passengers?: number | null;
  seats_minimum?: number | null;
  seats_maximum?: number | null;
  color?: string | null;
}

/** Expanded weight data (expand[]=weight). */
interface SbWeight {
  total_weight?: number | null;
  vehicle_weight?: number | null;
  trailer_with_brakes_weight_maximum?: number | null;
  trailer_without_brakes_weight_maximum?: number | null;
}

interface SbPeriodicTax {
  name?: string | null;
  amount?: number | null;
  payment_frequency?: string | null;
}

/** Expanded periodic-tax data (expand[]=periodic_taxes). */
interface SbPeriodicTaxes {
  taxes?: SbPeriodicTax[] | null;
  total_amount?: number | null;
  payment_frequency?: string | null;
}

/** Expanded age data (expand[]=age). */
interface SbAge {
  years?: number | null;
  months?: number | null;
}

interface SbVehicle {
  id?: number | null;
  registration?: string | null;
  vin?: string | null;
  first_registration_date?: string | null;
  registration_status?: string | null;
  status?: string | null;
  model_year?: number | null;
  fuel_type?: string | null;
  mileage?: number | null;
  mileage_annual_average?: number | null;
  brand?: string | null;
  model?: string | null;
  variant?: string | null;
  body_type?: string | null;
  kind?: string | null;
  usage?: string | null;
  next_inspection_date_estimate?: string | null;
  inspections?: SbInspection[] | null;
  tinglysning_data?: SbTinglysning | null;
  // Expanded resources (opt-in via expand[]) — free, no token cost.
  engine?: SbEngine | null;
  emission?: SbEmission | null;
  body?: SbBody | null;
  weight?: SbWeight | null;
  periodic_taxes?: SbPeriodicTaxes | null;
  age?: SbAge | null;
}

/** Looks up a vehicle by Danish registration number. Returns null on any failure. */
export async function lookupVehicleByRegistration(
  registration: string
): Promise<VehicleRegister | null> {
  const reg = registration.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z0-9]{2,7}$/.test(reg)) return null;
  return lookupVehicle({ registration_eq: reg });
}

/** Looks up a vehicle by 17-character VIN. Returns null on any failure. */
export async function lookupVehicleByVin(
  vin: string
): Promise<VehicleRegister | null> {
  const value = vin.replace(/\s+/g, "").toUpperCase();
  if (value.length !== 17) return null;
  return lookupVehicle({ vin_eq: value });
}

async function lookupVehicle(
  query: { registration_eq: string } | { vin_eq: string }
): Promise<VehicleRegister | null> {
  if (!isSynsbasenEnabled()) return null;

  // A vehicle is fetched through the search module. Shallow inspections
  // (date/result/mileage) are included by default, which is all the KPIs need.
  const vehicle = await searchVehicle(query);
  if (!vehicle) return null;

  // Debt/pant lives in Tinglysningen and costs a token, so it is only fetched
  // when explicitly enabled. Failure degrades gracefully to "unknown".
  if (SYNSBASEN_ENABLE_TINGLYSNING) {
    vehicle.tinglysning_data = await fetchTinglysning(vehicle);
  }

  return normaliseVehicle(vehicle);
}

async function searchVehicle(
  query: Record<string, string>
): Promise<SbVehicle | null> {
  // These expanded resources enrich the free overview and cost no tokens.
  const expand = VEHICLE_EXPANDS.map((e) => `expand[]=${e}`).join("&");
  const json = await sbFetch<{ data?: SbVehicle[] }>(
    `${SYNSBASEN_BASE_URL}/vehicles/search?${expand}`,
    { method: "POST", body: JSON.stringify({ query, per_page: 1 }) }
  );
  return json?.data?.[0] ?? null;
}

/** Expandable resources we always pull (no token cost) to enrich the overview. */
const VEHICLE_EXPANDS = [
  "engine",
  "emission",
  "body",
  "weight",
  "periodic_taxes",
  "age",
] as const;

async function fetchTinglysning(
  vehicle: SbVehicle
): Promise<SbTinglysning | null> {
  // Tinglysningen (Bilbogen) is keyed strictly on VIN; registration/id are rejected.
  if (!vehicle.vin) return null;

  const json = await sbFetch<{ data?: { tinglysning_data?: SbTinglysning } }>(
    `${SYNSBASEN_BASE_URL}/vehicles/tinglysning_data?vin=${encodeURIComponent(
      vehicle.vin
    )}`,
    { method: "GET" }
  );
  return json?.data?.tinglysning_data ?? null;
}

/** Authenticated fetch against Synsbasen with a timeout. Returns null on any error. */
async function sbFetch<T>(url: string, init: RequestInit): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SYNSBASEN_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${SYNSBASEN_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      // Outbound API call must not be cached by Next's patched fetch.
      cache: "no-store",
      signal: controller.signal,
    });

    // Synsbasen returns meaningful JSON bodies even on 4xx (e.g. tinglysning
    // "No data found for VIN"), so we parse regardless of status and let the
    // caller interpret the payload.
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function normaliseVehicle(v: SbVehicle): VehicleRegister {
  const inspections = (v.inspections ?? [])
    .filter((i): i is SbInspection => Boolean(i?.date))
    .sort((a, b) => (a.date! < b.date! ? -1 : 1));

  const sources = ["Motorstyrelsen (DMR)", "Færdselsstyrelsen (syn)"];
  if (SYNSBASEN_ENABLE_TINGLYSNING && v.tinglysning_data?.service_available) {
    sources.push("Tinglysningen (Bilbogen)");
  }

  return {
    registration: v.registration ?? undefined,
    vin: v.vin ?? undefined,
    brand: v.brand ?? undefined,
    model: v.model ?? undefined,
    variant: v.variant ?? undefined,
    modelYear: v.model_year ?? undefined,
    firstRegistration: v.first_registration_date ?? undefined,
    fuelType: v.fuel_type ?? undefined,
    bodyType: v.body_type ?? undefined,
    usage: v.usage ?? undefined,
    vehicleKind: v.kind ?? undefined,
    ageYears: typeof v.age?.years === "number" ? v.age.years : undefined,
    mileageLatest: latestMileage(inspections) ?? v.mileage ?? undefined,
    mileageAnnualAverage: v.mileage_annual_average ?? undefined,
    registrationStatus: v.registration_status ?? undefined,
    nextInspection: v.next_inspection_date_estimate ?? undefined,
    specs: buildSpecs(v),
    periodicTax: buildPeriodicTax(v.periodic_taxes),
    kpis: buildKpis(v, inspections),
    timeline: buildTimeline(v, inspections),
    sources,
  };
}

function isNum(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Builds the display-ready technical-spec list from the expanded resources. */
function buildSpecs(v: SbVehicle): RegisterSpec[] {
  const specs: RegisterSpec[] = [];
  const add = (label: string, value: string, group: SpecGroup) =>
    specs.push({ label, value, group });

  // Engine / performance
  const hp = v.engine?.horsepower;
  if (isNum(hp)) add("Hestekræfter", `${hp} hk`, "engine");
  const displacement = v.engine?.engine_displacement;
  if (isNum(displacement))
    add("Motorstørrelse", `${formatInt(displacement)} cm³`, "engine");
  const cylinders = v.engine?.cylinders;
  if (isNum(cylinders)) add("Cylindre", String(cylinders), "engine");
  const kmpl = v.engine?.fuel_efficiency;
  if (isNum(kmpl)) add("Brændstofforbrug", `${kmpl} km/l`, "engine");
  const whpkm = v.engine?.electricity_efficiency;
  if (isNum(whpkm)) add("Elforbrug", `${whpkm} Wh/km`, "engine");
  const topSpeed = v.engine?.top_speed;
  if (isNum(topSpeed)) add("Topfart", `${topSpeed} km/t`, "engine");
  const auto = v.engine?.automatic_transmission;
  if (typeof auto === "boolean")
    add("Gearkasse", auto ? "Automatisk" : "Manuel", "engine");

  // Body
  const color = v.body?.color;
  if (color) add("Farve", color, "body");
  const doors = v.body?.doors;
  if (isNum(doors)) add("Døre", String(doors), "body");
  const seats = v.body?.seats_maximum ?? v.body?.seats_minimum ?? v.body?.passengers;
  if (isNum(seats)) add("Sæder", String(seats), "body");
  const ownWeight = v.weight?.vehicle_weight;
  if (isNum(ownWeight)) add("Egenvægt", `${formatInt(ownWeight)} kg`, "body");
  const totalWeight = v.weight?.total_weight;
  if (isNum(totalWeight)) add("Totalvægt", `${formatInt(totalWeight)} kg`, "body");
  const trailer = v.weight?.trailer_with_brakes_weight_maximum;
  if (isNum(trailer))
    add("Anhænger m. bremser", `maks. ${formatInt(trailer)} kg`, "body");

  // Environment
  const energyClass = v.emission?.energy_class;
  if (energyClass) add("Energiklasse", energyClass, "general");
  const co2 = v.emission?.co2;
  if (isNum(co2)) add("CO₂-udledning", `${co2} g/km`, "general");
  const euronorm = v.emission?.euronorm;
  if (euronorm) add("Euronorm", euronorm, "general");
  const zone = v.emission?.allowed_in_environmental_zones;
  if (typeof zone === "boolean")
    add("Miljøzone", zone ? "Tilladt" : "Ikke tilladt", "general");

  return specs;
}

/** Converts an amount at a given payment frequency to a yearly figure. */
function toYearlyTax(amount: number, frequency?: string | null): number {
  switch ((frequency ?? "").toLowerCase()) {
    case "monthly":
      return amount * 12;
    case "quarterly":
      return amount * 4;
    case "yearly":
    case "annually":
      return amount;
    // Synsbasen returns "semesterly" (per half-year) for passenger cars.
    default:
      return amount * 2;
  }
}

/** Picks the most relevant positive tax name for the headline label. */
function primaryTaxLabel(taxes?: SbPeriodicTax[] | null): string {
  const names = (taxes ?? [])
    .filter((t) => isNum(t.amount) && (t.amount as number) > 0)
    .map((t) => t.name)
    .filter((n): n is string => Boolean(n));

  return (
    names.find((n) => /grøn ejerafgift|ejerafgift/i.test(n)) ??
    names.find((n) => /vægtafgift/i.test(n)) ??
    names.find((n) => /co2|co₂/i.test(n)) ??
    names[0] ??
    "Ejerafgift"
  );
}

/** Builds the estimated recurring ownership-tax figure, when available. */
function buildPeriodicTax(
  taxes: SbPeriodicTaxes | null | undefined
): PeriodicTax | undefined {
  const total = taxes?.total_amount;
  if (!taxes || !isNum(total) || total <= 0) return undefined;

  const perYear = toYearlyTax(total, taxes.payment_frequency);
  return {
    label: primaryTaxLabel(taxes.taxes),
    amountHalfYear: Math.round(perYear / 2),
    amountPerYear: Math.round(perYear),
  };
}

function latestMileage(inspections: SbInspection[]): number | undefined {
  for (let i = inspections.length - 1; i >= 0; i--) {
    const m = inspections[i].mileage;
    if (typeof m === "number" && m > 0) return m;
  }
  return undefined;
}

function isFailedResult(result?: string | null): boolean {
  return Boolean(result && /(ikke\s*godkendt|omsyn)/i.test(result));
}

function buildKpis(
  v: SbVehicle,
  inspections: SbInspection[]
): RegisterKpi[] {
  return [
    inspectionKpi(inspections),
    mileageKpi(inspections),
    statusKpi(v),
    debtKpi(v),
  ];
}

function inspectionKpi(inspections: SbInspection[]): RegisterKpi {
  const base = { key: "inspections", label: "Synshistorik" } as const;
  if (inspections.length === 0) {
    return {
      ...base,
      status: "unknown",
      detail: "Ingen synshistorik fundet i registret.",
    };
  }

  const failures = inspections.filter((i) => isFailedResult(i.result)).length;
  const last = inspections[inspections.length - 1];

  let status: KpiStatus = "strong";
  if (isFailedResult(last.result)) status = "weak";
  else if (failures > 0) status = "ok";

  return {
    ...base,
    status,
    detail: `${inspections.length} syn registreret${
      failures ? `, ${failures} med anmærkning` : ""
    }. Seneste: ${last.result ?? "ukendt"}${
      last.date ? ` (${formatDkDate(last.date)})` : ""
    }.`,
  };
}

function mileageKpi(inspections: SbInspection[]): RegisterKpi {
  const base = { key: "mileage", label: "Kilometerhistorik" } as const;
  const points = inspections.filter(
    (i): i is SbInspection & { mileage: number } =>
      typeof i.mileage === "number" && i.mileage > 0
  );

  if (points.length < 2) {
    return {
      ...base,
      status: "unknown",
      detail: "For få km-aflæsninger til at vurdere udviklingen.",
    };
  }

  for (let i = 1; i < points.length; i++) {
    if (points[i].mileage < points[i - 1].mileage) {
      return {
        ...base,
        status: "weak",
        detail: `Advarsel: km falder fra ${formatKm(
          points[i - 1].mileage
        )} til ${formatKm(points[i].mileage)} mellem to syn — muligt tilbagestillet speedometer.`,
      };
    }
  }

  return {
    ...base,
    status: "strong",
    detail: `Km udvikler sig normalt over ${points.length} syn (senest ${formatKm(
      points[points.length - 1].mileage
    )}) — ingen tegn på tilbagestilling.`,
  };
}

function statusKpi(v: SbVehicle): RegisterKpi {
  const base = { key: "status", label: "Registreringsstatus" } as const;
  const status = v.registration_status ?? v.status ?? null;
  if (!status) {
    return { ...base, status: "unknown", detail: "Status er ukendt." };
  }
  if (/stjålet|efterlyst/i.test(status)) {
    return { ...base, status: "weak", detail: `Bilen er markeret som "${status}".` };
  }
  if (/registreret|indregistreret/i.test(status)) {
    return { ...base, status: "strong", detail: "Bilen er aktivt indregistreret." };
  }
  return { ...base, status: "ok", detail: `Status: ${status}.` };
}

function debtKpi(v: SbVehicle): RegisterKpi {
  const base = { key: "debt", label: "Gæld / pant" } as const;
  const t = v.tinglysning_data;

  if (!SYNSBASEN_ENABLE_TINGLYSNING) {
    return {
      ...base,
      status: "unknown",
      detail: "Ikke tjekket — kræver opslag i Bilbogen.",
    };
  }
  if (!t || !t.service_available) {
    return {
      ...base,
      status: "unknown",
      detail: "Bilbogen kunne ikke slå bilen op lige nu.",
    };
  }
  // "No data found for VIN" means the vehicle has no entries in Bilbogen at all.
  if (t.error) {
    if (/no data found/i.test(t.error.message ?? "")) {
      return {
        ...base,
        status: "strong",
        detail: "Ingen tinglyst gæld eller pant fundet i Bilbogen.",
      };
    }
    return {
      ...base,
      status: "unknown",
      detail: "Bilbogen kunne ikke slå stelnummeret op.",
    };
  }

  const liabilities = t.liabilities ?? [];
  const notices = t.notices ?? [];
  if (liabilities.length === 0 && notices.length === 0) {
    return {
      ...base,
      status: "strong",
      detail: "Ingen tinglyst gæld eller pant på bilen.",
    };
  }

  const total = liabilities.reduce(
    (sum, l) => sum + (typeof l.amount === "number" ? l.amount : 0),
    0
  );
  const amount = total > 0 ? ` (ca. ${formatDkk(total)})` : "";
  return {
    ...base,
    status: "weak",
    detail: `Der er tinglyst pant/gæld på bilen${amount}. Kræver indfrielse ved handel.`,
  };
}

function buildTimeline(
  v: SbVehicle,
  inspections: SbInspection[]
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  if (v.first_registration_date) {
    events.push({
      date: v.first_registration_date,
      kind: "registration",
      title: "Første registrering",
      detail: [v.brand, v.model].filter(Boolean).join(" ") || undefined,
      tone: "neutral",
    });
  }

  for (const i of inspections) {
    if (!i.date) continue;
    events.push({
      date: i.date,
      kind: "inspection",
      title: `Syn: ${i.result ?? "resultat ukendt"}`,
      detail:
        typeof i.mileage === "number" && i.mileage > 0
          ? formatKm(i.mileage)
          : undefined,
      tone: isFailedResult(i.result) ? "warning" : "positive",
    });
  }

  return events.sort((a, b) => (a.date < b.date ? 1 : -1));
}

function formatKm(value: number): string {
  return `${value.toLocaleString("da-DK")} km`;
}

function formatInt(value: number): string {
  return Math.round(value).toLocaleString("da-DK");
}

function formatDkk(value: number): string {
  return `${value.toLocaleString("da-DK")} kr.`;
}

function formatDkDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (y && m && d) return `${d}.${m}.${y}`;
  return iso;
}

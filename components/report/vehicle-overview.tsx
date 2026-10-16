import {
  CircleHelp,
  Coins,
  Gauge,
  Landmark,
  Settings2,
  ShieldCheck,
  ShieldQuestion,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  KpiStatus,
  PeriodicTax,
  RegisterKpi,
  RegisterSpec,
  TimelineEvent,
  TimelineTone,
  VehicleRegister,
} from "@/types/analysis";

const STATUS: Record<
  KpiStatus,
  { label: string; pill: string; ring: string; iconText: string }
> = {
  strong: {
    label: "Stærkt",
    pill: "bg-emerald-100 text-emerald-700",
    ring: "ring-emerald-100",
    iconText: "text-emerald-600",
  },
  ok: {
    label: "OK",
    pill: "bg-amber-100 text-amber-700",
    ring: "ring-amber-100",
    iconText: "text-amber-600",
  },
  weak: {
    label: "Svag",
    pill: "bg-red-100 text-red-700",
    ring: "ring-red-100",
    iconText: "text-red-600",
  },
  unknown: {
    label: "Ukendt",
    pill: "bg-slate-100 text-slate-600",
    ring: "ring-slate-100",
    iconText: "text-slate-500",
  },
};

const KPI_ICON: Record<string, LucideIcon> = {
  inspections: ShieldCheck,
  mileage: Gauge,
  status: ShieldQuestion,
  debt: Landmark,
};

interface VehicleOverviewProps {
  register: VehicleRegister;
}

export function VehicleOverview({ register }: VehicleOverviewProps) {
  const identity =
    [register.brand, register.model, register.variant]
      .filter(Boolean)
      .join(" ") || register.registration || "Bilens historik";

  const facts = buildFacts(register);

  return (
    <Card className="overflow-hidden border-blue-100">
      <CardHeader className="gap-3">
        <CardTitle className="flex items-center gap-3 text-base">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <ShieldCheck className="size-5" />
          </span>
          Officielt overblik
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Verificeret via {register.sources.join(", ")} — på få sekunder, så du
          slipper for selv at slå op.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Identity + key facts */}
        <div className="space-y-2">
          <p className="text-lg font-semibold leading-tight">{identity}</p>
          {facts.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {facts.map((fact) => (
                <span key={fact.label}>
                  <span className="text-muted-foreground/70">{fact.label}: </span>
                  <span className="font-medium text-foreground">{fact.value}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Økonomi: anslået løbende ejerafgift */}
        {register.periodicTax && (
          <PeriodicTaxCallout tax={register.periodicTax} />
        )}

        {/* KPI badges */}
        <div className="grid gap-3 sm:grid-cols-2">
          {register.kpis.map((kpi) => (
            <KpiCard key={kpi.key} kpi={kpi} />
          ))}
        </div>

        {/* Tekniske specifikationer */}
        {register.specs.length > 0 && <SpecsSection specs={register.specs} />}

        {/* Timeline */}
        {register.timeline.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Tidslinje
            </h3>
            <Timeline events={register.timeline} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function KpiCard({ kpi }: { kpi: RegisterKpi }) {
  const style = STATUS[kpi.status];
  const Icon = KPI_ICON[kpi.key] ?? CircleHelp;

  return (
    <div className={cn("rounded-xl border bg-card p-4 ring-1 ring-inset", style.ring)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className={cn("size-4", style.iconText)} />
          <span className="text-sm font-medium">{kpi.label}</span>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-semibold",
            style.pill
          )}
        >
          {style.label}
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {kpi.detail}
      </p>
    </div>
  );
}

function PeriodicTaxCallout({ tax }: { tax: PeriodicTax }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
        <Coins className="size-5" />
      </span>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-sm font-medium">{tax.label} (anslået)</span>
        <span className="text-lg font-semibold tabular-nums">
          {formatDkk(tax.amountPerYear)}
          <span className="text-sm font-normal text-muted-foreground">
            {" "}/år
          </span>
        </span>
        <span className="text-xs text-muted-foreground">
          ({formatDkk(tax.amountHalfYear)} pr. halvår)
        </span>
      </div>
    </div>
  );
}

function SpecsSection({ specs }: { specs: RegisterSpec[] }) {
  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Settings2 className="size-3.5" />
        Tekniske specifikationer
      </h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        {specs.map((spec) => (
          <div key={spec.label} className="space-y-0.5">
            <dt className="text-xs text-muted-foreground">{spec.label}</dt>
            <dd className="text-sm font-medium">{spec.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="relative space-y-4 border-l border-border pl-5">
      {events.map((event, index) => (
        <li key={`${event.date}-${index}`} className="relative">
          <span
            className={cn(
              "absolute -left-[1.4rem] mt-1 size-2.5 rounded-full ring-4 ring-background",
              toneDot(event.tone)
            )}
          />
          <div className="flex flex-wrap items-baseline gap-x-2">
            <time className="text-xs font-medium tabular-nums text-muted-foreground">
              {formatDkDate(event.date)}
            </time>
            <span className="text-sm font-medium">{event.title}</span>
          </div>
          {event.detail && (
            <p className="text-xs text-muted-foreground">{event.detail}</p>
          )}
        </li>
      ))}
    </ol>
  );
}

function buildFacts(register: VehicleRegister): { label: string; value: string }[] {
  const facts: { label: string; value: string }[] = [];
  if (register.modelYear) facts.push({ label: "Modelår", value: String(register.modelYear) });
  if (register.firstRegistration)
    facts.push({ label: "1. reg.", value: formatDkDate(register.firstRegistration) });
  if (register.fuelType) facts.push({ label: "Brændstof", value: register.fuelType });
  if (register.bodyType) facts.push({ label: "Karrosseri", value: register.bodyType });
  if (typeof register.mileageLatest === "number")
    facts.push({
      label: "Seneste km",
      value: `${register.mileageLatest.toLocaleString("da-DK")} km`,
    });
  if (typeof register.mileageAnnualAverage === "number")
    facts.push({
      label: "Gns. km/år",
      value: `${register.mileageAnnualAverage.toLocaleString("da-DK")} km`,
    });
  if (register.nextInspection)
    facts.push({ label: "Næste syn", value: formatDkDate(register.nextInspection) });
  if (register.registrationStatus)
    facts.push({ label: "Status", value: register.registrationStatus });
  return facts;
}

function toneDot(tone: TimelineTone): string {
  if (tone === "positive") return "bg-emerald-500";
  if (tone === "warning") return "bg-red-500";
  return "bg-blue-500";
}

function formatDkk(value: number): string {
  return `${value.toLocaleString("da-DK")} kr.`;
}

function formatDkDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (y && m && d) return `${d}.${m}.${y}`;
  return iso;
}

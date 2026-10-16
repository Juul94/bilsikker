import {
  Car,
  CircleCheckBig,
  ClipboardCheck,
  Coins,
  Link2,
  MessageCircleQuestionMark,
  ThumbsUp,
  TriangleAlert,
  Wrench,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReportListSection } from "@/components/report/report-section";
import { ScoreRing } from "@/components/report/score-ring";
import { VehicleOverview } from "@/components/report/vehicle-overview";
import { getScoreMeta, type ScoreLevel } from "@/lib/score";
import { cn } from "@/lib/utils";
import { Paywall } from "@/components/report/paywall";
import type { AnalyzeSource, CarAnalysis } from "@/types/analysis";

interface ReportViewProps {
  source: AnalyzeSource;
  analysis: CarAnalysis | null;
  unlocking: boolean;
  onUnlock: () => void;
}

export function ReportView({
  source,
  analysis,
  unlocking,
  onUnlock,
}: ReportViewProps) {
  return (
    <div className="space-y-6">
      {/* Gratis: kilde og biltitel */}
      <Card>
        <CardContent className="space-y-3 text-center sm:text-left">
          {source.ad?.title && (
            <p className="text-lg font-semibold">{source.ad.title}</p>
          )}
          <SourceMeta source={source} />
        </CardContent>
      </Card>

      {/* Gratis: officielt overblik fra registre (kun når opslag lykkedes) */}
      {source.register && <VehicleOverview register={source.register} />}

      {/* Betalt: AI-købsvurdering bag paywall */}
      {analysis ? (
        <AiReport analysis={analysis} />
      ) : (
        <Paywall pending={unlocking} onUnlock={onUnlock} />
      )}
    </div>
  );
}

function AiReport({ analysis }: { analysis: CarAnalysis }) {
  const meta = getScoreMeta(analysis.score);

  return (
    <div className="space-y-6">
      {/* 1 + 2: Samlet score og kort konklusion */}
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col items-center gap-8 sm:flex-row sm:gap-10">
          <div className="flex flex-col items-center gap-3">
            <ScoreRing score={analysis.score} />
            <Badge variant={meta.badgeVariant} className="gap-1.5 px-3 py-1">
              <span className="size-1.5 rounded-full bg-white" />
              {meta.label}
            </Badge>
          </div>

          <div className="flex-1 space-y-2 text-center sm:text-left">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Samlet vurdering
            </h2>
            <p className="text-lg leading-relaxed">{analysis.summary}</p>
          </div>
        </CardContent>
      </Card>

      {/* 6: Prisvurdering */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-base">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Coins className="size-5" />
            </span>
            Prisvurdering
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-foreground/90">
            {analysis.priceEvaluation}
          </p>
        </CardContent>
      </Card>

      {/* 3, 4, 5, 7: positive ting, risici, kendte problemer, spørgsmål */}
      <div className="grid gap-6 md:grid-cols-2">
        <ReportListSection
          title="Positive ting"
          items={analysis.positives}
          icon={CircleCheckBig}
          accent="emerald"
          emptyText="Ingen tydelige styrker fundet i annoncen."
        />
        <ReportListSection
          title="Risici"
          items={analysis.risks}
          icon={TriangleAlert}
          accent="red"
          emptyText="Ingen umiddelbare risici fundet."
        />
        <ReportListSection
          title="Kendte problemer"
          items={analysis.knownIssues}
          icon={Wrench}
          accent="amber"
          emptyText="Ingen kendte modelproblemer nævnt."
        />
        <ReportListSection
          title="Spørgsmål til sælger"
          items={analysis.sellerQuestions}
          icon={MessageCircleQuestionMark}
          accent="indigo"
          emptyText="Ingen specifikke spørgsmål."
        />
      </div>

      {/* 8: Tjekliste til fremvisning */}
      <ReportListSection
        title="Tjekliste til fremvisning"
        items={analysis.inspectionChecklist}
        icon={ClipboardCheck}
        accent="blue"
        emptyText="Ingen tjekpunkter nævnt."
      />

      {/* 9: Samlet anbefaling */}
      <Card className={cn("border-2", recommendationBorder(meta.level))}>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <span
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-xl",
              recommendationBadge(meta.level)
            )}
          >
            <ThumbsUp className="size-6" />
          </span>
          <div className="space-y-1">
            <h2 className="text-base font-semibold">Samlet anbefaling</h2>
            <p className="text-sm leading-relaxed text-foreground/90">
              {analysis.recommendation}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SourceMeta({ source }: { source: AnalyzeSource }) {
  const facts: string[] = [];
  if (source.ad?.price) facts.push(source.ad.price);
  if (source.ad?.mileage) facts.push(source.ad.mileage);
  if (source.ad?.year) facts.push(`Årgang ${source.ad.year}`);

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 pt-1 sm:justify-start">
      <Badge variant="secondary" className="gap-1.5">
        {source.inputType === "link" ? (
          <Link2 className="size-3" />
        ) : (
          <Car className="size-3" />
        )}
        {source.inputType === "link" ? "Hentet fra link" : "Nummerplade-opslag"}
      </Badge>
      {facts.map((fact) => (
        <Badge
          key={fact}
          variant="outline"
          className="font-normal text-muted-foreground"
        >
          {fact}
        </Badge>
      ))}
    </div>
  );
}

function recommendationBorder(level: ScoreLevel): string {
  if (level === "good") return "border-emerald-200";
  if (level === "fair") return "border-amber-200";
  return "border-red-200";
}

function recommendationBadge(level: ScoreLevel): string {
  if (level === "good") return "bg-emerald-50 text-emerald-600";
  if (level === "fair") return "bg-amber-50 text-amber-600";
  return "bg-red-50 text-red-600";
}

import type { LucideIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type SectionAccent =
  | "emerald"
  | "amber"
  | "red"
  | "blue"
  | "indigo"
  | "slate";

const ACCENTS: Record<
  SectionAccent,
  { iconBg: string; iconText: string; marker: string }
> = {
  emerald: {
    iconBg: "bg-emerald-50",
    iconText: "text-emerald-600",
    marker: "bg-emerald-500",
  },
  amber: {
    iconBg: "bg-amber-50",
    iconText: "text-amber-600",
    marker: "bg-amber-500",
  },
  red: { iconBg: "bg-red-50", iconText: "text-red-600", marker: "bg-red-500" },
  blue: {
    iconBg: "bg-blue-50",
    iconText: "text-blue-600",
    marker: "bg-blue-500",
  },
  indigo: {
    iconBg: "bg-indigo-50",
    iconText: "text-indigo-600",
    marker: "bg-indigo-500",
  },
  slate: {
    iconBg: "bg-slate-100",
    iconText: "text-slate-600",
    marker: "bg-slate-400",
  },
};

interface ReportListSectionProps {
  title: string;
  items: string[];
  icon: LucideIcon;
  accent: SectionAccent;
  emptyText?: string;
}

export function ReportListSection({
  title,
  items,
  icon: Icon,
  accent,
  emptyText = "Ingen punkter nævnt.",
}: ReportListSectionProps) {
  const styles = ACCENTS[accent];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-base">
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              styles.iconBg,
              styles.iconText
            )}
          >
            <Icon className="size-5" />
          </span>
          <span>{title}</span>
          {items.length > 0 && (
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              {items.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <ul className="space-y-3">
            {items.map((item, index) => (
              <li
                key={index}
                className="flex gap-3 text-sm leading-relaxed text-foreground/90"
              >
                <span
                  className={cn(
                    "mt-[7px] size-1.5 shrink-0 rounded-full",
                    styles.marker
                  )}
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export type ScoreLevel = "good" | "fair" | "poor";

export interface ScoreMeta {
  level: ScoreLevel;
  /** Short human-readable verdict shown next to the score. */
  label: string;
  /** Stroke color for the progress ring (applied via currentColor). */
  ringClass: string;
  /** Text color for the numeric score. */
  textClass: string;
  /** Background color for the status dot. */
  dotClass: string;
  /** Badge variant matching the level. */
  badgeVariant: "success" | "warning" | "destructive";
}

/** Maps a 0-100 score to its visual status (green / yellow / red). */
export function getScoreMeta(score: number): ScoreMeta {
  if (score >= 70) {
    return {
      level: "good",
      label: "Ser lovende ud",
      ringClass: "text-emerald-500",
      textClass: "text-emerald-600",
      dotClass: "bg-emerald-500",
      badgeVariant: "success",
    };
  }
  if (score >= 45) {
    return {
      level: "fair",
      label: "Kræver forbehold",
      ringClass: "text-amber-500",
      textClass: "text-amber-600",
      dotClass: "bg-amber-500",
      badgeVariant: "warning",
    };
  }
  return {
    level: "poor",
    label: "Høj risiko",
    ringClass: "text-red-500",
    textClass: "text-red-600",
    dotClass: "bg-red-500",
    badgeVariant: "destructive",
  };
}

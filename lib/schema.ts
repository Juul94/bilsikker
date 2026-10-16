import { z } from "zod";

/**
 * Schema for the model's structured output. Kept to types only (no min/max or
 * numeric ranges) because OpenAI Structured Outputs strict mode rejects those
 * keywords. The score is clamped to 0-100 in code after parsing.
 */
export const carAnalysisSchema = z.object({
  score: z
    .number()
    .describe(
      "Samlet købsscore fra 0 til 100, hvor 100 er et fremragende køb og 0 frarådes helt."
    ),
  summary: z
    .string()
    .describe("Kort, konkret konklusion på 1-3 sætninger."),
  positives: z
    .array(z.string())
    .describe("Konkrete styrker ved bilen og annoncen."),
  risks: z
    .array(z.string())
    .describe("Konkrete risici og advarselstegn."),
  knownIssues: z
    .array(z.string())
    .describe(
      "Kendte fejl og svagheder ved netop denne model, motor, gearkasse eller drivlinje."
    ),
  priceEvaluation: z
    .string()
    .describe(
      "Vurdering af om prisen er rimelig ift. det danske marked, km-stand og årgang."
    ),
  sellerQuestions: z
    .array(z.string())
    .describe("Konkrete spørgsmål køber bør stille sælger."),
  inspectionChecklist: z
    .array(z.string())
    .describe("Konkrete ting der bør tjekkes ved fremvisning og prøvekørsel."),
  recommendation: z
    .string()
    .describe(
      "Samlet anbefaling med kort begrundelse: køb, undersøg nærmere eller hold dig væk."
    ),
});

export type CarAnalysisSchema = z.infer<typeof carAnalysisSchema>;

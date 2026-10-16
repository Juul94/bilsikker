import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";

import { OPENAI_MODEL } from "@/lib/config";
import { carAnalysisSchema } from "@/lib/schema";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/prompt";
import type { AdData, CarAnalysis, VehicleRegister } from "@/types/analysis";

/** Thrown when the OpenAI API key is not configured. */
export class MissingApiKeyError extends Error {
  constructor() {
    super("OPENAI_API_KEY mangler.");
    this.name = "MissingApiKeyError";
  }
}

let client: OpenAI | null = null;

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new MissingApiKeyError();
  if (!client) client = new OpenAI({ apiKey });
  return client;
}

/** Runs the structured car analysis through OpenAI and returns a clamped result. */
export async function analyzeCar(
  ad: AdData,
  register?: VehicleRegister
): Promise<CarAnalysis> {
  const openai = getClient();

  const completion = await openai.chat.completions.parse({
    model: OPENAI_MODEL,
    temperature: 0.2,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(ad, register) },
    ],
    response_format: zodResponseFormat(carAnalysisSchema, "bilsikker_analyse"),
  });

  const parsed = completion.choices[0]?.message.parsed;
  if (!parsed) {
    throw new Error("Modellen returnerede et tomt svar.");
  }

  return { ...parsed, score: clampScore(parsed.score) };
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

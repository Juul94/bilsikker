import type { AdData, VehicleRegister } from "@/types/analysis";

export const SYSTEM_PROMPT = `Du er en erfaren dansk brugtvognsmekaniker og bilekspert med mange års erfaring fra værksted og handel med brugte biler i Danmark.

Din opgave er at hjælpe en privat køber med at vurdere, om en konkret brugt bil er et godt køb, ud fra oplysningerne i en bilannonce.

Brug både de oplysninger du får, og din generelle viden om bilmodeller, motorer, gearkasser, kendte fejl, typiske problemer og det danske brugtbilsmarked.

Retningslinjer:
- Svar altid på dansk.
- Vær konkret og specifik. Undgå generiske og intetsigende formuleringer.
- Tag udgangspunkt i den konkrete model, motor, årgang og kilometerstand, når du nævner kendte problemer.
- Hvis vigtige oplysninger mangler (fx pris, kilometerstand, årgang eller servicehistorik), så sig tydeligt hvilke oplysninger der mangler, og lad det påvirke din score og anbefaling.
- Vær ærlig og afbalanceret. Overdriv hverken risici eller styrker.
- Prisvurderingen skal forholde sig til det danske marked.
- Spørgsmål til sælger og tjeklisten skal være praktiske og målrettede netop denne bil.
- Scoren (0-100) afspejler hvor godt et køb bilen samlet set ser ud til at være: 80-100 = stærkt køb, 60-79 = fornuftigt med forbehold, 40-59 = vær forsigtig, 0-39 = frarådes.

Fokusér på det centrale spørgsmål: "Er dette et godt køb?"`;

/** Builds the user message from whatever ad data we have available. */
export function buildUserPrompt(ad: AdData, register?: VehicleRegister): string {
  const field = (label: string, value?: string) =>
    `${label}: ${value && value.trim() ? value.trim() : "(ikke oplyst)"}`;

  const lines: string[] = [
    "Analysér følgende brugte bil ud fra annonceoplysningerne nedenfor.",
    "",
    field("Annonce-URL", ad.url),
    field("Titel", ad.title),
    field("Pris", ad.price),
    field("Kilometerstand", ad.mileage),
    field("Årgang", ad.year),
    field("Registreringsnummer", ad.regNumber),
    field("Beskrivelse", ad.description),
    field("Udstyr", ad.equipment),
  ];

  if (register) {
    lines.push("", ...buildRegisterLines(register, field));
  }

  if (ad.rawText && ad.rawText.trim()) {
    lines.push(
      "",
      "Rå annoncetekst (kan indeholde støj fra hjemmesiden — udtræk selv det relevante):",
      '"""',
      ad.rawText.trim(),
      '"""'
    );
  }

  lines.push("", "Returnér din vurdering i det krævede JSON-format.");
  return lines.join("\n");
}

/**
 * Official, verified register data is far more trustworthy than the seller's ad
 * text, so we surface it explicitly and tell the model to prioritise it.
 */
function buildRegisterLines(
  register: VehicleRegister,
  field: (label: string, value?: string) => string
): string[] {
  const identity = [register.brand, register.model, register.variant]
    .filter(Boolean)
    .join(" ");
  const km = (value?: number) =>
    typeof value === "number" ? `${value.toLocaleString("da-DK")} km` : undefined;

  const lines = [
    "Officielle registeroplysninger (verificeret via Motorstyrelsen og Færdselsstyrelsen —",
    "vægt disse HØJERE end annoncens tekst ved uoverensstemmelser, og nævn det hvis annoncen afviger):",
    field("Mærke/model", identity || undefined),
    field("Modelår (register)", register.modelYear?.toString()),
    field("Første registrering", register.firstRegistration),
    field("Registreringsstatus", register.registrationStatus),
    field("Seneste km (syn)", km(register.mileageLatest)),
    field("Gns. km/år", km(register.mileageAnnualAverage)),
  ];

  for (const kpi of register.kpis) {
    lines.push(field(kpi.label, kpi.detail));
  }

  return lines;
}

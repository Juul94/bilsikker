import type { Metadata } from "next";

import { AnalyzeFlow } from "@/components/analyze/analyze-flow";

export const metadata: Metadata = {
  title: "Analyser bil — BilSikker",
  description:
    "Indsæt et bilannonce-link eller en nummerplade og få en hurtig købsvurdering med score, risici og spørgsmål til sælger.",
};

export default function AnalyserPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Analyser en bil
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Indsæt et link eller en nummerplade, så giver BilSikker dig en hurtig
          købsvurdering med styrker, risici og anbefaling.
        </p>
      </header>

      <AnalyzeFlow />
    </section>
  );
}

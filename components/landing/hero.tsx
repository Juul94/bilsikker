import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-muted/50 to-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute left-1/2 top-[-10%] h-[460px] w-[820px] max-w-[120vw] -translate-x-1/2 rounded-full bg-gradient-to-tr from-primary/20 via-blue-400/10 to-transparent blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 sm:py-28">
        <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
          <Sparkles className="size-3.5 text-primary" />
          AI-drevet købsvurdering på få sekunder
        </div>

        <h1 className="mx-auto mt-6 max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-6xl">
          Undgå dyre fejl ved køb af brugt bil
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground">
          Få en hurtig vurdering af en bilannonce med styrker, risici og
          spørgsmål du bør stille sælger.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="xl">
            <Link href="/analyser">
              Analyser bil
              <ArrowRight className="size-5" />
            </Link>
          </Button>
          <Button asChild size="xl" variant="outline">
            <Link href="#fordele">Se hvad du får</Link>
          </Button>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Ingen login. Intet abonnement. Bare en hurtig vurdering.
        </p>
      </div>
    </section>
  );
}

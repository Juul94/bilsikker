import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export function LandingCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-14 text-center text-primary-foreground shadow-lg sm:px-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-30"
        >
          <div className="absolute right-[-10%] top-[-40%] h-[320px] w-[320px] rounded-full bg-white/30 blur-3xl" />
          <div className="absolute bottom-[-50%] left-[-5%] h-[320px] w-[320px] rounded-full bg-white/20 blur-3xl" />
        </div>

        <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
          Klar til at vurdere din næste bil?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-primary-foreground/85">
          Indsæt en annonce og få en hurtig, ærlig vurdering — før du kontakter
          sælger.
        </p>
        <div className="mt-8 flex justify-center">
          <Button asChild size="xl" variant="secondary">
            <Link href="/analyser">
              Analyser bil
              <ArrowRight className="size-5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

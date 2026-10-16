import { ClipboardCheck, Link2, Sparkles, type LucideIcon } from "lucide-react";

interface Step {
  icon: LucideIcon;
  title: string;
  description: string;
}

const steps: Step[] = [
  {
    icon: Link2,
    title: "Indsæt link eller nummerplade",
    description:
      "Indsæt et DBA- eller Bilbasen-link, eller skriv blot bilens nummerplade.",
  },
  {
    icon: Sparkles,
    title: "BilSikker analyserer",
    description:
      "Vi henter annoncen og lader en AI-bilekspert vurdere styrker, risici og pris.",
  },
  {
    icon: ClipboardCheck,
    title: "Få din rapport",
    description:
      "På få sekunder får du en overskuelig købsvurdering med score og anbefaling.",
  },
];

export function HowItWorks() {
  return (
    <section className="border-y border-border/70 bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Sådan virker det
          </h2>
          <p className="mt-4 text-muted-foreground">
            Tre enkle trin fra annonce til en vurdering du kan handle ud fra.
          </p>
        </div>

        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="relative rounded-xl border bg-card p-6 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <step.icon className="size-5" />
                </span>
                <span className="text-sm font-semibold text-muted-foreground">
                  Trin {index + 1}
                </span>
              </div>
              <h3 className="mt-4 font-semibold">{step.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

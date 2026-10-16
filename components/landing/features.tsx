import {
  Coins,
  MessageCircleQuestionMark,
  ShieldAlert,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: ShieldAlert,
    title: "Risikovurdering",
    description:
      "Få et hurtigt overblik over advarselstegn og hvor stor risikoen er ved netop denne bil.",
  },
  {
    icon: Wrench,
    title: "Kendte problemer",
    description:
      "Se typiske fejl ved modellen, motoren og gearkassen, så du ved hvad du skal holde øje med.",
  },
  {
    icon: Coins,
    title: "Prisvurdering",
    description:
      "Er prisen rimelig? Vi vurderer den ift. årgang, kilometerstand og det danske marked.",
  },
  {
    icon: MessageCircleQuestionMark,
    title: "Spørgsmål til sælger",
    description:
      "Mød velforberedt op med konkrete spørgsmål, der afslører bilens reelle tilstand.",
  },
];

export function Features() {
  return (
    <section id="fordele" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Alt du skal bruge for at handle trygt
        </h2>
        <p className="mt-4 text-muted-foreground">
          BilSikker samler det vigtigste i én overskuelig rapport, så du kan
          træffe en god beslutning.
        </p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => (
          <Card key={feature.title} className="h-full transition-shadow hover:shadow-md">
            <CardContent className="flex flex-col gap-4">
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <feature.icon className="size-6" />
              </span>
              <div className="space-y-1.5">
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

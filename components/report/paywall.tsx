"use client";

import { LoaderCircle, Lock, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface PaywallProps {
  price?: string;
  pending: boolean;
  onUnlock: () => void;
}

const INCLUDED = [
  "Samlet score og konklusion",
  "Kendte modelproblemer og risici",
  "Prisvurdering ift. markedet",
  "Spørgsmål til sælger og tjekliste",
  "Klar købsanbefaling",
];

export function Paywall({ price = "29 kr.", pending, onUnlock }: PaywallProps) {
  return (
    <Card className="border-2 border-dashed border-primary/30 bg-primary/[0.02]">
      <CardContent className="flex flex-col items-center gap-5 py-8 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Sparkles className="size-6" />
        </span>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold">
            Lås den fulde købsvurdering op
          </h2>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
            Det officielle overblik ovenfor er gratis. Få vores AI-gennemgang af
            netop denne bil med:
          </p>
        </div>

        <ul className="mx-auto grid max-w-sm gap-2 text-left text-sm">
          {INCLUDED.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <Button
          size="xl"
          onClick={onUnlock}
          disabled={pending}
          className="w-full max-w-xs"
        >
          {pending ? (
            <>
              <LoaderCircle className="size-5 animate-spin" />
              Låser op...
            </>
          ) : (
            <>
              <Lock className="size-5" />
              Lås op for {price}
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground">
          Test-tilstand: ingen rigtig betaling endnu.
        </p>
      </CardContent>
    </Card>
  );
}

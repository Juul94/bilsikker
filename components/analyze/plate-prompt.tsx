"use client";

import { useState } from "react";
import { ArrowRight, ScanLine, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AnalyzeNeedsPlateResponse } from "@/types/analysis";

interface PlatePromptProps {
  source: AnalyzeNeedsPlateResponse["source"];
  onSubmitPlate: (plate: string) => void;
  onSkip: () => void;
  onCancel: () => void;
}

const MIN_REG_LENGTH = 2;

export function PlatePrompt({
  source,
  onSubmitPlate,
  onSkip,
  onCancel,
}: PlatePromptProps) {
  const [plate, setPlate] = useState("");
  const canSubmit = plate.trim().length >= MIN_REG_LENGTH;
  const title = source.ad?.title;
  // `extracted: false` means we never got the ad itself (typically the site
  // blocked automated reading). The plate is then the only way forward.
  const blocked = source.extracted === false;

  return (
    <Card>
      <CardContent className="space-y-6 py-8">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
            <ScanLine className="size-6 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">
            {blocked ? "Vi kunne ikke læse annoncen" : "Vi fandt ikke nummerpladen"}
          </h2>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            {blocked ? (
              <>
                Annoncesiden blokerer automatisk indlæsning. Indtast bilens
                nummerplade, så henter vi den officielle historik — syn,
                kilometer og gæld — direkte fra registrene.
              </>
            ) : (
              <>
                {title ? `Annoncen "${title}" ` : "Annoncen "}
                indeholder ingen nummerplade. Indtast den for at få bilens
                officielle historik — syn, kilometer og gæld.
              </>
            )}
          </p>
        </div>

        <form
          className="mx-auto flex max-w-sm flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (canSubmit) onSubmitPlate(plate.trim());
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="followup-reg">Nummerplade</Label>
            <Input
              id="followup-reg"
              autoFocus
              autoComplete="off"
              autoCapitalize="characters"
              placeholder="Fx DM 75 963"
              value={plate}
              onChange={(event) => setPlate(event.target.value)}
              className="uppercase placeholder:normal-case"
            />
          </div>
          <Button type="submit" disabled={!canSubmit}>
            Hent officiel historik
            <ArrowRight className="size-4" />
          </Button>
        </form>

        <div className="flex flex-col items-center gap-1">
          {!blocked && (
            <Button variant="ghost" onClick={onSkip}>
              Jeg har ikke nummerpladen — fortsæt uden
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={onCancel}
          >
            <X className="size-3" />
            Annullér
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

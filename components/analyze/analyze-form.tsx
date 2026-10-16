"use client";

import { Car, Link2, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { InputType } from "@/types/analysis";

interface AnalyzeFormProps {
  inputType: InputType;
  url: string;
  reg: string;
  pending: boolean;
  onInputTypeChange: (type: InputType) => void;
  onUrlChange: (value: string) => void;
  onRegChange: (value: string) => void;
  onSubmit: () => void;
}

const MIN_REG_LENGTH = 2;

export function AnalyzeForm({
  inputType,
  url,
  reg,
  pending,
  onInputTypeChange,
  onUrlChange,
  onRegChange,
  onSubmit,
}: AnalyzeFormProps) {
  const canSubmit =
    inputType === "link"
      ? url.trim().length > 0
      : reg.trim().length >= MIN_REG_LENGTH;

  return (
    <Card>
      <CardContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (canSubmit && !pending) onSubmit();
          }}
          className="space-y-6"
        >
          <Tabs
            value={inputType}
            onValueChange={(value) => onInputTypeChange(value as InputType)}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="link">
                <Link2 className="size-4" />
                Bilannonce-link
              </TabsTrigger>
              <TabsTrigger value="reg">
                <Car className="size-4" />
                Nummerplade
              </TabsTrigger>
            </TabsList>

            <TabsContent value="link" className="mt-4 space-y-2">
              <Label htmlFor="ad-url">Bilannonce-link</Label>
              <Input
                id="ad-url"
                type="url"
                inputMode="url"
                autoComplete="off"
                placeholder="Indsæt DBA- eller Bilbasen-link"
                value={url}
                onChange={(event) => onUrlChange(event.target.value)}
                disabled={pending}
              />
              <p className="text-xs text-muted-foreground">
                Vi henter automatisk titel, pris, kilometerstand og beskrivelse
                — og bilens officielle historik, hvis nummerpladen er i annoncen.
              </p>
            </TabsContent>

            <TabsContent value="reg" className="mt-4 space-y-2">
              <Label htmlFor="ad-reg">Nummerplade</Label>
              <Input
                id="ad-reg"
                autoComplete="off"
                autoCapitalize="characters"
                placeholder="Fx DM 75 963"
                value={reg}
                onChange={(event) => onRegChange(event.target.value)}
                disabled={pending}
                className="uppercase placeholder:normal-case"
              />
              <p className="text-xs text-muted-foreground">
                Slå bilen op direkte i de officielle registre — syn, kilometer og
                gæld. Du behøver ikke annoncen.
              </p>
            </TabsContent>
          </Tabs>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={!canSubmit || pending}
          >
            {pending ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                Analyserer...
              </>
            ) : (
              "Analyser"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

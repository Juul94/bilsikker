"use client";

import { useState } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AnalyzeForm } from "@/components/analyze/analyze-form";
import { AnalyzingState } from "@/components/analyze/analyzing-state";
import { PlatePrompt } from "@/components/analyze/plate-prompt";
import { ReportView } from "@/components/report/report-view";
import type {
  AnalyzeNeedsPlateResponse,
  AnalyzeOverviewResponse,
  AnalyzeRequestBody,
  AnalyzeResponse,
  CarAnalysis,
  InputType,
  UnlockResponse,
} from "@/types/analysis";

type Status = "idle" | "loading" | "needsPlate" | "success" | "error";

const GENERIC_ERROR =
  "Vi kunne ikke analysere bilen. Prøv igen, eller slå bilen op på nummerplade.";

export function AnalyzeFlow() {
  const [inputType, setInputType] = useState<InputType>("link");
  const [url, setUrl] = useState("");
  const [reg, setReg] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [overview, setOverview] = useState<AnalyzeOverviewResponse | null>(
    null
  );
  const [analysis, setAnalysis] = useState<CarAnalysis | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [needsPlateSource, setNeedsPlateSource] =
    useState<AnalyzeNeedsPlateResponse["source"] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function runAnalyze(payload: AnalyzeRequestBody) {
    setStatus("loading");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as AnalyzeResponse;

      if (!data.ok) {
        setStatus("error");
        setErrorMessage(data.message || GENERIC_ERROR);
        return;
      }

      if ("needsPlate" in data) {
        setNeedsPlateSource(data.source);
        setStatus("needsPlate");
        return;
      }

      setOverview(data);
      setAnalysis(null);
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMessage(GENERIC_ERROR);
    }
  }

  /** Paid step: runs the AI buy-advice for the already-fetched car. */
  async function handleUnlock() {
    if (!overview) return;
    setUnlocking(true);
    setErrorMessage(null);

    try {
      // TODO(payment): collect payment before calling unlock. For the MVP we
      // just assert payment and let the endpoint run the analysis.
      const response = await fetch("/api/analyze/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(overview.context),
      });

      const data = (await response.json()) as UnlockResponse;

      if (!data.ok) {
        setErrorMessage(data.message || GENERIC_ERROR);
        return;
      }

      setAnalysis(data.analysis);
    } catch {
      setErrorMessage(GENERIC_ERROR);
    } finally {
      setUnlocking(false);
    }
  }

  function handleSubmit() {
    if (inputType === "link") {
      runAnalyze({ inputType: "link", url });
    } else {
      runAnalyze({ inputType: "reg", regNumber: reg });
    }
  }

  function reset() {
    setStatus("idle");
    setOverview(null);
    setAnalysis(null);
    setUnlocking(false);
    setNeedsPlateSource(null);
    setErrorMessage(null);
    setUrl("");
    setReg("");
  }

  if (status === "success" && overview) {
    return (
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button variant="outline" onClick={reset}>
            <RotateCcw className="size-4" />
            Analyser en ny bil
          </Button>
        </div>
        {errorMessage && (
          <Alert variant="destructive">
            <TriangleAlert />
            <AlertTitle>Noget gik galt</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
        <ReportView
          source={overview.source}
          analysis={analysis}
          unlocking={unlocking}
          onUnlock={handleUnlock}
        />
      </div>
    );
  }

  if (status === "loading") {
    return <AnalyzingState />;
  }

  if (status === "needsPlate" && needsPlateSource) {
    return (
      <PlatePrompt
        source={needsPlateSource}
        onSubmitPlate={(plate) =>
          runAnalyze({ inputType: "link", url, regNumber: plate })
        }
        onSkip={() => runAnalyze({ inputType: "link", url, skipRegister: true })}
        onCancel={reset}
      />
    );
  }

  return (
    <div className="space-y-4">
      {status === "error" && errorMessage && (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>Noget gik galt</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <AnalyzeForm
        inputType={inputType}
        url={url}
        reg={reg}
        pending={false}
        onInputTypeChange={setInputType}
        onUrlChange={setUrl}
        onRegChange={setReg}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

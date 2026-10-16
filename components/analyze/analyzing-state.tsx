import { LoaderCircle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function AnalyzingState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-6 py-12 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
          <LoaderCircle className="size-8 animate-spin text-primary" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold">Analyserer bil...</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            BilSikker gennemgår annoncen og vurderer styrker, risici, kendte
            problemer og pris.
          </p>
        </div>
        <div className="w-full max-w-md space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      </CardContent>
    </Card>
  );
}

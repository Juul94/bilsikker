import { ShieldCheck } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 bg-muted/30">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="size-4 text-primary" />
          <span>BilSikker — hurtig vurdering af brugte biler.</span>
        </div>
        <p className="max-w-md text-center text-xs text-muted-foreground sm:text-right">
          BilSikker giver en vejledende AI-vurdering og erstatter ikke et fysisk
          tjek hos en mekaniker.
        </p>
      </div>
    </footer>
  );
}

import { Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ComingSoonFieldProps {
  label: string;
  placeholder: string;
}

export function ComingSoonField({ label, placeholder }: ComingSoonFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-muted-foreground">{label}</Label>
        <Badge variant="secondary" className="gap-1 text-muted-foreground">
          <Lock className="size-3" />
          Kommer snart
        </Badge>
      </div>
      <Input placeholder={placeholder} disabled aria-disabled />
    </div>
  );
}

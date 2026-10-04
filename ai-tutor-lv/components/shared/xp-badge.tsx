import { Sparkles } from "lucide-react";

export function XpBadge({ value }: { value: number }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-sm font-medium text-foreground">
      <Sparkles className="h-4 w-4" />
      {value} XP
    </div>
  );
}

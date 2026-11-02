import type { SwatchKey } from "@/data/catalogue";
import { cn } from "@/lib/utils";

export function Swatch({
  swatch,
  className,
}: {
  swatch?: SwatchKey | undefined;
  className?: string;
}) {
  if (!swatch) return null;
  return (
    <span
      aria-hidden
      className={cn("inline-block rounded-full border border-border", className)}
      style={{ background: `var(--swatch-${swatch})` }}
    />
  );
}

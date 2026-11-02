import {
  Droplet,
  Home,
  Monitor,
  NotebookPen,
  ShoppingBag,
  SprayCan,
  type LucideProps,
} from "lucide-react";
import type { CategorySlug } from "@/data/catalogue";
import { cn } from "@/lib/utils";

const ICONS: Record<CategorySlug, React.ComponentType<LucideProps>> = {
  fournitures: NotebookPen,
  informatique: Monitor,
  beaute: Droplet,
  parfumerie: SprayCan,
  mode: ShoppingBag,
  maison: Home,
};

export const CATEGORY_BG: Record<CategorySlug, string> = {
  fournitures: "bg-cat-fournitures",
  informatique: "bg-cat-informatique",
  beaute: "bg-cat-beaute",
  parfumerie: "bg-cat-parfumerie",
  mode: "bg-cat-mode",
  maison: "bg-cat-maison",
};

export const CATEGORY_TEXT: Record<CategorySlug, string> = {
  fournitures: "text-cat-fournitures",
  informatique: "text-cat-informatique",
  beaute: "text-cat-beaute",
  parfumerie: "text-cat-parfumerie",
  mode: "text-cat-mode",
  maison: "text-cat-maison",
};

export function CategoryIcon({
  slug,
  className,
  size = "md",
}: {
  slug: CategorySlug;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const Icon = ICONS[slug];
  const dims = size === "lg" ? "h-16 w-16" : size === "sm" ? "h-9 w-9" : "h-12 w-12";
  const icon = size === "lg" ? "h-7 w-7" : size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full text-ink-foreground shadow-soft",
        dims,
        CATEGORY_BG[slug],
        className,
      )}
    >
      <Icon className={icon} strokeWidth={1.8} />
    </span>
  );
}

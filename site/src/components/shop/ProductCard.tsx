import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { getCategory, type Product } from "@/data/catalogue";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/shop";
import { cn } from "@/lib/utils";
import { CATEGORY_TEXT } from "./CategoryIcon";
import { ProductImage } from "./ProductImage";
import { Swatch } from "./Swatch";

export function ProductCard({
  product,
  className,
  tone = "light",
}: {
  product: Product;
  className?: string;
  tone?: "light" | "dark";
}) {
  const { add } = useCart();
  const hasVariants = product.variants.length > 0;
  const cat = getCategory(product.category);

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift",
        tone === "dark" && "border-transparent",
        className,
      )}
    >
      <Link
        to="/produit/$slug"
        params={{ slug: product.slug }}
        className="block focus-visible:outline-none"
        aria-label={product.name}
      >
        <ProductImage product={product} className="aspect-square" />
        {product.brand && (
          <span className="absolute left-3 top-3 rounded-full bg-card/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-foreground backdrop-blur">
            {product.brand}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <p
          className={cn(
            "text-[11px] font-semibold uppercase tracking-[0.14em]",
            CATEGORY_TEXT[product.category],
          )}
        >
          {product.subcategory}
          <span className="sr-only"> · {cat?.name}</span>
        </p>
        <Link
          to="/produit/$slug"
          params={{ slug: product.slug }}
          className="line-clamp-2 font-semibold leading-snug text-card-foreground hover:text-gold-deep"
        >
          {product.name}
        </Link>

        {hasVariants ? (
          <div className="flex items-center gap-1.5" aria-label="Coloris disponibles">
            {product.variants.map((v) => (
              <Swatch key={v.sku} swatch={v.swatch} className="h-4 w-4" />
            ))}
            <span className="ml-1 text-xs text-muted-foreground">
              {product.variants.length} {product.variants.length > 1 ? "coloris" : "coloris"}
            </span>
          </div>
        ) : product.options ? (
          <p className="line-clamp-1 text-xs text-muted-foreground">{product.options}</p>
        ) : (
          <div className="h-4" />
        )}

        <div className="mt-auto flex flex-col items-stretch gap-2 pt-2 @min-[15rem]:flex-row @min-[15rem]:items-center @min-[15rem]:justify-between">
          <span
            className={cn(
              "font-semibold",
              product.price != null ? "text-lg text-gold-deep" : "text-sm text-muted-foreground",
            )}
          >
            {formatPrice(product.price)}
          </span>
          {hasVariants ? (
            <Link
              to="/produit/$slug"
              params={{ slug: product.slug }}
              className="inline-flex h-10 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:shadow-gold"
            >
              Choisir
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => add(product.id)}
              className="inline-flex h-10 items-center gap-1 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:shadow-gold"
              aria-label={`Ajouter ${product.name} au panier`}
            >
              <Plus className="h-4 w-4" /> Ajouter
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

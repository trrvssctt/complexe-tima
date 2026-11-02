import type { Product } from "@/data/catalogue";
import { productImage } from "@/lib/product-images";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "./CategoryIcon";

export function ProductImage({
  product,
  className,
  eager,
  sizes = "(min-width: 1024px) 25vw, 50vw",
  src: override,
}: {
  product: Product;
  className?: string;
  eager?: boolean;
  sizes?: string;
  /** Photo à afficher (galerie de la fiche produit) ; par défaut la principale. */
  src?: string | undefined;
}) {
  // Photo ajoutée dans l'espace boutique, sinon photo d'origine du dossier assets
  const src = override ?? product.images?.[0] ?? productImage(product.id);
  return (
    <div className={cn("relative overflow-hidden bg-photo", className)}>
      {src ? (
        <img
          src={src}
          alt={product.brand ? `${product.name} ${product.brand}` : product.name}
          loading={eager ? "eager" : "lazy"}
          width={1024}
          height={1024}
          sizes={sizes}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
      ) : (
        <div className="grid h-full w-full place-items-center">
          <CategoryIcon slug={product.category} size="lg" />
        </div>
      )}
    </div>
  );
}

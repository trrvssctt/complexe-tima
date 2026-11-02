import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { CATEGORIES } from "@/data/catalogue";
import { useCatalogue } from "@/lib/catalogue";
import { CategoryIcon } from "@/components/shop/CategoryIcon";
import { ProductCard } from "@/components/shop/ProductCard";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  q: z.string().optional(),
  rayon: z.string().optional(),
});

export const Route = createFileRoute("/boutique")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Tous les produits — Complexe Tima" },
      {
        name: "description",
        content:
          "Le catalogue complet de Complexe Tima : fournitures, informatique, beauté, parfumerie, mode et maison.",
      },
      { property: "og:title", content: "Tous les produits — Complexe Tima" },
      {
        property: "og:description",
        content: "Parcourez tout le catalogue et commandez sur WhatsApp.",
      },
    ],
  }),
  component: BoutiquePage,
});

function BoutiquePage() {
  const { q, rayon } = Route.useSearch();
  const { searchProducts } = useCatalogue();
  const results = searchProducts(q ?? "").filter((p) => !rayon || p.category === rayon);

  return (
    <div className="container-shop pt-8">
      <p className="eyebrow">Catalogue</p>
      <h1 className="mt-2 text-4xl font-bold md:text-5xl">
        {q ? <>Résultats pour « {q} »</> : "Tous nos produits"}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {results.length} produit{results.length > 1 ? "s" : ""}
      </p>

      <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto pb-1">
        <Link
          to="/boutique"
          search={{ q }}
          className={cn(
            "flex h-11 shrink-0 items-center rounded-full border px-5 text-sm font-semibold",
            !rayon ? "border-ink bg-ink text-ink-foreground" : "bg-card hover:border-ink",
          )}
        >
          Tout
        </Link>
        {CATEGORIES.map((c) => (
          <Link
            key={c.slug}
            to="/boutique"
            search={{ q, rayon: c.slug }}
            className={cn(
              "flex h-11 shrink-0 items-center gap-2 rounded-full border py-1 pl-1 pr-4 text-sm font-medium",
              rayon === c.slug
                ? "border-ink bg-ink text-ink-foreground"
                : "bg-card hover:border-ink",
            )}
          >
            <CategoryIcon slug={c.slug} size="sm" className="h-8 w-8" />
            {c.name}
          </Link>
        ))}
      </div>

      {results.length === 0 ? (
        <div className="mt-12 rounded-3xl border bg-card p-10 text-center shadow-soft">
          <h2 className="text-2xl font-bold">Aucun produit trouvé</h2>
          <p className="mt-2 text-muted-foreground">
            Essayez un autre mot, ou demandez-nous directement sur WhatsApp.
          </p>
          <Link to="/boutique" className="mt-5 inline-block font-semibold text-gold-deep underline">
            Voir tout le catalogue
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {results.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

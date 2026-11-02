import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CATEGORIES, getCategory, type CategorySlug } from "@/data/catalogue";
import { useCatalogue } from "@/lib/catalogue";
import { CategoryIcon } from "@/components/shop/CategoryIcon";
import { ProductCard } from "@/components/shop/ProductCard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/rayon/$slug")({
  loader: ({ params }) => {
    const category = getCategory(params.slug);
    if (!category) throw notFound();
    return { category };
  },
  head: ({ loaderData }) => {
    if (!loaderData)
      return {
        meta: [
          { title: "Rayon introuvable — Complexe Tima" },
          { name: "robots", content: "noindex" },
        ],
      };
    const { category } = loaderData;
    return {
      meta: [
        { title: `${category.fullName} — Complexe Tima Dakar` },
        { name: "description", content: category.description },
        { property: "og:title", content: `${category.fullName} — Complexe Tima` },
        { property: "og:description", content: category.description },
      ],
    };
  },
  component: RayonPage,
  notFoundComponent: () => (
    <div className="container-shop py-24 text-center">
      <h1 className="text-3xl font-bold">Rayon introuvable</h1>
      <Link to="/boutique" className="mt-4 inline-block font-semibold text-gold-deep underline">
        Voir tous les produits
      </Link>
    </div>
  ),
});

function RayonPage() {
  const { category } = Route.useLoaderData();
  const slug = category.slug as CategorySlug;
  const { getProductsByCategory, getSubcategories } = useCatalogue();
  const all = getProductsByCategory(slug);
  const subs = getSubcategories(slug);
  const [active, setActive] = useState<string | null>(null);
  const [sort, setSort] = useState<"pertinence" | "az">("pertinence");

  const products = useMemo(() => {
    const list = active ? all.filter((p) => p.subcategory === active) : all;
    return sort === "az" ? [...list].sort((a, b) => a.name.localeCompare(b.name, "fr")) : list;
  }, [all, active, sort]);

  return (
    <div className="container-shop pt-6">
      <nav aria-label="Fil d'Ariane" className="text-sm text-muted-foreground">
        <Link to="/" className="underline-offset-4 hover:underline">
          Accueil
        </Link>
        <span className="mx-2">/</span>
        <span className="font-semibold text-foreground">{category.fullName}</span>
      </nav>

      <header className="mt-6 flex items-start gap-5">
        <CategoryIcon slug={slug} size="lg" />
        <div className="min-w-0">
          <h1 className="text-4xl font-bold md:text-5xl">{category.fullName}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">{category.description}</p>
        </div>
      </header>

      <div className="no-scrollbar mt-8 flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActive(null)}
          className={cn(
            "h-11 shrink-0 rounded-full border px-5 text-sm font-semibold transition",
            active === null ? "border-ink bg-ink text-ink-foreground" : "bg-card hover:border-ink",
          )}
        >
          Tout · {all.length}
        </button>
        {subs.map((s) => {
          const n = all.filter((p) => p.subcategory === s).length;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setActive(s)}
              className={cn(
                "h-11 shrink-0 rounded-full border px-5 text-sm font-medium transition",
                active === s ? "border-ink bg-ink text-ink-foreground" : "bg-card hover:border-ink",
              )}
            >
              {s} <span className="opacity-60">· {n}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {products.length} produit{products.length > 1 ? "s" : ""}
        </p>
        <label className="flex items-center gap-2 text-sm">
          Trier par
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="h-10 rounded-full border border-input bg-card px-4 outline-none focus:border-gold"
          >
            <option value="pertinence">Pertinence</option>
            <option value="az">Nom (A → Z)</option>
          </select>
        </label>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      <section className="mt-20">
        <h2 className="text-2xl font-bold">Les autres rayons</h2>
        <div className="mt-5 flex flex-wrap gap-3">
          {CATEGORIES.filter((c) => c.slug !== slug).map((c) => (
            <Link
              key={c.slug}
              to="/rayon/$slug"
              params={{ slug: c.slug }}
              className="flex items-center gap-3 rounded-full border bg-card py-2 pl-2 pr-5 shadow-soft transition hover:shadow-lift"
            >
              <CategoryIcon slug={c.slug} size="sm" />
              <span className="font-semibold">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

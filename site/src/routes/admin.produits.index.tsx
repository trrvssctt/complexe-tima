import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { PageHeader, adminCard, adminInput } from "@/components/admin/ui";
import { listProducts, setProductVisibility } from "@/functions/admin";
import { formatPrice } from "@/lib/shop";
import { cn } from "@/lib/utils";

const search = z.object({
  q: z.string().max(80).optional(),
  univers: z.string().max(40).optional(),
  visibilite: z.enum(["visible", "masque"]).optional(),
});

export const Route = createFileRoute("/admin/produits/")({
  validateSearch: (s) => search.parse(s),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => listProducts({ data: deps }),
  component: ProductsPage,
});

function ProductsPage() {
  const { rows, universes } = Route.useLoaderData();
  const filters = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const router = useRouter();
  const [term, setTerm] = useState(filters.q ?? "");
  const [busy, setBusy] = useState<number | null>(null);

  async function toggle(id: number, visible: boolean) {
    setBusy(id);
    try {
      await setProductVisibility({ data: { id, visible } });
      await router.invalidate();
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Produits et stock"
        subtitle="Ce que voient les clients. Sans prix, un produit s’affiche « Prix sur demande »."
      />
      <form
        className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          void navigate({ search: (s) => ({ ...s, q: term.trim() || undefined }) });
        }}
      >
        <label htmlFor="q" className="sr-only">
          Rechercher un produit
        </label>
        <input
          id="q"
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Nom, SKU ou marque"
          maxLength={80}
          className={adminInput}
        />
        <label htmlFor="univers" className="sr-only">
          Rayon
        </label>
        <select
          id="univers"
          value={filters.univers ?? ""}
          onChange={(e) =>
            void navigate({ search: (s) => ({ ...s, univers: e.target.value || undefined }) })
          }
          className={adminInput}
        >
          <option value="">Tous les rayons</option>
          {universes.map((u) => (
            <option key={u.slug} value={u.slug}>
              {u.shortName}
            </option>
          ))}
        </select>
        <label htmlFor="visibilite" className="sr-only">
          Visibilité
        </label>
        <select
          id="visibilite"
          value={filters.visibilite ?? ""}
          onChange={(e) =>
            void navigate({
              search: (s) => ({
                ...s,
                visibilite: (e.target.value || undefined) as "visible" | "masque" | undefined,
              }),
            })
          }
          className={adminInput}
        >
          <option value="">Visibles et masqués</option>
          <option value="visible">Visibles</option>
          <option value="masque">Masqués</option>
        </select>
        <button
          type="submit"
          className="h-12 rounded-full bg-ink px-5 font-semibold text-ink-foreground"
        >
          Rechercher
        </button>
      </form>
      <p className="text-sm text-muted-foreground">
        {rows.length} produit{rows.length > 1 ? "s" : ""}
      </p>
      <ul className={cn(adminCard, "divide-y !py-1")}>
        {rows.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
            <div className="min-w-0 flex-1 basis-60">
              <Link
                to="/admin/produits/$id"
                params={{ id: String(p.id) }}
                className="font-semibold underline"
              >
                {p.name}
              </Link>
              <p className="text-sm text-muted-foreground">
                {p.universeName} · {p.sku}
                {p.variantCount > 1 && ` · ${p.variantCount} variantes`}
                {p.needsReview && (
                  <span className="font-semibold text-gold-deep"> · à vérifier</span>
                )}
              </p>
            </div>
            <span className="w-36 text-right text-sm tabular-nums">
              {p.price === null ? (
                <span className="text-muted-foreground">Prix sur demande</span>
              ) : (
                formatPrice(p.price)
              )}
              {p.price !== null && p.missingPrices > 0 && (
                <span className="block text-xs text-gold-deep">{p.missingPrices} sans prix</span>
              )}
            </span>
            <span className="w-20 text-right text-sm text-muted-foreground tabular-nums">
              Stock {p.stock}
            </span>
            <button
              type="button"
              disabled={busy === p.id}
              onClick={() => toggle(p.id, !p.visible)}
              aria-label={`${p.visible ? "Masquer" : "Afficher"} ${p.name} sur le site`}
              className={cn(
                "h-9 w-28 rounded-full text-sm font-semibold disabled:opacity-60",
                p.visible ? "bg-whatsapp-soft text-whatsapp" : "bg-sand text-muted-foreground",
              )}
            >
              {p.visible ? "Visible" : "Masqué"}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { ImageOff, Plus, Search, Star } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { PageHeader, adminCard, adminInput } from "@/components/admin/ui";
import { Switch } from "@/components/ui/switch";
import { listProducts, setProductVisibility } from "@/functions/admin";
import { productImage } from "@/lib/product-images";
import { formatPrice } from "@/lib/shop";
import { cn } from "@/lib/utils";

const search = z.object({
  q: z.string().max(80).optional(),
  univers: z.string().max(40).optional(),
  visibilite: z.enum(["visible", "masque"]).optional(),
  manque: z.enum(["prix", "achat", "photo"]).optional(),
});

export const Route = createFileRoute("/admin/produits/")({
  validateSearch: (s) => search.parse(s),
  loaderDeps: ({ search: { q, univers, visibilite } }) => ({ q, univers, visibilite }),
  loader: ({ deps }) => listProducts({ data: deps }),
  component: ProductsPage,
});

function ProductsPage() {
  const { rows: all, universes } = Route.useLoaderData();
  const filters = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const router = useRouter();
  const [term, setTerm] = useState(filters.q ?? "");
  const [busy, setBusy] = useState<number | null>(null);

  const photoOf = (p: (typeof all)[number]) => p.image ?? productImage(p.sku);
  const missing = {
    prix: all.filter((p) => p.missingPrices > 0).length,
    achat: all.filter((p) => p.cost === null).length,
    photo: all.filter((p) => !photoOf(p)).length,
  };
  const rows = all.filter((p) =>
    filters.manque === "prix"
      ? p.missingPrices > 0
      : filters.manque === "achat"
        ? p.cost === null
        : filters.manque === "photo"
          ? !photoOf(p)
          : true,
  );

  async function toggle(id: number, visible: boolean) {
    setBusy(id);
    try {
      await setProductVisibility({ data: { id, visible } });
      await router.invalidate();
    } finally {
      setBusy(null);
    }
  }

  const kpi = "rounded-2xl border bg-card p-4 text-left shadow-soft transition hover:shadow-lift";
  return (
    <>
      <PageHeader
        title="Produits et stock"
        subtitle="Ce que voient les clients, avec vos prix de vente et d’achat."
      >
        <Link
          to="/admin/produits/nouveau"
          className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-5 font-semibold text-primary-foreground shadow-gold"
        >
          <Plus className="h-4 w-4" /> Nouveau produit
        </Link>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className={kpi}>
          <p className="text-xs text-muted-foreground">Produits</p>
          <p className="font-display text-3xl font-bold">{all.length}</p>
          <p className="text-xs text-muted-foreground">
            {all.filter((p) => p.visible).length} en ligne
          </p>
        </div>
        {(
          [
            ["prix", "Sans prix de vente", "« Prix sur demande »"],
            ["achat", "Sans prix d’achat", "Marge non calculée"],
            ["photo", "Sans photo", "Icône du rayon affichée"],
          ] as const
        ).map(([key, title, hint]) => (
          <button
            key={key}
            type="button"
            onClick={() =>
              void navigate({
                search: (s) => ({ ...s, manque: s.manque === key ? undefined : key }),
              })
            }
            className={cn(kpi, filters.manque === key && "ring-2 ring-gold")}
          >
            <p className="text-xs text-muted-foreground">{title}</p>
            <p
              className={cn(
                "font-display text-3xl font-bold",
                missing[key] > 0 && "text-gold-deep",
              )}
            >
              {missing[key]}
            </p>
            <p className="text-xs text-muted-foreground">
              {filters.manque === key ? "Filtre actif · cliquer pour retirer" : hint}
            </p>
          </button>
        ))}
      </div>

      <form
        className="grid gap-2 sm:grid-cols-[1fr_auto_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          void navigate({ search: (s) => ({ ...s, q: term.trim() || undefined }) });
        }}
      >
        <span className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <label htmlFor="q" className="sr-only">
            Rechercher un produit
          </label>
          <input
            id="q"
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Nom, référence ou marque — Entrée pour chercher"
            maxLength={80}
            className={`${adminInput} pl-9`}
          />
        </span>
        <select
          aria-label="Rayon"
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
        <select
          aria-label="Visibilité"
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
          <option value="visible">En ligne</option>
          <option value="masque">Masqués</option>
        </select>
      </form>

      <p className="text-sm text-muted-foreground">
        {rows.length} produit{rows.length > 1 ? "s" : ""}
      </p>
      <ul className={cn(adminCard, "divide-y !p-0")}>
        {rows.map((p) => {
          const photo = photoOf(p);
          const margin = p.price !== null && p.cost !== null ? p.price - p.cost : null;
          return (
            <li
              key={p.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 hover:bg-sand/40"
            >
              <Link
                to="/admin/produits/$id"
                params={{ id: String(p.id) }}
                className="flex min-w-0 flex-1 basis-72 items-center gap-3"
              >
                <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border bg-sand">
                  {photo ? (
                    <img src={photo} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <ImageOff className="h-5 w-5 text-muted-foreground" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <span className="truncate">{p.name}</span>
                    {p.featured && (
                      <Star
                        className="h-3.5 w-3.5 shrink-0 fill-gold text-gold"
                        aria-label="Mis en avant"
                      />
                    )}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {p.universeName} · {p.sku}
                    {p.variantCount > 1 && ` · ${p.variantCount} variantes`}
                    {p.needsReview && (
                      <span className="font-semibold text-gold-deep"> · à vérifier</span>
                    )}
                  </span>
                </span>
              </Link>
              <span className="w-32 text-right text-sm">
                <span className="block font-semibold tabular-nums">
                  {p.price === null ? (
                    <span className="font-normal text-muted-foreground">Sur demande</span>
                  ) : (
                    formatPrice(p.price)
                  )}
                </span>
                <span className="block text-xs text-muted-foreground tabular-nums">
                  {p.cost === null ? "Achat : —" : `Achat : ${formatPrice(p.cost)}`}
                </span>
              </span>
              <span
                className={cn(
                  "w-24 text-right text-sm font-semibold tabular-nums",
                  margin === null
                    ? "text-muted-foreground"
                    : margin >= 0
                      ? "text-whatsapp"
                      : "text-destructive",
                )}
              >
                {margin === null ? "—" : `${Math.round((margin / (p.price || 1)) * 100)} %`}
                <span className="block text-xs font-normal text-muted-foreground">marge</span>
              </span>
              <span
                className={cn(
                  "w-20 text-right text-sm tabular-nums",
                  p.stock === 0 ? "text-muted-foreground" : "font-semibold",
                )}
              >
                {p.stock}
                <span className="block text-xs font-normal text-muted-foreground">en stock</span>
              </span>
              <label className="flex w-28 items-center justify-end gap-2 text-sm">
                <span className={p.visible ? "text-whatsapp" : "text-muted-foreground"}>
                  {p.visible ? "En ligne" : "Masqué"}
                </span>
                <Switch
                  checked={p.visible}
                  disabled={busy === p.id}
                  onCheckedChange={(c) => void toggle(p.id, c)}
                  aria-label={`${p.visible ? "Masquer" : "Mettre en ligne"} ${p.name}`}
                />
              </label>
            </li>
          );
        })}
        {rows.length === 0 && (
          <li className="p-6 text-muted-foreground">Aucun produit pour ces critères.</li>
        )}
      </ul>
    </>
  );
}

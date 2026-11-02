import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Alert, FieldError, adminCard, adminInput } from "@/components/admin/ui";
import { getProduct, saveProduct } from "@/functions/admin";

export const Route = createFileRoute("/admin/produits/$id")({
  loader: ({ params }) => getProduct({ data: { id: Number(params.id) } }),
  head: () => ({ meta: [{ title: "Modifier un produit — Espace boutique" }] }),
  component: EditProduct,
});

const label = "mb-1.5 block text-sm font-semibold";

function EditProduct() {
  const p = Route.useLoaderData();
  const router = useRouter();
  const [state, setState] = useState<{
    ok?: boolean;
    error?: string;
    fieldErrors?: Record<string, string>;
  }>({});
  const [pending, setPending] = useState(false);
  const err = (key: string) => <FieldError message={state.fieldErrors?.[key]} />;
  const noPrice = p.variants.filter((v) => v.active && v.price === null).length;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const str = (k: string) => String(f.get(k) ?? "");
    setPending(true);
    try {
      const res = await saveProduct({
        data: {
          id: p.id,
          name: str("name"),
          description: str("description"),
          brand: str("brand"),
          categoryId: f.get("categoryId") ? Number(f.get("categoryId")) : null,
          optionsNote: str("optionsNote"),
          visible: f.get("visible") === "on",
          featured: f.get("featured") === "on",
          giftIdea: f.get("giftIdea") === "on",
          needsReview: f.get("needsReview") === "on",
          internalNote: str("internalNote"),
          variants: p.variants.map((v) => ({
            id: v.id,
            price: str(`v-${v.id}-price`),
            stock: str(`v-${v.id}-stock`),
            lowStockThreshold: str(`v-${v.id}-threshold`),
            active: f.get(`v-${v.id}-active`) === "on",
          })),
        },
      });
      setState(res);
      if (res.ok) await router.invalidate();
    } catch {
      setState({ error: "Enregistrement impossible. Réessayez." });
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Link to="/admin/produits" className="text-sm text-muted-foreground underline">
        ← Produits et stock
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold lg:text-4xl">{p.name}</h1>
          <p className="text-muted-foreground">
            {p.universeName} · {p.sku}
          </p>
        </div>
        {p.visible && (
          <a
            href={`/produit/${p.slug}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold text-gold-deep underline"
          >
            Voir sur le site
          </a>
        )}
      </div>

      <form onSubmit={submit} className="grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="flex flex-col gap-6">
          <section className={`${adminCard} space-y-4`}>
            <h2 className="text-2xl font-bold">Présentation</h2>
            <div>
              <label htmlFor="name" className={label}>
                Nom affiché sur le site
              </label>
              <input
                id="name"
                name="name"
                defaultValue={p.name}
                required
                maxLength={150}
                className={adminInput}
                aria-invalid={!!state.fieldErrors?.["name"]}
              />
              {err("name")}
            </div>
            <div>
              <label htmlFor="description" className={label}>
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                maxLength={3000}
                defaultValue={p.description ?? ""}
                className="w-full rounded-xl border border-input bg-card p-3.5 outline-none focus:border-gold"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="brand" className={label}>
                  Marque
                </label>
                <input
                  id="brand"
                  name="brand"
                  defaultValue={p.brand ?? ""}
                  maxLength={80}
                  className={adminInput}
                />
              </div>
              <div>
                <label htmlFor="categoryId" className={label}>
                  Sous-catégorie
                </label>
                <select
                  id="categoryId"
                  name="categoryId"
                  defaultValue={p.categoryId ?? ""}
                  className={adminInput}
                >
                  <option value="">—</option>
                  {p.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {err("categoryId")}
              </div>
            </div>
            <div>
              <label htmlFor="optionsNote" className={label}>
                Choix à préciser à la commande
              </label>
              <input
                id="optionsNote"
                name="optionsNote"
                defaultValue={p.optionsNote ?? ""}
                maxLength={200}
                placeholder="Ex. Plusieurs teintes — demandez la liste"
                className={adminInput}
              />
            </div>
          </section>

          <section className={`${adminCard} space-y-4`}>
            <div>
              <h2 className="text-2xl font-bold">Prix et stock</h2>
              <p className="text-sm text-muted-foreground">
                En F CFA. Sans prix : « Prix sur demande », la boutique confirme sur WhatsApp.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="pb-2 font-medium">{p.optionNames[0] ?? "Article"}</th>
                    <th className="pb-2 font-medium">Prix</th>
                    <th className="pb-2 font-medium">Stock</th>
                    <th className="pb-2 font-medium">Seuil</th>
                    <th className="pb-2 font-medium">Actif</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {p.variants.map((v) => (
                    <tr key={v.id} className="align-top">
                      <td className="py-2 pr-3">
                        <span className="font-semibold">
                          {Object.values(v.options).join(", ") || "Article unique"}
                        </span>
                        <span className="block text-xs text-muted-foreground">{v.sku}</span>
                      </td>
                      {(["price", "stock", "threshold"] as const).map((f) => (
                        <td key={f} className="py-2 pr-3">
                          <label htmlFor={`v-${v.id}-${f}`} className="sr-only">
                            {f === "price" ? "Prix" : f === "stock" ? "Stock" : "Seuil d’alerte"}{" "}
                            {v.sku}
                          </label>
                          <input
                            id={`v-${v.id}-${f}`}
                            name={`v-${v.id}-${f}`}
                            inputMode="numeric"
                            defaultValue={
                              f === "price"
                                ? (v.price ?? "")
                                : f === "stock"
                                  ? v.stock
                                  : v.lowStockThreshold
                            }
                            placeholder={f === "price" ? "Sur demande" : ""}
                            aria-invalid={!!state.fieldErrors?.[`v-${v.id}-${f}`]}
                            className={`${adminInput} ${f === "price" ? "w-32" : "w-20"}`}
                          />
                          {err(`v-${v.id}-${f}`)}
                        </td>
                      ))}
                      <td className="py-2">
                        <label className="flex h-12 items-center">
                          <span className="sr-only">Article actif {v.sku}</span>
                          <input
                            type="checkbox"
                            name={`v-${v.id}-active`}
                            defaultChecked={v.active}
                            className="h-5 w-5 accent-[var(--ink)]"
                          />
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-6 lg:sticky lg:top-6">
          <section className={`${adminCard} space-y-3`}>
            <h2 className="text-2xl font-bold">Sur le site</h2>
            {(
              [
                ["visible", "Visible sur le site", p.visible],
                ["featured", "Mis en avant sur l’accueil", p.featured],
                ["giftIdea", "Proposé en idée cadeau", p.giftIdea],
                ["needsReview", "Fiche à vérifier", p.needsReview],
              ] as const
            ).map(([name, text, checked]) => (
              <label key={name} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name={name}
                  defaultChecked={checked}
                  className="h-5 w-5 accent-[var(--ink)]"
                />
                {text}
              </label>
            ))}
            {noPrice > 0 && (
              <p className="rounded-xl bg-sand px-3 py-2 text-sm">
                {noPrice} article{noPrice > 1 ? "s" : ""} sans prix : affiché
                {noPrice > 1 ? "s" : ""} « Prix sur demande ».
              </p>
            )}
            <div>
              <label htmlFor="internalNote" className={label}>
                Note interne
              </label>
              <textarea
                id="internalNote"
                name="internalNote"
                rows={3}
                maxLength={2000}
                defaultValue={p.internalNote ?? ""}
                className="w-full rounded-xl border border-input bg-card p-3.5 text-sm outline-none focus:border-gold"
              />
            </div>
          </section>
          {state.error && <Alert tone="error">{state.error}</Alert>}
          {state.ok && !pending && <Alert tone="success">Enregistré. Le site est à jour.</Alert>}
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary font-semibold text-primary-foreground shadow-gold disabled:opacity-70"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {pending ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </>
  );
}

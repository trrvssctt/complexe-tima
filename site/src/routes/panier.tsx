import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  Loader2,
  MessageCircle,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { submitOrder } from "@/functions/orders";
import { useCatalogue } from "@/lib/catalogue";
import { ProductImage } from "@/components/shop/ProductImage";
import { Swatch } from "@/components/shop/Swatch";
import { useCart } from "@/lib/cart";
import { buildOrderMessage, cartTotal, formatPrice, type OrderDetails } from "@/lib/shop";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/panier")({
  head: () => ({
    meta: [
      { title: "Mon panier — Complexe Tima" },
      {
        name: "description",
        content: "Vérifiez votre panier et envoyez votre commande sur WhatsApp à Complexe Tima.",
      },
      { property: "og:title", content: "Mon panier — Complexe Tima" },
      {
        property: "og:description",
        content: "Envoyez votre commande sur WhatsApp, livraison Dakar ou retrait en boutique.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CartPage,
});

function Choice({
  checked,
  onSelect,
  title,
  text,
  name,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  text: string;
  name: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-2xl border bg-card p-4 transition",
        checked ? "border-ink ring-1 ring-ink" : "hover:border-ink/40",
      )}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        className="mt-1 accent-[var(--ink)]"
      />
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-muted-foreground">{text}</span>
      </span>
    </label>
  );
}

type Confirmed = { number: string; total: number | null; message: string; whatsappUrl: string };

function FieldError({ message }: { message?: string | undefined }) {
  return message ? (
    <span className="mt-1 block text-sm font-medium text-destructive">{message}</span>
  ) : null;
}

function CartPage() {
  const catalogue = useCatalogue();
  const { lines, setQty, remove, count, clear } = useCart();
  const [details, setDetails] = useState<OrderDetails>({ delivery: "livraison", payment: "wave" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmed, setConfirmed] = useState<Confirmed | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const total = cartTotal(catalogue, lines);
  const message = buildOrderMessage(catalogue, lines, details);
  const set = (patch: Partial<OrderDetails>) => setDetails((d) => ({ ...d, ...patch }));

  async function validate() {
    setPending(true);
    setFormError(null);
    try {
      const res = await submitOrder({
        data: {
          name: details.name ?? "",
          phone: details.phone ?? "",
          delivery: details.delivery,
          address: details.delivery === "livraison" ? (details.address ?? "") : undefined,
          payment: details.payment,
          note: details.note,
          website: honeypot,
          lines,
        },
      });
      if (res.ok) {
        clear();
        setConfirmed(res);
        window.scrollTo({ top: 0 });
        return;
      }
      if ("removedSkus" in res && res.removedSkus) res.removedSkus.forEach((sku) => remove(sku));
      setErrors(("fieldErrors" in res && res.fieldErrors) || {});
      setFormError(res.formError ?? "Vérifiez les champs signalés.");
    } catch {
      setFormError("Connexion impossible. Vérifiez votre réseau et réessayez.");
    } finally {
      setPending(false);
    }
  }

  if (confirmed) {
    return (
      <div className="container-shop py-16">
        <div className="mx-auto max-w-xl rounded-3xl border bg-card p-8 text-center shadow-lift">
          <CheckCircle2 className="mx-auto h-12 w-12 text-whatsapp" />
          <p className="eyebrow mt-4">Commande enregistrée</p>
          <h1 className="mt-2 text-4xl font-bold">Commande {confirmed.number}</h1>
          <p className="mt-3 text-muted-foreground">
            Dernière étape : envoyez-la sur WhatsApp. La boutique vous confirme
            {confirmed.total == null ? " les prix," : ""} la disponibilité et la livraison.
          </p>
          <a
            href={confirmed.whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-whatsapp px-4 font-semibold text-whatsapp-foreground transition hover:brightness-110"
          >
            <MessageCircle className="h-5 w-5" /> Envoyer sur WhatsApp
          </a>
          <details className="mt-4 rounded-xl bg-whatsapp-soft p-3 text-left text-xs">
            <summary className="cursor-pointer font-semibold text-whatsapp">
              Voir le message
            </summary>
            <pre className="mt-2 whitespace-pre-wrap font-sans text-foreground/80">
              {confirmed.message}
            </pre>
          </details>
          <Link
            to="/boutique"
            className="mt-6 inline-block text-sm font-semibold text-gold-deep underline-offset-4 hover:underline"
          >
            Continuer mes achats
          </Link>
        </div>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="container-shop py-20 text-center">
        <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-sand text-gold-deep">
          <ShoppingBag className="h-8 w-8" />
        </span>
        <h1 className="mt-6 text-4xl font-bold">Votre panier est vide</h1>
        <p className="mt-3 text-muted-foreground">Parcourez nos rayons et ajoutez vos articles.</p>
        <Link
          to="/boutique"
          className="mt-8 inline-flex h-12 items-center rounded-full bg-primary px-7 font-semibold text-primary-foreground shadow-gold"
        >
          Voir les produits
        </Link>
      </div>
    );
  }

  return (
    <div className="container-shop pt-8">
      <p className="eyebrow">Mon panier</p>
      <h1 className="mt-2 text-4xl font-bold md:text-5xl">Panier et commande</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-10">
          <ul className="divide-y rounded-2xl border bg-card px-4 shadow-soft md:px-6">
            {lines.map((line) => {
              const found = catalogue.findBySku(line.sku);
              if (!found) return null;
              const { product, variant } = found;
              const unit = catalogue.unitPrice(line.sku);
              return (
                <li
                  key={line.sku}
                  className="grid grid-cols-[80px_minmax(0,1fr)] gap-4 py-5 md:grid-cols-[96px_minmax(0,1fr)_auto]"
                >
                  <Link to="/produit/$slug" params={{ slug: product.slug }} className="group">
                    <ProductImage
                      product={product}
                      className="aspect-square rounded-xl"
                      sizes="96px"
                    />
                  </Link>
                  <div className="min-w-0">
                    <Link
                      to="/produit/$slug"
                      params={{ slug: product.slug }}
                      className="font-semibold hover:text-gold-deep"
                    >
                      {product.name}
                    </Link>
                    {variant && (
                      <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                        <Swatch swatch={variant.swatch} className="h-3.5 w-3.5" /> {variant.label}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">Réf. {line.sku}</p>
                    <div className="mt-3 inline-flex h-10 items-center rounded-full border-2 border-ink">
                      <button
                        type="button"
                        aria-label="Diminuer"
                        onClick={() => setQty(line.sku, line.qty - 1)}
                        className="grid h-full w-10 place-items-center"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold">{line.qty}</span>
                      <button
                        type="button"
                        aria-label="Augmenter"
                        onClick={() => setQty(line.sku, line.qty + 1)}
                        className="grid h-full w-10 place-items-center"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="col-span-2 flex items-center justify-between md:col-span-1 md:flex-col md:items-end">
                    <span
                      className={cn(
                        "font-semibold",
                        unit != null ? "text-gold-deep" : "text-sm text-muted-foreground",
                      )}
                    >
                      {unit != null ? formatPrice(unit * line.qty) : "Prix sur demande"}
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(line.sku)}
                      className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:text-destructive hover:underline"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Retirer
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <section>
            <h2 className="text-2xl font-bold">Livraison ou retrait</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Choice
                name="delivery"
                checked={details.delivery === "livraison"}
                onSelect={() => set({ delivery: "livraison" })}
                title="Livraison à Dakar et banlieue"
                text="Tarif confirmé par la boutique selon votre zone"
              />
              <Choice
                name="delivery"
                checked={details.delivery === "retrait"}
                onSelect={() => set({ delivery: "retrait" })}
                title="Retrait en boutique"
                text="Sans frais de livraison"
              />
            </div>
            {details.delivery === "livraison" && (
              <label className="mt-4 block">
                <span className="text-sm font-semibold">Adresse ou quartier</span>
                <input
                  value={details.address ?? ""}
                  onChange={(e) => set({ address: e.target.value })}
                  placeholder="Ex. quartier, repère"
                  aria-invalid={!!errors["address"]}
                  className="mt-1.5 h-12 w-full rounded-xl border border-input bg-card px-4 outline-none focus:border-gold aria-invalid:border-destructive"
                />
                <FieldError message={errors["address"]} />
              </label>
            )}
          </section>

          <section>
            <h2 className="text-2xl font-bold">Paiement</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Choice
                name="pay"
                checked={details.payment === "wave"}
                onSelect={() => set({ payment: "wave" })}
                title="Wave"
                text="Instructions envoyées sur WhatsApp"
              />
              <Choice
                name="pay"
                checked={details.payment === "orange-money"}
                onSelect={() => set({ payment: "orange-money" })}
                title="Orange Money"
                text="Instructions envoyées sur WhatsApp"
              />
              <Choice
                name="pay"
                checked={details.payment === "livraison"}
                onSelect={() => set({ payment: "livraison" })}
                title="À la livraison"
                text="En espèces au livreur ou en boutique"
              />
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold">Vos coordonnées</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold">Nom</span>
                <input
                  value={details.name ?? ""}
                  onChange={(e) => set({ name: e.target.value })}
                  placeholder="Prénom et nom"
                  autoComplete="name"
                  aria-invalid={!!errors["name"]}
                  className="mt-1.5 h-12 w-full rounded-xl border border-input bg-card px-4 outline-none focus:border-gold aria-invalid:border-destructive"
                />
                <FieldError message={errors["name"]} />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Téléphone</span>
                <input
                  value={details.phone ?? ""}
                  onChange={(e) => set({ phone: e.target.value })}
                  placeholder="77 123 45 67"
                  inputMode="tel"
                  autoComplete="tel"
                  aria-invalid={!!errors["phone"]}
                  className="mt-1.5 h-12 w-full rounded-xl border border-input bg-card px-4 outline-none focus:border-gold aria-invalid:border-destructive"
                />
                <FieldError message={errors["phone"]} />
              </label>
              {/* Piège à robots : invisible pour les humains */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                className="hidden"
              />
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-40 lg:self-start">
          <div className="rounded-2xl border bg-card p-6 shadow-lift">
            <h2 className="text-2xl font-bold">Récapitulatif</h2>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt>Articles</dt>
                <dd className="font-semibold">{count}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Livraison</dt>
                <dd className="font-semibold">
                  {details.delivery === "retrait" ? "Retrait gratuit" : "Selon la zone"}
                </dd>
              </div>
            </dl>
            <div className="gold-rule my-5" />
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">Total</span>
              <span
                className={cn("font-bold", total != null ? "text-2xl text-gold-deep" : "text-base")}
              >
                {total != null ? formatPrice(total) : "Confirmé sur WhatsApp"}
              </span>
            </div>
            {formError && (
              <p
                role="alert"
                className="mt-5 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
              >
                {formError}
              </p>
            )}
            <button
              type="button"
              onClick={validate}
              disabled={pending}
              className="mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-whatsapp px-4 text-center font-semibold text-whatsapp-foreground transition hover:brightness-110 disabled:opacity-70"
            >
              {pending ? (
                <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
              ) : (
                <MessageCircle className="h-5 w-5 shrink-0" />
              )}
              {pending ? "Enregistrement…" : "Valider et envoyer sur WhatsApp"}
            </button>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Votre commande est enregistrée avec un numéro, puis envoyée sur WhatsApp avec vos
              produits et vos choix. La boutique vous confirme prix, disponibilité et livraison.
            </p>
            <details className="mt-4 rounded-xl bg-whatsapp-soft p-3 text-xs">
              <summary className="cursor-pointer font-semibold text-whatsapp">
                Voir le message
              </summary>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-foreground/80">{message}</pre>
            </details>
            <button
              type="button"
              onClick={clear}
              className="mt-4 text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              Vider le panier
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Loader2, MessageCircle, Pencil } from "lucide-react";
import { useState } from "react";
import { Alert, FieldError, StatusBadge, adminCard, adminInput } from "@/components/admin/ui";
import {
  advanceOrder,
  cancelOrder,
  getOrder,
  markOrderPaid,
  saveOrderNote,
  updateOrderPricing,
} from "@/functions/admin";
import {
  FULFILLMENT,
  NEXT_STATUS,
  ORDER_STATUS,
  ORIGIN,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  STEPS,
  formatDateTime,
  type OrderStatus,
} from "@/lib/admin-labels";
import { formatPrice } from "@/lib/shop";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/commandes/$numero")({
  loader: ({ params }) => getOrder({ data: { number: params.numero } }),
  head: ({ params }) => ({ meta: [{ title: `Commande ${params.numero} — Espace boutique` }] }),
  component: OrderPage,
});

const formatPhone = (p: string) => {
  const m = p.replace(/\D/g, "").match(/^221(\d{2})(\d{3})(\d{2})(\d{2})$/);
  return m ? `+221 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : p;
};

function OrderPage() {
  const order = Route.useLoaderData();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState(order.internalNote ?? "");

  const next = NEXT_STATUS[order.status];
  const stepIndex = STEPS.indexOf(order.status);
  const closed = order.status === "livree" || order.status === "annulee";
  const reply = `https://wa.me/${order.customerPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
    `Bonjour ${order.customerName.split(" ")[0]}, ici Complexe Tima au sujet de votre commande ${order.number}.`,
  )}`;

  async function run(key: string, action: () => Promise<unknown>, confirmMessage?: string) {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setBusy(key);
    setError(null);
    try {
      await action();
      await router.invalidate();
    } catch {
      setError("L’action n’a pas pu être enregistrée. Réessayez.");
    } finally {
      setBusy(null);
    }
  }

  const describe = (e: (typeof order.events)[number]) => {
    const label = (v: string | null) => (v ? (ORDER_STATUS[v as OrderStatus] ?? v) : "");
    if (e.type === "statut")
      return e.fromValue
        ? `${label(e.fromValue)} → ${label(e.toValue)}`
        : `Commande reçue (${label(e.toValue)})`;
    if (e.type === "paiement") return "Paiement confirmé";
    if (e.type === "note") return "Note interne modifiée";
    if (e.type === "prix") return "Prix et livraison mis à jour";
    return e.type;
  };

  return (
    <>
      <Link to="/admin/commandes" className="text-sm text-muted-foreground underline">
        ← Toutes les commandes
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tabular-nums lg:text-4xl">Commande {order.number}</h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="mt-1 text-muted-foreground">
            Reçue le {formatDateTime(new Date(order.createdAt))} · depuis{" "}
            {ORIGIN[order.origin].toLowerCase()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={reply}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-12 items-center gap-2 rounded-full border-2 border-whatsapp px-5 font-semibold text-whatsapp"
          >
            <MessageCircle className="h-4 w-4" /> Répondre sur WhatsApp
          </a>
          {next && (
            <button
              type="button"
              disabled={!!busy}
              onClick={() =>
                run("advance", () =>
                  advanceOrder({ data: { orderId: order.id, from: order.status } }),
                )
              }
              className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-5 font-semibold text-primary-foreground shadow-gold disabled:opacity-70"
            >
              {busy === "advance" && <Loader2 className="h-4 w-4 animate-spin" />}
              {next.label}
            </button>
          )}
        </div>
      </div>
      {error && <Alert tone="error">{error}</Alert>}

      {order.status !== "annulee" && (
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Avancement">
          {STEPS.map((s, i) => (
            <li
              key={s}
              aria-current={i === stepIndex ? "step" : undefined}
              className={cn(
                "rounded-xl px-3 py-2.5 text-sm",
                i <= stepIndex
                  ? "bg-ink font-semibold text-ink-foreground"
                  : "border bg-card text-muted-foreground",
              )}
            >
              {i + 1} · {ORDER_STATUS[s]}
              {i === stepIndex && " (en cours)"}
            </li>
          ))}
        </ol>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="flex flex-col gap-6">
          <ItemsSection order={order} onSaved={() => router.invalidate()} />

          <section className={adminCard}>
            <h2 className="mb-3 text-2xl font-bold">Notes internes</h2>
            <label htmlFor="note" className="sr-only">
              Note interne
            </label>
            <textarea
              id="note"
              rows={3}
              maxLength={2000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Visible uniquement dans l’espace boutique"
              className="w-full rounded-xl border border-input bg-card p-3.5 outline-none focus:border-gold"
            />
            <button
              type="button"
              disabled={!!busy}
              onClick={() =>
                run("note", () => saveOrderNote({ data: { orderId: order.id, note } }))
              }
              className="mt-3 inline-flex h-11 items-center gap-2 rounded-full border-2 border-ink px-5 font-semibold disabled:opacity-70"
            >
              {busy === "note" && <Loader2 className="h-4 w-4 animate-spin" />}
              Enregistrer la note
            </button>
          </section>

          <section className={adminCard}>
            <h2 className="mb-3 text-2xl font-bold">Historique</h2>
            <ul className="space-y-2 text-sm">
              {order.events.map((e) => (
                <li key={e.id} className="flex flex-wrap justify-between gap-2">
                  <span>{describe(e)}</span>
                  <span className="text-muted-foreground">
                    {formatDateTime(new Date(e.createdAt))}
                    {e.author && ` · ${e.author}`}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section className={adminCard}>
            <h2 className="mb-3 text-2xl font-bold">Client</h2>
            <p className="font-semibold">{order.customerName}</p>
            <a href={`tel:${order.customerPhone}`} className="underline">
              {formatPhone(order.customerPhone)}
            </a>
            {order.fulfillment === "livraison" && (
              <p className="mt-2 text-muted-foreground">Livraison : {order.address}</p>
            )}
          </section>

          <section className={adminCard}>
            <h2 className="mb-3 text-2xl font-bold">Livraison et paiement</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Mode</dt>
                <dd>{FULFILLMENT[order.fulfillment]}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Paiement</dt>
                <dd>{PAYMENT_METHOD[order.paymentMethod]}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Statut</dt>
                <dd
                  className={cn(
                    "font-semibold",
                    order.paymentStatus === "paye" ? "text-whatsapp" : "text-gold-deep",
                  )}
                >
                  {PAYMENT_STATUS[order.paymentStatus]}
                  {order.paidAt && ` le ${formatDateTime(new Date(order.paidAt))}`}
                </dd>
              </div>
            </dl>
            {order.paymentStatus !== "paye" && order.status !== "annulee" && (
              <button
                type="button"
                disabled={!!busy}
                onClick={() =>
                  run(
                    "paid",
                    () => markOrderPaid({ data: { orderId: order.id } }),
                    order.total != null
                      ? `Confirmer le paiement de ${formatPrice(order.total)} ?`
                      : "Confirmer le paiement de cette commande ?",
                  )
                }
                className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink font-semibold text-ink-foreground disabled:opacity-70"
              >
                {busy === "paid" && <Loader2 className="h-4 w-4 animate-spin" />}
                Marquer comme payé
              </button>
            )}
          </section>

          {!closed && (
            <button
              type="button"
              disabled={!!busy}
              onClick={() =>
                run(
                  "cancel",
                  () => cancelOrder({ data: { orderId: order.id } }),
                  `Annuler la commande ${order.number} ? Cette action est définitive.`,
                )
              }
              className="self-start text-sm text-destructive underline"
            >
              Annuler la commande
            </button>
          )}
        </div>
      </div>
    </>
  );
}

type Order = Awaited<ReturnType<typeof getOrder>>;

/** Articles, coûts et marge ; fixation des prix sur demande et des frais de livraison. */
function ItemsSection({ order, onSaved }: { order: Order; onSaved: () => Promise<void> }) {
  const editable = order.status !== "annulee";
  const unpriced = order.items.some(({ item }) => item.unitPrice == null);
  const [editing, setEditing] = useState(editable && unpriced);
  const [prices, setPrices] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      order.items.map(({ item }) => [
        item.id,
        item.unitPrice == null ? "" : String(item.unitPrice),
      ]),
    ),
  );
  const [fee, setFee] = useState(String(order.deliveryFee ?? 0));
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ error?: string; fieldErrors?: Record<string, string> }>(
    {},
  );

  const known = order.items.filter(({ item }) => item.lineTotal != null);
  const cost = known.reduce((s, { item }) => s + (item.unitCost ?? 0) * item.quantity, 0);
  const costedRevenue = known
    .filter(({ item }) => item.unitCost != null)
    .reduce((s, { item }) => s + item.lineTotal!, 0);
  const margin = costedRevenue - cost;

  async function save() {
    setPending(true);
    setResult({});
    try {
      const res = await updateOrderPricing({
        data: {
          orderId: order.id,
          deliveryFee: fee,
          lines: order.items.map(({ item }) => ({
            itemId: item.id,
            unitPrice: prices[item.id] ?? "",
          })),
        },
      });
      if (res.ok) {
        setEditing(false);
        await onSaved();
      } else setResult(res);
    } catch {
      setResult({ error: "Enregistrement impossible. Réessayez." });
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={adminCard}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-bold">Articles</h2>
        {editable && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gold-deep underline"
          >
            <Pencil className="h-3.5 w-3.5" /> Modifier les prix
          </button>
        )}
      </div>
      {editing && unpriced && (
        <p className="mb-3 rounded-xl bg-sand px-3 py-2 text-sm">
          Fixez les prix confirmés au client sur WhatsApp : le total et les statistiques seront mis
          à jour.
        </p>
      )}
      {result.error && <Alert tone="error">{result.error}</Alert>}
      <ul className="divide-y">
        {order.items.map(({ item, productId }, i) => (
          <li key={item.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
            <div className="min-w-0 flex-1 basis-56">
              {productId ? (
                <Link
                  to="/admin/produits/$id"
                  params={{ id: String(productId) }}
                  className="font-semibold underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="font-semibold">{item.label}</span>
              )}
              <p className="text-xs text-muted-foreground">
                {[
                  ...Object.values(item.options),
                  item.sku,
                  item.unitCost != null ? `achat ${formatPrice(item.unitCost)}` : "achat inconnu",
                ].join(" · ")}
              </p>
            </div>
            <span className="w-10 text-right tabular-nums">× {item.quantity}</span>
            {editing ? (
              <span className="w-40">
                <label htmlFor={`price-${item.id}`} className="sr-only">
                  Prix unitaire de {item.label}
                </label>
                <input
                  id={`price-${item.id}`}
                  inputMode="numeric"
                  value={prices[item.id] ?? ""}
                  onChange={(e) => setPrices((p) => ({ ...p, [item.id]: e.target.value }))}
                  placeholder="Prix unitaire"
                  aria-invalid={!!result.fieldErrors?.[`lines.${i}.unitPrice`]}
                  className={cn(adminInput, "h-10 text-right")}
                />
                <FieldError message={result.fieldErrors?.[`lines.${i}.unitPrice`]} />
              </span>
            ) : (
              <span className="w-40 text-right">
                <span className="block font-semibold tabular-nums">
                  {item.lineTotal != null ? formatPrice(item.lineTotal) : "À confirmer"}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {item.unitPrice != null
                    ? `${formatPrice(item.unitPrice)} l’unité`
                    : "Prix sur demande"}
                </span>
              </span>
            )}
          </li>
        ))}
      </ul>
      <div className="gold-rule my-4" />
      <dl className="space-y-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt>Sous-total</dt>
          <dd className="tabular-nums">
            {order.subtotal != null ? formatPrice(order.subtotal) : "À confirmer"}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt>Livraison</dt>
          <dd>
            {editing ? (
              <span className="block w-40">
                <label htmlFor="fee" className="sr-only">
                  Frais de livraison
                </label>
                <input
                  id="fee"
                  inputMode="numeric"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  aria-invalid={!!result.fieldErrors?.["deliveryFee"]}
                  className={cn(adminInput, "h-10 text-right")}
                />
                <FieldError message={result.fieldErrors?.["deliveryFee"]} />
              </span>
            ) : (
              <span className="tabular-nums">
                {order.fulfillment === "retrait" && !order.deliveryFee
                  ? "Retrait (gratuit)"
                  : formatPrice(order.deliveryFee)}
              </span>
            )}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 text-lg">
          <dt className="font-semibold">Total</dt>
          <dd className="font-bold text-gold-deep tabular-nums">
            {order.total != null ? formatPrice(order.total) : "Prix à confirmer"}
          </dd>
        </div>
        {known.length > 0 && cost > 0 && (
          <div className="flex justify-between gap-3 text-muted-foreground">
            <dt>Coût d’achat · marge</dt>
            <dd className="tabular-nums">
              {formatPrice(cost)} ·{" "}
              <span
                className={
                  margin >= 0 ? "font-semibold text-whatsapp" : "font-semibold text-destructive"
                }
              >
                {formatPrice(margin)}
              </span>
            </dd>
          </div>
        )}
      </dl>
      {editing && (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={save}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 font-semibold text-primary-foreground shadow-gold disabled:opacity-70"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer les prix
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="h-11 px-3 text-sm text-muted-foreground underline"
          >
            Annuler
          </button>
        </div>
      )}
    </section>
  );
}

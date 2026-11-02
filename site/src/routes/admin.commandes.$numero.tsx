import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Loader2, MessageCircle } from "lucide-react";
import { useState } from "react";
import { Alert, StatusBadge, adminCard } from "@/components/admin/ui";
import {
  advanceOrder,
  cancelOrder,
  getOrder,
  markOrderPaid,
  saveOrderNote,
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
          <section className={adminCard}>
            <h2 className="mb-3 text-2xl font-bold">Articles</h2>
            <ul className="divide-y">
              {order.items.map(({ item, productId }) => (
                <li key={item.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                  <div className="min-w-0 flex-1">
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
                    <p className="text-sm text-muted-foreground">
                      {[
                        ...Object.values(item.options),
                        item.unitPrice != null ? formatPrice(item.unitPrice) : "Prix sur demande",
                        item.sku,
                      ].join(" · ")}
                    </p>
                  </div>
                  <span className="w-12 text-right tabular-nums">× {item.quantity}</span>
                  <span className="w-32 text-right font-semibold tabular-nums">
                    {item.lineTotal != null ? formatPrice(item.lineTotal) : "À confirmer"}
                  </span>
                </li>
              ))}
            </ul>
            <div className="gold-rule my-4" />
            <div className="flex items-baseline justify-between text-lg">
              <span className="font-semibold">
                Total{order.fulfillment === "livraison" ? " (hors livraison)" : ""}
              </span>
              <span className="font-bold text-gold-deep tabular-nums">
                {order.total != null ? formatPrice(order.total) : "Prix à confirmer"}
              </span>
            </div>
          </section>

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

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { PageHeader, StatusBadge, adminCard, adminInput } from "@/components/admin/ui";
import { listOrders } from "@/functions/admin";
import {
  FULFILLMENT,
  ORDER_STATUS,
  ORIGIN,
  PAYMENT_METHOD,
  formatDateTime,
  type OrderStatus,
} from "@/lib/admin-labels";
import { formatPrice } from "@/lib/shop";
import { cn } from "@/lib/utils";

const search = z.object({
  statut: z.string().max(30).optional(),
  q: z.string().max(80).optional(),
});

export const Route = createFileRoute("/admin/commandes/")({
  validateSearch: (s) => search.parse(s),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => listOrders({ data: deps }),
  component: OrdersPage,
});

const chip =
  "inline-flex h-11 shrink-0 items-center rounded-full border bg-card px-4 text-sm font-medium";
const chipOn =
  "inline-flex h-11 shrink-0 items-center rounded-full bg-ink px-4 text-sm font-bold text-ink-foreground";

function OrdersPage() {
  const { rows, byStatus, total, status } = Route.useLoaderData();
  const { q } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [term, setTerm] = useState(q ?? "");

  return (
    <>
      <PageHeader
        title="Commandes"
        subtitle="Les commandes passées sur le site, au même endroit."
      />
      <nav aria-label="Statuts" className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        <Link to="/admin/commandes" search={{ q }} className={!status ? chipOn : chip}>
          Toutes · {total}
        </Link>
        {(Object.keys(ORDER_STATUS) as OrderStatus[]).map((s) => (
          <Link
            key={s}
            to="/admin/commandes"
            search={{ statut: s, q }}
            className={status === s ? chipOn : chip}
          >
            {ORDER_STATUS[s]} · {byStatus[s] ?? 0}
          </Link>
        ))}
      </nav>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void navigate({ search: (s) => ({ ...s, q: term.trim() || undefined }) });
        }}
      >
        <label htmlFor="q" className="sr-only">
          Rechercher une commande
        </label>
        <input
          id="q"
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="N°, nom ou téléphone"
          maxLength={80}
          className={adminInput}
        />
        <button
          type="submit"
          className="h-12 shrink-0 rounded-full bg-ink px-5 font-semibold text-ink-foreground"
        >
          Rechercher
        </button>
      </form>
      {rows.length === 0 ? (
        <p className={cn(adminCard, "text-muted-foreground")}>
          Aucune commande{q || status ? " pour ces critères" : " pour l’instant"}.
        </p>
      ) : (
        <ul className={cn(adminCard, "divide-y !py-1")}>
          {rows.map((o) => (
            <li key={o.id}>
              <Link
                to="/admin/commandes/$numero"
                params={{ numero: o.number }}
                className="grid gap-1 py-3 hover:bg-sand/50 md:grid-cols-[110px_160px_1fr_130px_auto] md:items-center md:gap-4"
              >
                <span className="font-bold tabular-nums">{o.number}</span>
                <span className="text-sm text-muted-foreground">
                  {formatDateTime(new Date(o.createdAt))}
                </span>
                <span className="min-w-0 truncate">
                  {o.customerName}
                  <span className="text-sm text-muted-foreground">
                    {" "}
                    · {PAYMENT_METHOD[o.paymentMethod]}
                    {o.paymentStatus === "paye" && " (payé)"} · {FULFILLMENT[o.fulfillment]} ·{" "}
                    {ORIGIN[o.origin]}
                  </span>
                </span>
                <span className="font-semibold tabular-nums">
                  {o.total != null ? formatPrice(o.total) : "À confirmer"}
                </span>
                <StatusBadge status={o.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

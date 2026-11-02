import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MessageCircle, Search } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { PageHeader, StatusBadge, adminCard, adminInput } from "@/components/admin/ui";
import { listOrders } from "@/functions/admin";
import {
  FULFILLMENT,
  ORDER_STATUS,
  PAYMENT_METHOD,
  formatDateTime,
  type OrderStatus,
} from "@/lib/admin-labels";
import { formatPrice } from "@/lib/shop";
import { cn } from "@/lib/utils";

const search = z.object({
  statut: z.string().max(30).optional(),
  q: z.string().max(80).optional(),
  periode: z.enum(["jour", "7j", "30j", "annee"]).optional(),
  paiement: z.enum(["paye", "a_confirmer"]).optional(),
});

export const Route = createFileRoute("/admin/commandes/")({
  validateSearch: (s) => search.parse(s),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => listOrders({ data: deps }),
  component: OrdersPage,
});

const STATUS_ORDER: OrderStatus[] = ["nouvelle", "en_preparation", "prete", "livree", "annulee"];
const STATUS_DOT: Record<OrderStatus, string> = {
  nouvelle: "bg-[#2f6fd6]",
  en_preparation: "bg-[#d98a1c]",
  prete: "bg-[#7a4bb5]",
  livree: "bg-whatsapp",
  annulee: "bg-muted-foreground",
};

function OrdersPage() {
  const { rows, byStatus, total, amount, unpriced, status } = Route.useLoaderData();
  const filters = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [term, setTerm] = useState(filters.q ?? "");

  return (
    <>
      <PageHeader title="Commandes" subtitle="Toutes les commandes passées sur le site." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Link
          to="/admin/commandes"
          search={{ ...filters, statut: undefined }}
          className={cn("rounded-2xl border bg-card p-4 shadow-soft", !status && "ring-2 ring-ink")}
        >
          <p className="text-xs text-muted-foreground">Toutes</p>
          <p className="font-display text-3xl font-bold">{total}</p>
        </Link>
        {STATUS_ORDER.map((s) => (
          <Link
            key={s}
            to="/admin/commandes"
            search={{ ...filters, statut: s }}
            className={cn(
              "rounded-2xl border bg-card p-4 shadow-soft",
              status === s && "ring-2 ring-ink",
            )}
          >
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn("h-2 w-2 rounded-full", STATUS_DOT[s])} />
              {ORDER_STATUS[s]}
            </p>
            <p className="font-display text-3xl font-bold">{byStatus[s] ?? 0}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-2 lg:grid-cols-[1fr_auto_auto]">
        <form
          className="relative"
          onSubmit={(e) => {
            e.preventDefault();
            void navigate({ search: (s) => ({ ...s, q: term.trim() || undefined }) });
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <label htmlFor="q" className="sr-only">
            Rechercher une commande
          </label>
          <input
            id="q"
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="N°, nom ou téléphone — Entrée pour chercher"
            maxLength={80}
            className={`${adminInput} pl-9`}
          />
        </form>
        <select
          aria-label="Période"
          value={filters.periode ?? ""}
          onChange={(e) =>
            void navigate({
              search: (s) => ({
                ...s,
                periode: (e.target.value || undefined) as typeof filters.periode,
              }),
            })
          }
          className={adminInput}
        >
          <option value="">Toutes les dates</option>
          <option value="jour">Aujourd’hui</option>
          <option value="7j">7 derniers jours</option>
          <option value="30j">30 derniers jours</option>
          <option value="annee">12 derniers mois</option>
        </select>
        <select
          aria-label="Paiement"
          value={filters.paiement ?? ""}
          onChange={(e) =>
            void navigate({
              search: (s) => ({
                ...s,
                paiement: (e.target.value || undefined) as typeof filters.paiement,
              }),
            })
          }
          className={adminInput}
        >
          <option value="">Tous les paiements</option>
          <option value="paye">Payées</option>
          <option value="a_confirmer">Paiement à confirmer</option>
        </select>
      </div>

      <p className="text-sm text-muted-foreground">
        {rows.length} commande{rows.length > 1 ? "s" : ""} · montant {formatPrice(amount)}
        {status !== "annulee" && " (hors annulées)"}
        {unpriced > 0 && ` · ${unpriced} avec prix à confirmer`}
      </p>

      {rows.length === 0 ? (
        <p className={cn(adminCard, "text-muted-foreground")}>Aucune commande pour ces critères.</p>
      ) : (
        <div className={cn(adminCard, "overflow-x-auto !p-0")}>
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b bg-sand/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Commande</th>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Articles</th>
                <th className="px-4 py-3 text-right font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Paiement</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((o) => (
                <tr
                  key={o.id}
                  className="cursor-pointer hover:bg-sand/40"
                  onClick={() =>
                    void navigate({ to: "/admin/commandes/$numero", params: { numero: o.number } })
                  }
                >
                  <td className="px-4 py-3">
                    <Link
                      to="/admin/commandes/$numero"
                      params={{ numero: o.number }}
                      className="font-bold tabular-nums underline-offset-4 hover:underline"
                    >
                      {o.number}
                    </Link>
                    <span className="block text-xs text-muted-foreground">
                      {formatDateTime(new Date(o.createdAt))}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="block font-medium">{o.customerName}</span>
                    <a
                      href={`https://wa.me/${o.customerPhone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-xs text-whatsapp hover:underline"
                    >
                      <MessageCircle className="h-3 w-3" /> {o.customerPhone}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    {o.itemCount} · {FULFILLMENT[o.fulfillment]}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {o.total != null ? (
                      formatPrice(o.total)
                    ) : (
                      <span className="font-normal text-gold-deep">À confirmer</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="block">{PAYMENT_METHOD[o.paymentMethod]}</span>
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        o.paymentStatus === "paye" ? "text-whatsapp" : "text-muted-foreground",
                      )}
                    >
                      {o.paymentStatus === "paye" ? "Payée" : "À confirmer"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

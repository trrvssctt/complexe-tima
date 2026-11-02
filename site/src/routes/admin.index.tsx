import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, StatusBadge, adminCard } from "@/components/admin/ui";
import { getDashboard } from "@/functions/admin";
import { formatDay, formatTime } from "@/lib/admin-labels";
import { formatPrice } from "@/lib/shop";

export const Route = createFileRoute("/admin/")({
  loader: () => getDashboard(),
  component: Dashboard,
});

function Dashboard() {
  const d = Route.useLoaderData();
  const today = formatDay(new Date());
  return (
    <>
      <PageHeader
        title="Tableau de bord"
        subtitle={today.charAt(0).toUpperCase() + today.slice(1)}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className={adminCard}>
          <p className="text-sm text-muted-foreground">Commandes aujourd’hui</p>
          <p className="font-display text-4xl font-bold">{d.todayOrders}</p>
        </div>
        <Link to="/admin/commandes" className={`${adminCard} transition hover:shadow-lift`}>
          <p className="text-sm text-muted-foreground">À traiter</p>
          <p className="font-display text-4xl font-bold">{d.pending}</p>
          <p className="text-sm font-semibold text-gold-deep underline">Voir les commandes</p>
        </Link>
        <div className={adminCard}>
          <p className="text-sm text-muted-foreground">Ventes du jour (prix connus)</p>
          <p className="font-display text-4xl font-bold">{formatPrice(d.todaySales)}</p>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <section className={adminCard}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Commandes récentes</h2>
            <Link to="/admin/commandes" className="text-sm font-semibold text-gold-deep underline">
              Tout voir
            </Link>
          </div>
          {d.recent.length === 0 ? (
            <p className="text-muted-foreground">Aucune commande pour l’instant.</p>
          ) : (
            <ul className="divide-y">
              {d.recent.map((o) => (
                <li key={o.id}>
                  <Link
                    to="/admin/commandes/$numero"
                    params={{ numero: o.number }}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 hover:bg-sand/50"
                  >
                    <span className="font-bold tabular-nums">{o.number}</span>
                    <span className="min-w-0 flex-1 truncate">{o.customerName}</span>
                    <span className="text-sm text-muted-foreground">
                      {formatTime(new Date(o.createdAt))}
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
        </section>
        <section className={adminCard}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Stock à surveiller</h2>
            <Link to="/admin/produits" className="text-sm font-semibold text-gold-deep underline">
              Produits
            </Link>
          </div>
          {d.lowStock.length === 0 ? (
            <p className="text-muted-foreground">
              Rien à signaler parmi les produits avec un prix.
            </p>
          ) : (
            <ul className="divide-y">
              {d.lowStock.map((v, i) => (
                <li key={i}>
                  <Link
                    to="/admin/produits/$id"
                    params={{ id: String(v.productId) }}
                    className="flex items-center justify-between gap-3 py-3 hover:bg-sand/50"
                  >
                    <span className="min-w-0 truncate">
                      {v.name}
                      {Object.values(v.options).length > 0 && (
                        <span className="text-muted-foreground">
                          {" "}
                          · {Object.values(v.options).join(", ")}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 rounded-full bg-[#fbe6c8] px-2.5 py-1 text-xs font-bold text-[#6e3700]">
                      {v.stock <= 0 ? "Rupture" : `Plus que ${v.stock}`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

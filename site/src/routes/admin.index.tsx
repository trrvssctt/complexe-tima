import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  Coins,
  Package,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { z } from "zod";
import { PageHeader, StatusBadge, adminCard } from "@/components/admin/ui";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { getStats } from "@/functions/admin";
import {
  ORDER_STATUS,
  PAYMENT_METHOD,
  formatDay,
  formatTime,
  type OrderStatus,
} from "@/lib/admin-labels";
import { formatPrice } from "@/lib/shop";
import { cn } from "@/lib/utils";

const PERIODS = {
  jour: "Aujourd’hui",
  "7j": "7 jours",
  "30j": "30 jours",
  annee: "12 mois",
} as const;
type Period = keyof typeof PERIODS;

export const Route = createFileRoute("/admin/")({
  validateSearch: (s) =>
    z.object({ periode: z.enum(["jour", "7j", "30j", "annee"]).optional() }).parse(s),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getStats({ data: deps }),
  component: Dashboard,
});

const chartConfig = {
  revenue: { label: "Ventes", color: "var(--gold)" },
  cost: { label: "Coûts", color: "var(--ink)" },
} satisfies ChartConfig;

const compact = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M`
    : n >= 1000
      ? `${Math.round(n / 1000)} k`
      : String(n);

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Coins;
  label: string;
  value: string;
  hint?: string | undefined;
  tone?: "good" | "bad" | undefined;
}) {
  return (
    <div className={cn(adminCard, "flex flex-col gap-1")}>
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4 text-gold-deep" /> {label}
      </span>
      <span
        className={cn(
          "font-display text-3xl font-bold tabular-nums",
          tone === "good" && "text-whatsapp",
          tone === "bad" && "text-destructive",
        )}
      >
        {value}
      </span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

function Dashboard() {
  const s = Route.useLoaderData();
  const period = s.period as Period;
  const today = formatDay(new Date());
  const toHandle =
    (s.pending.nouvelle ?? 0) + (s.pending.en_preparation ?? 0) + (s.pending.prete ?? 0);
  const series = s.series.map((d) => ({
    ...d,
    name:
      period === "annee"
        ? new Date(`${d.label}-01T00:00:00Z`).toLocaleDateString("fr-FR", {
            month: "short",
            timeZone: "UTC",
          })
        : new Date(`${d.label}T00:00:00Z`).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
            timeZone: "UTC",
          }),
  }));
  const hasSales = series.some((d) => d.revenue > 0);

  return (
    <>
      <PageHeader title="Tableau de bord" subtitle={today.charAt(0).toUpperCase() + today.slice(1)}>
        <nav aria-label="Période" className="flex rounded-full border bg-card p-1">
          {(Object.keys(PERIODS) as Period[]).map((p) => (
            <Link
              key={p}
              to="/admin"
              search={{ periode: p }}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium",
                period === p
                  ? "bg-ink text-ink-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {PERIODS[p]}
            </Link>
          ))}
        </nav>
      </PageHeader>

      {toHandle > 0 && (
        <Link
          to="/admin/commandes"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ink px-5 py-4 text-ink-foreground shadow-lift"
        >
          <span className="flex items-center gap-3">
            <ShoppingBag className="h-5 w-5 text-gold" />
            <span>
              <strong>
                {toHandle} commande{toHandle > 1 ? "s" : ""} à traiter
              </strong>
              <span className="text-ink-foreground/70">
                {" "}
                ·{" "}
                {(["nouvelle", "en_preparation", "prete"] as OrderStatus[])
                  .filter((k) => s.pending[k])
                  .map((k) => `${s.pending[k]} ${ORDER_STATUS[k].toLowerCase()}`)
                  .join(", ")}
              </span>
            </span>
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-gold">
            Voir <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={Coins}
          label="Chiffre d’affaires"
          value={formatPrice(s.revenue)}
          hint={`${s.orders} commande${s.orders > 1 ? "s" : ""} · ${s.units} article${s.units > 1 ? "s" : ""}`}
        />
        <Kpi
          icon={Wallet}
          label="Coûts d’achat"
          value={formatPrice(s.cost)}
          hint={
            s.linesWithoutCost
              ? `${s.linesWithoutCost} ligne(s) sans prix d’achat`
              : "Prix d’achat figés à la commande"
          }
        />
        <Kpi
          icon={TrendingUp}
          label="Marge brute"
          value={formatPrice(s.margin)}
          hint={
            s.marginRate === null
              ? "Renseignez les prix d’achat"
              : `${s.marginRate} % du chiffre d’affaires`
          }
          tone={s.margin > 0 ? "good" : s.margin < 0 ? "bad" : undefined}
        />
        <Kpi
          icon={ShoppingBag}
          label="Panier moyen"
          value={formatPrice(s.avgBasket)}
          hint={`Encaissé : ${formatPrice(s.paid)}`}
        />
      </div>

      {s.unpricedOrders > 0 && (
        <p className="flex items-center gap-2 rounded-xl bg-sand px-4 py-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-gold-deep" />
          {s.unpricedOrders} commande{s.unpricedOrders > 1 ? "s" : ""} avec des articles « prix sur
          demande » : fixez les prix dans la commande pour les inclure aux statistiques.
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <section className={adminCard}>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-2xl font-bold">Ventes et coûts</h2>
              <p className="text-sm text-muted-foreground">
                {period === "annee"
                  ? "Par mois, sur 12 mois"
                  : period === "30j"
                    ? "Par jour, sur 30 jours"
                    : "Par jour, sur 7 jours"}
              </p>
            </div>
            <span className="flex gap-4 text-sm">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-gold" /> Ventes
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-ink" /> Coûts
              </span>
            </span>
          </div>
          {hasSales ? (
            <ChartContainer config={chartConfig} className="h-72 w-full">
              <BarChart data={series} margin={{ left: 4, right: 4 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  minTickGap={16}
                />
                <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={compact} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(v, n) =>
                        `${chartConfig[n as "revenue" | "cost"]?.label ?? n} : ${formatPrice(Number(v))}`
                      }
                    />
                  }
                />
                <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="cost" fill="var(--color-cost)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="grid h-72 place-items-center rounded-xl bg-sand/50 text-center text-sm text-muted-foreground">
              Pas encore de vente au prix connu sur cette période.
            </div>
          )}
        </section>

        <section className={adminCard}>
          <h2 className="mb-4 text-2xl font-bold">Meilleures ventes</h2>
          {s.top.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune vente sur cette période.</p>
          ) : (
            <ol className="space-y-3">
              {s.top.map((t, i) => (
                <li key={t.label} className="flex items-center gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-sand text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{t.label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {t.units} vendu{t.units > 1 ? "s" : ""}
                      {t.cost > 0 && ` · marge ${formatPrice(t.margin)}`}
                    </span>
                  </span>
                  <span className="text-sm font-semibold tabular-nums">
                    {t.revenue ? formatPrice(t.revenue) : "Sur demande"}
                  </span>
                </li>
              ))}
            </ol>
          )}
          {s.byPayment.length > 0 && (
            <>
              <h3 className="mb-2 mt-6 text-sm font-semibold text-muted-foreground">
                Moyens de paiement
              </h3>
              <ul className="space-y-1.5 text-sm">
                {s.byPayment.map((b) => (
                  <li key={b.method} className="flex justify-between">
                    <span>{PAYMENT_METHOD[b.method]}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {b.n} · {formatPrice(b.total)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className={cn(adminCard, "lg:col-span-2")}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Dernières commandes</h2>
            <Link to="/admin/commandes" className="text-sm font-semibold text-gold-deep underline">
              Tout voir
            </Link>
          </div>
          {s.recent.length === 0 ? (
            <p className="text-muted-foreground">Aucune commande pour l’instant.</p>
          ) : (
            <ul className="divide-y">
              {s.recent.map((o) => (
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
          <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold">
            <Package className="h-5 w-5 text-gold-deep" /> Stock
          </h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-sand/70 p-3">
              <dt className="text-xs text-muted-foreground">Valeur d’achat</dt>
              <dd className="font-semibold tabular-nums">{formatPrice(s.stock.costValue)}</dd>
            </div>
            <div className="rounded-xl bg-sand/70 p-3">
              <dt className="text-xs text-muted-foreground">Valeur de vente</dt>
              <dd className="font-semibold tabular-nums">{formatPrice(s.stock.saleValue)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-muted-foreground">
            {s.stock.units} article{s.stock.units > 1 ? "s" : ""} en stock · {s.stock.withoutCost}{" "}
            sans prix d’achat, {s.stock.withoutPrice} sans prix de vente
          </p>
          <h3 className="mb-2 mt-5 text-sm font-semibold text-muted-foreground">
            À réapprovisionner
          </h3>
          {s.lowStock.length === 0 ? (
            <p className="text-sm text-muted-foreground">Rien à signaler.</p>
          ) : (
            <ul className="divide-y">
              {s.lowStock.map((v, i) => (
                <li key={i}>
                  <Link
                    to="/admin/produits/$id"
                    params={{ id: String(v.productId) }}
                    className="flex items-center justify-between gap-3 py-2 text-sm hover:bg-sand/50"
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
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-xs font-bold",
                        v.stock <= 0
                          ? "bg-destructive/10 text-destructive"
                          : "bg-[#fbe6c8] text-[#6e3700]",
                      )}
                    >
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

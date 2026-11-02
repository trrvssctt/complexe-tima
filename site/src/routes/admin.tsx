import { createFileRoute, Link, Outlet, useNavigate, useRouter } from "@tanstack/react-router";
import { ExternalLink, LayoutDashboard, LogOut, Package, ShoppingBag } from "lucide-react";
import logo from "@/assets/logo-complexe-tima.webp";
import { adminLogout, getAdminShell } from "@/functions/admin";

/** Espace boutique : 404 sans session valide (vérifiée côté serveur à chaque chargement). */
export const Route = createFileRoute("/admin")({
  loader: () => getAdminShell(),
  head: () => ({
    meta: [
      { title: "Espace boutique — Complexe Tima" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { to: "/admin/commandes", label: "Commandes", icon: ShoppingBag, exact: false },
  { to: "/admin/produits", label: "Produits et stock", icon: Package, exact: false },
] as const;

function AdminLayout() {
  const shell = Route.useLoaderData();
  const navigate = useNavigate();
  const router = useRouter();
  const initials = shell.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function logout() {
    await adminLogout();
    router.clearCache();
    await navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background lg:grid lg:grid-cols-[264px_1fr]">
      <aside className="flex flex-col gap-4 bg-ink p-4 text-ink-foreground lg:sticky lg:top-0 lg:h-dvh lg:gap-8 lg:p-6">
        <div className="flex items-center gap-3">
          <img src={logo} alt="" width={44} height={44} className="h-11 w-11" />
          <div>
            <p className="font-display text-lg font-bold leading-tight">Complexe Tima</p>
            <p className="text-xs text-ink-foreground/60">Espace boutique</p>
          </div>
        </div>
        <nav
          aria-label="Espace boutique"
          className="no-scrollbar flex gap-1 overflow-x-auto lg:flex-col"
        >
          {NAV.map(({ to, label, icon: Icon, exact }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact }}
              className="flex h-11 shrink-0 items-center gap-3 rounded-xl px-3.5 font-medium text-ink-foreground/80 transition hover:bg-white/10"
              activeProps={{ className: "!bg-gold !font-bold !text-ink" }}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{label}</span>
              {to === "/admin/commandes" && shell.pendingOrders > 0 && (
                <span className="grid h-6 min-w-6 place-items-center rounded-full bg-ivory px-1.5 text-xs font-bold text-ink">
                  {shell.pendingOrders}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="mt-auto hidden flex-col gap-3 border-t border-white/10 pt-4 lg:flex">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm text-ink-foreground/70 hover:text-ink-foreground"
          >
            <ExternalLink className="h-4 w-4" /> Voir le site
          </a>
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-gold text-sm font-bold text-ink">
              {initials}
            </span>
            <span className="text-sm font-semibold">{shell.name}</span>
          </div>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 text-sm text-ink-foreground/70 hover:text-ink-foreground"
          >
            <LogOut className="h-4 w-4" /> Se déconnecter
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-col">
        <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-4 py-6 lg:px-10 lg:py-10">
          <Outlet />
        </main>
        <div className="border-t px-4 py-4 text-center text-sm text-muted-foreground lg:hidden">
          {shell.name} ·{" "}
          <button type="button" onClick={logout} className="underline">
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}

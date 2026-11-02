import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useRouterState,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import appCss from "../styles.css?url";
import { CartProvider } from "@/lib/cart";
import { CatalogueProvider, fetchCatalogue } from "@/lib/catalogue";
import { SiteHeader } from "@/components/shop/SiteHeader";
import { SiteFooter } from "@/components/shop/SiteFooter";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <p className="eyebrow">Page introuvable</p>
        <h1 className="mt-3 text-6xl font-bold text-foreground">404</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Cette page n'existe pas ou a été déplacée.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Cette page n'a pas pu s'afficher
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Un problème est survenu. Réessayez ou revenez à l'accueil.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
          >
            Réessayer
          </button>
          <a
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-full border border-input bg-background px-5 text-sm font-semibold text-foreground"
          >
            Accueil
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // Produits lus en base, transmis à toutes les pages (useCatalogue)
  loader: () => fetchCatalogue(),
  staleTime: 60_000,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Complexe Tima — Boutique multi-rayons à Dakar" },
      {
        name: "description",
        content:
          "Fournitures scolaires, parfumerie, beauté, mode et maison à Dakar. Commandez sur WhatsApp, livraison Dakar et banlieue.",
      },
      { name: "author", content: "Complexe Tima" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Playfair+Display:wght@600;700;800&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const products = Route.useLoaderData();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // L'espace boutique a sa propre mise en page, sans en-tête ni pied de page publics
  const backOffice =
    pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/acces/");

  return (
    <QueryClientProvider client={queryClient}>
      <CatalogueProvider products={products}>
        <CartProvider>
          {backOffice ? (
            <Outlet />
          ) : (
            <div className="flex min-h-screen flex-col">
              <SiteHeader />
              <main className="flex-1">
                <Outlet />
              </main>
              <SiteFooter />
            </div>
          )}
          <Toaster position="top-center" richColors />
        </CartProvider>
      </CatalogueProvider>
    </QueryClientProvider>
  );
}

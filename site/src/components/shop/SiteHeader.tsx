import { Link, useNavigate } from "@tanstack/react-router";
import { MessageCircle, Search, ShoppingBag } from "lucide-react";
import { useState, type FormEvent } from "react";
import logo from "@/assets/logo-complexe-tima.webp";
import { CATEGORIES } from "@/data/catalogue";
import { useCart } from "@/lib/cart";
import { SHOP, whatsappUrl } from "@/lib/shop";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const { count } = useCart();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    navigate({ to: "/boutique", search: { q: q.trim() || undefined } });
  };

  return (
    <header className="sticky top-0 z-40">
      <div className="bg-ink text-ink-foreground">
        <div className="container-shop flex h-9 items-center justify-center gap-6 text-xs sm:justify-between">
          <p className="truncate">
            <span className="text-gold">✦</span> Livraison à Dakar et banlieue · Retrait en boutique
          </p>
          <a
            href={whatsappUrl(`Bonjour ${SHOP.name} !`)}
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1.5 hover:text-gold sm:inline-flex"
          >
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp : {SHOP.phoneDisplay}
          </a>
        </div>
      </div>

      <div className="border-b bg-background/90 backdrop-blur-md">
        <div className="container-shop grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-6">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <img
              src={logo}
              alt="Logo Complexe Tima"
              width={52}
              height={52}
              className="h-11 w-11 shrink-0 md:h-[52px] md:w-[52px]"
            />
            <span className="min-w-0">
              <span className="block truncate font-display text-xl font-bold leading-none md:text-2xl">
                Complexe Tima
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                Boutique multi-rayons · Dakar
              </span>
            </span>
          </Link>

          <form
            onSubmit={onSearch}
            className="order-3 col-span-2 flex gap-2 md:order-none md:col-span-1"
          >
            <label htmlFor="site-search" className="sr-only">
              Rechercher un produit
            </label>
            <input
              id="site-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cahier, parfum, sandales…"
              className="h-11 min-w-0 flex-1 rounded-full border border-input bg-card px-5 text-sm outline-none transition focus:border-gold focus:ring-2 focus:ring-ring/30"
            />
            <button
              type="submit"
              aria-label="Rechercher"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-ink-foreground transition hover:bg-ink-soft"
            >
              <Search className="h-4 w-4" />
            </button>
          </form>

          <Link
            to="/panier"
            className="relative inline-flex h-11 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-gold transition hover:brightness-105"
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Panier</span>
            <span
              className={cn(
                "grid h-6 min-w-6 place-items-center rounded-full bg-ink px-1.5 text-xs text-ink-foreground",
                count === 0 && "opacity-60",
              )}
            >
              {count}
            </span>
          </Link>
        </div>

        <nav className="container-shop no-scrollbar flex items-center gap-1 overflow-x-auto pb-2 text-sm md:gap-2">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              to="/rayon/$slug"
              params={{ slug: cat.slug }}
              className="shrink-0 rounded-full px-3 py-1.5 font-medium text-foreground/80 transition hover:bg-sand hover:text-foreground"
              activeProps={{
                className: "bg-ink text-ink-foreground hover:bg-ink hover:text-ink-foreground",
              }}
            >
              {cat.name}
            </Link>
          ))}
          <span className="mx-1 hidden h-5 w-px shrink-0 bg-border md:block" />
          <Link
            to="/liste-fournitures"
            className="shrink-0 rounded-full px-3 py-1.5 font-semibold text-gold-deep transition hover:bg-sand"
            activeProps={{ className: "bg-sand" }}
          >
            Envoyer ma liste de fournitures
          </Link>
          <Link
            to="/a-propos"
            className="shrink-0 rounded-full px-3 py-1.5 font-medium text-foreground/80 transition hover:bg-sand md:ml-auto"
            activeProps={{ className: "bg-sand text-foreground" }}
          >
            À propos & contact
          </Link>
        </nav>
      </div>
    </header>
  );
}

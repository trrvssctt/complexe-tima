import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Home, MessageCircle, Smartphone, Truck } from "lucide-react";
import heroRentree from "@/assets/hero-rentree.jpg";
import heroCadeaux from "@/assets/hero-cadeaux.jpg";
import { CATEGORIES, PACKS } from "@/data/catalogue";
import { useCatalogue } from "@/lib/catalogue";
import { CategoryIcon } from "@/components/shop/CategoryIcon";
import { ProductCard } from "@/components/shop/ProductCard";
import { ProductImage } from "@/components/shop/ProductImage";
import { SHOP, whatsappUrl } from "@/lib/shop";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Complexe Tima — Fournitures, parfums et cadeaux à Dakar" },
      {
        name: "description",
        content:
          "Boutique multi-rayons à Dakar : fournitures scolaires, parfumerie et encens, beauté, mode et maison. Commandez sur WhatsApp.",
      },
      { property: "og:title", content: "Complexe Tima — Boutique multi-rayons à Dakar" },
      {
        property: "og:description",
        content:
          "La rentrée des enfants et les cadeaux pour Madame, au même endroit. Commande WhatsApp, livraison Dakar.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { products: PRODUCTS, getProductsByCategory } = useCatalogue();
  const fournitures = PRODUCTS.filter((p) => p.category === "fournitures" && p.featured);
  const cadeaux = PRODUCTS.filter((p) => p.giftIdea && p.featured).slice(0, 4);
  const beaute = PRODUCTS.filter(
    (p) =>
      (p.category === "beaute" || p.category === "informatique" || p.category === "maison") &&
      p.featured,
  );

  return (
    <>
      {/* ───── Bandeaux d'accueil ───── */}
      <section className="container-shop grid gap-5 pt-6 lg:grid-cols-[1.25fr_1fr]">
        <div className="relative isolate overflow-hidden rounded-3xl bg-ink text-ink-foreground shadow-lift">
          <img
            src={heroRentree}
            alt="Cahiers colorés, crayons de couleur, trousse et kit de géométrie"
            width={1600}
            height={1104}
            className="absolute inset-0 -z-10 h-full w-full object-cover object-right"
          />
          <div className="absolute inset-0 -z-10 bg-fade-ink" />
          <div className="flex min-h-[420px] max-w-lg flex-col justify-end p-7 md:min-h-[500px] md:p-10">
            <p className="eyebrow text-gold animate-fade-up">Rentrée scolaire</p>
            <h1 className="mt-3 text-4xl font-bold leading-[1.05] animate-fade-up md:text-6xl">
              Tout pour la rentrée, au même endroit.
            </h1>
            <p className="mt-4 text-base text-ink-foreground/80 md:text-lg">
              Cahiers, trousses, manuels… ou envoyez la liste de l'école : on prépare le pack.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/rayon/$slug"
                params={{ slug: "fournitures" }}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground shadow-gold transition hover:brightness-105"
              >
                Voir les fournitures <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/liste-fournitures"
                className="inline-flex h-12 items-center rounded-full border border-gold/70 px-6 font-semibold text-ink-foreground transition hover:bg-gold/10"
              >
                Envoyer ma liste
              </Link>
            </div>
          </div>
        </div>

        <div className="relative isolate overflow-hidden rounded-3xl bg-sand shadow-soft">
          <img
            src={heroCadeaux}
            alt="Parfum oriental doré, brûle-encens, montre en coffret et pochette de soirée"
            width={1600}
            height={1104}
            className="absolute inset-0 -z-10 h-full w-full object-cover object-[70%_center]"
          />
          <div className="absolute inset-0 -z-10 bg-fade-ivory" />
          <div className="flex min-h-[360px] max-w-sm flex-col justify-end p-7 md:min-h-[500px] md:p-10">
            <p className="eyebrow">Idées cadeaux</p>
            <h2 className="mt-3 text-3xl font-bold leading-tight md:text-5xl">
              Pour Madame, un beau cadeau.
            </h2>
            <p className="mt-3 text-foreground/75">
              Parfums orientaux, coffrets, montres, pochettes de soirée.
            </p>
            <Link
              to="/rayon/$slug"
              params={{ slug: "parfumerie" }}
              className="mt-6 inline-flex h-12 w-fit items-center gap-2 rounded-full bg-ink px-6 font-semibold text-ink-foreground transition hover:bg-ink-soft"
            >
              Voir les cadeaux <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ───── Rayons ───── */}
      <section className="container-shop mt-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Nos rayons</p>
            <h2 className="mt-2 text-3xl font-bold md:text-4xl">Six univers, une seule boutique</h2>
          </div>
          <Link
            to="/boutique"
            className="inline-flex items-center gap-1 font-semibold text-gold-deep hover:underline"
          >
            Voir les {PRODUCTS.length} produits <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {CATEGORIES.map((cat) => {
            const items = getProductsByCategory(cat.slug);
            const cover = items.find((p) => p.featured) ?? items[0];
            if (!cover) return null;
            return (
              <Link
                key={cat.slug}
                to="/rayon/$slug"
                params={{ slug: cat.slug }}
                className="group overflow-hidden rounded-2xl border bg-card shadow-soft transition hover:-translate-y-1 hover:shadow-lift"
              >
                <ProductImage product={cover} className="aspect-[4/3]" />
                <div className="relative p-4 pt-7">
                  <CategoryIcon
                    slug={cat.slug}
                    size="sm"
                    className="absolute -top-5 left-4 h-10 w-10 ring-4 ring-card"
                  />
                  <h3 className="text-lg font-bold">{cat.name}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{cat.tagline}</p>
                  <p className="mt-2 text-xs font-semibold text-gold-deep">
                    {items.length} produits
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ───── Fournitures phares ───── */}
      <section className="container-shop mt-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Rentrée 2026</p>
            <h2 className="mt-2 text-3xl font-bold md:text-4xl">Les indispensables de l'école</h2>
          </div>
          <Link
            to="/rayon/$slug"
            params={{ slug: "fournitures" }}
            className="inline-flex items-center gap-1 font-semibold text-gold-deep hover:underline"
          >
            Tout le rayon <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {fournitures.slice(0, 8).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* ───── Packs ───── */}
      <section className="container-shop mt-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Packs rentrée</p>
            <h2 className="mt-2 text-3xl font-bold md:text-4xl">
              Un pack par niveau, prêt à emporter
            </h2>
          </div>
          <Link
            to="/liste-fournitures"
            className="inline-flex h-11 items-center rounded-full border border-ink px-5 text-sm font-semibold transition hover:bg-ink hover:text-ink-foreground"
          >
            Ma liste est différente
          </Link>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {PACKS.map((pack, i) => (
            <article
              key={pack.slug}
              className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-soft"
            >
              <span className="absolute right-5 top-5 font-display text-6xl font-bold text-sand">
                0{i + 1}
              </span>
              <p className="eyebrow">{pack.level}</p>
              <h3 className="mt-2 text-2xl font-bold">{pack.name}</h3>
              <ul className="mt-4 space-y-2 text-sm">
                {pack.items.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-gold" /> {item}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-muted-foreground">
                Prix selon la liste exacte de l'école.
              </p>
              <a
                href={whatsappUrl(
                  `Bonjour ${SHOP.name}, je suis intéressé(e) par le ${pack.name}. Pouvez-vous me donner le prix ?`,
                )}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-whatsapp px-5 text-sm font-semibold text-whatsapp-foreground transition hover:brightness-110"
              >
                <MessageCircle className="h-4 w-4" /> Demander ce pack
              </a>
            </article>
          ))}
        </div>
      </section>

      {/* ───── Coin parfumerie ───── */}
      <section className="mt-20 bg-gradient-ink py-16 text-ink-foreground">
        <div className="container-shop grid items-center gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="eyebrow text-gold">Coin parfumerie & cadeaux</p>
            <h2 className="mt-3 text-3xl font-bold md:text-5xl">
              Encens, parfums orientaux,{" "}
              <span className="text-gradient-gold">coffrets cadeaux</span>
            </h2>
            <p className="mt-4 max-w-md text-ink-foreground/75">
              Brûle-encens dorés, charbon, huiles parfumées, montres et pochettes de soirée. Le
              cadeau qui fait plaisir.
            </p>
            <Link
              to="/rayon/$slug"
              params={{ slug: "parfumerie" }}
              className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground shadow-gold"
            >
              Entrer dans le coin parfumerie <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {cadeaux.map((p) => (
              <ProductCard key={p.id} product={p} tone="dark" />
            ))}
          </div>
        </div>
      </section>

      {/* ───── Beauté & maison ───── */}
      <section className="container-shop mt-20">
        <div>
          <p className="eyebrow">Au quotidien</p>
          <h2 className="mt-2 text-3xl font-bold md:text-4xl">Beauté, bureau et maison</h2>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {beaute.slice(0, 4).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* ───── Réassurance ───── */}
      <section className="container-shop mt-20">
        <div className="grid gap-6 rounded-3xl border bg-card p-8 shadow-soft sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Home,
              title: "Une vraie boutique",
              text: "Venez voir, toucher, choisir sur place.",
            },
            {
              icon: Smartphone,
              title: "Paiement mobile",
              text: "Wave, Orange Money ou à la livraison.",
            },
            { icon: Truck, title: "Livraison", text: "Dakar et banlieue, ou retrait en boutique." },
            {
              icon: MessageCircle,
              title: "Réponse sur WhatsApp",
              text: `Une question ? ${SHOP.phoneDisplay}`,
            },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sand text-gold-deep">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-lg font-bold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

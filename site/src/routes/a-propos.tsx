import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageCircle, Phone } from "lucide-react";
import { useState } from "react";
import enseigne from "@/assets/boutique/enseigne-complexe-tima.jpg";
import rayon from "@/assets/boutique/rayon-fournitures.jpg";
import vitrine from "@/assets/boutique/vitrine-beaute.jpg";
import comptoir from "@/assets/boutique/comptoir-boutique.jpg";
import { CATEGORIES } from "@/data/catalogue";
import { CategoryIcon } from "@/components/shop/CategoryIcon";
import { SHOP, whatsappUrl } from "@/lib/shop";

export const Route = createFileRoute("/a-propos")({
  head: () => ({
    meta: [
      { title: "À propos et contact — Complexe Tima Dakar" },
      {
        name: "description",
        content:
          "Complexe Tima, boutique multi-rayons à Dakar dirigée par Fatou Barry DIOP. Contact WhatsApp +221 77 803 29 47.",
      },
      { property: "og:title", content: "À propos de Complexe Tima" },
      {
        property: "og:description",
        content:
          "La rentrée des enfants, les cadeaux pour Madame. Venez nous voir ou écrivez-nous.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const field =
    "mt-1.5 w-full rounded-xl border border-input bg-background px-4 outline-none focus:border-gold";

  return (
    <div className="container-shop pt-8">
      <section className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <p className="eyebrow">À propos</p>
          <h1 className="mt-3 text-4xl font-bold leading-[1.05] md:text-6xl">
            La rentrée des enfants, les cadeaux pour Madame.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-foreground/80">
            Complexe Tima est une boutique multi-rayons à Dakar, dirigée par {SHOP.owner}.
            Fournitures scolaires, informatique, parfumerie, beauté, mode, textile et maison : tout
            se trouve au même endroit.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href={whatsappUrl(`Bonjour ${SHOP.name} !`)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-whatsapp px-6 font-semibold text-whatsapp-foreground"
            >
              <MessageCircle className="h-4 w-4" /> Écrire sur WhatsApp
            </a>
            <a
              href={`tel:+${SHOP.phoneE164}`}
              className="inline-flex h-12 items-center gap-2 rounded-full border border-ink px-6 font-semibold"
            >
              <Phone className="h-4 w-4" /> {SHOP.phoneDisplay}
            </a>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <img
            src={enseigne}
            alt="L'enseigne dorée Complexe Tima"
            width={810}
            height={1080}
            className="row-span-2 h-full w-full rounded-3xl object-cover shadow-lift"
          />
          <img
            src={rayon}
            alt="Le rayon fournitures scolaires de la boutique"
            width={810}
            height={1080}
            loading="lazy"
            className="aspect-square w-full rounded-3xl object-cover shadow-soft"
          />
          <img
            src={vitrine}
            alt="La vitrine beauté et soins"
            width={810}
            height={1080}
            loading="lazy"
            className="aspect-square w-full rounded-3xl object-cover shadow-soft"
          />
        </div>
      </section>

      <section className="mt-20">
        <h2 className="text-3xl font-bold md:text-4xl">Six rayons à parcourir</h2>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              to="/rayon/$slug"
              params={{ slug: c.slug }}
              className="rounded-2xl border bg-card p-5 shadow-soft transition hover:-translate-y-1 hover:shadow-lift"
            >
              <CategoryIcon slug={c.slug} />
              <h3 className="mt-4 text-lg font-bold">{c.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{c.tagline}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-20">
        <p className="eyebrow">Contact</p>
        <h2 className="mt-2 text-3xl font-bold md:text-4xl">Venez nous voir, ou écrivez-nous</h2>
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border bg-card p-7 shadow-soft">
            <dl className="space-y-5">
              <div>
                <dt className="eyebrow">Téléphone et WhatsApp</dt>
                <dd className="mt-1 text-xl font-semibold">{SHOP.phoneDisplay}</dd>
              </div>
              <div>
                <dt className="eyebrow">Adresse</dt>
                <dd className="mt-1">Dakar, Sénégal — adresse exacte sur demande WhatsApp</dd>
              </div>
              <div>
                <dt className="eyebrow">Livraison</dt>
                <dd className="mt-1">Dakar et banlieue · Retrait en boutique</dd>
              </div>
              <div>
                <dt className="eyebrow">Paiement</dt>
                <dd className="mt-1">Wave, Orange Money ou à la livraison</dd>
              </div>
            </dl>
          </div>
          <img
            src={comptoir}
            alt="Le comptoir de la boutique avec cahiers et montres"
            width={810}
            height={1080}
            loading="lazy"
            className="h-full max-h-[460px] w-full rounded-3xl object-cover shadow-soft"
          />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const text = `Bonjour ${SHOP.name}${name.trim() ? `, c'est ${name.trim()}` : ""}. ${msg.trim()}`;
              window.open(whatsappUrl(text), "_blank", "noopener");
            }}
            className="rounded-3xl border bg-card p-7 shadow-soft"
          >
            <h3 className="text-2xl font-bold">Un message ?</h3>
            <label className="mt-5 block">
              <span className="text-sm font-semibold">Votre nom</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Prénom et nom"
                className={`${field} h-12`}
              />
            </label>
            <label className="mt-4 block">
              <span className="text-sm font-semibold">Votre message</span>
              <textarea
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                rows={4}
                placeholder="Que cherchez-vous ?"
                className={`${field} py-3`}
              />
            </label>
            <button
              type="submit"
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary font-semibold text-primary-foreground shadow-gold"
            >
              <MessageCircle className="h-4 w-4" /> Envoyer sur WhatsApp
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

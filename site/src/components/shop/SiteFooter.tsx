import { Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import logo from "@/assets/logo-complexe-tima.webp";
import { CATEGORIES } from "@/data/catalogue";
import { SHOP, whatsappUrl } from "@/lib/shop";

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-gradient-ink text-ink-foreground">
      <div className="gold-rule" />
      <div className="container-shop grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <img src={logo} alt="" width={56} height={56} loading="lazy" className="h-14 w-14" />
            <span className="font-display text-2xl font-bold text-gradient-gold">
              Complexe Tima
            </span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-foreground/70">
            La rentrée des enfants et les cadeaux pour Madame, au même endroit. Une boutique
            multi-rayons à Dakar.
          </p>
          <p className="mt-4 font-semibold">{SHOP.phoneDisplay}</p>
        </div>

        <div>
          <h3 className="font-sans text-sm font-semibold uppercase tracking-[0.16em] text-gold">
            Nos rayons
          </h3>
          <ul className="mt-4 space-y-2 text-sm text-ink-foreground/80">
            {CATEGORIES.map((cat) => (
              <li key={cat.slug}>
                <Link to="/rayon/$slug" params={{ slug: cat.slug }} className="hover:text-gold">
                  {cat.fullName}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-sans text-sm font-semibold uppercase tracking-[0.16em] text-gold">
            Infos pratiques
          </h3>
          <ul className="mt-4 space-y-2 text-sm text-ink-foreground/80">
            <li>Livraison à Dakar et banlieue</li>
            <li>Retrait en boutique</li>
            <li>Paiement : Wave, Orange Money ou à la livraison</li>
            <li>
              <Link to="/liste-fournitures" className="hover:text-gold">
                Envoyer ma liste de fournitures
              </Link>
            </li>
            <li>
              <Link to="/boutique" className="hover:text-gold">
                Tous les produits
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="font-sans text-sm font-semibold uppercase tracking-[0.16em] text-gold">
            Nous trouver
          </h3>
          <p className="mt-4 text-sm text-ink-foreground/80">Dakar, Sénégal</p>
          <Link
            to="/a-propos"
            className="mt-1 inline-block text-sm text-ink-foreground/80 underline-offset-4 hover:text-gold hover:underline"
          >
            Adresse, horaires et contact
          </Link>
          <a
            href={whatsappUrl(`Bonjour ${SHOP.name} !`)}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-whatsapp px-5 text-sm font-semibold text-whatsapp-foreground transition hover:brightness-110"
          >
            <MessageCircle className="h-4 w-4" /> Écrire sur WhatsApp
          </a>
        </div>
      </div>
      <div className="border-t border-ink-foreground/10">
        <div className="container-shop flex flex-col gap-2 py-5 text-xs text-ink-foreground/50 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Complexe Tima · Dakar</p>
          <p>Commandes et questions sur WhatsApp au {SHOP.phoneDisplay}</p>
        </div>
      </div>
    </footer>
  );
}

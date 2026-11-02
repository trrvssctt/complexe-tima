import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { useState } from "react";
import heroRentree from "@/assets/hero-rentree.jpg";
import { SHOP, whatsappUrl } from "@/lib/shop";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/liste-fournitures")({
  head: () => ({
    meta: [
      { title: "Envoyer ma liste de fournitures — Complexe Tima" },
      {
        name: "description",
        content:
          "Envoyez la liste de l'école sur WhatsApp : Complexe Tima prépare le pack de fournitures et vous rappelle avec le prix.",
      },
      { property: "og:title", content: "Envoyez la liste de l'école, on prépare le pack" },
      {
        property: "og:description",
        content: "Fournitures scolaires à Dakar : envoyez votre liste sur WhatsApp.",
      },
    ],
  }),
  component: ListePage,
});

const CLASSES = ["Maternelle", "CI – CP", "CE1 – CE2", "CM1 – CM2", "6e – 5e", "4e – 3e", "Lycée"];

function ListePage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [classe, setClasse] = useState(CLASSES[1]);
  const [list, setList] = useState("");
  const [mode, setMode] = useState<"livraison" | "retrait">("livraison");

  const message = [
    `Bonjour ${SHOP.name}, voici ma liste de fournitures.`,
    `Classe : ${classe}`,
    list.trim()
      ? `Liste :\n${list.trim()}`
      : "Je vous envoie la photo de la liste juste après ce message.",
    `Je préfère : ${mode === "livraison" ? "la livraison" : "le retrait en boutique"}`,
    name.trim() && `Nom : ${name.trim()}`,
    phone.trim() && `Téléphone : ${phone.trim()}`,
  ]
    .filter(Boolean)
    .join("\n");

  const field =
    "mt-1.5 w-full rounded-xl border border-input bg-background px-4 outline-none focus:border-gold";

  return (
    <div className="container-shop pt-8">
      <p className="eyebrow">Liste de fournitures</p>
      <h1 className="mt-2 max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
        Envoyez la liste de l'école, on prépare le pack.
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        Plus besoin de chercher article par article. On rassemble tout et on vous rappelle avec le
        prix total.
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            window.open(whatsappUrl(message), "_blank", "noopener");
          }}
          className="rounded-3xl border bg-card p-6 shadow-soft md:p-8"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold">Votre nom</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Prénom et nom"
                className={cn(field, "h-12")}
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Téléphone (WhatsApp)</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+221 …"
                inputMode="tel"
                className={cn(field, "h-12")}
              />
            </label>
          </div>
          <label className="mt-5 block">
            <span className="text-sm font-semibold">Classe de l'enfant</span>
            <select
              value={classe}
              onChange={(e) => setClasse(e.target.value)}
              className={cn(field, "h-12")}
            >
              {CLASSES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="mt-5 block">
            <span className="text-sm font-semibold">Collez la liste ici</span>
            <textarea
              value={list}
              onChange={(e) => setList(e.target.value)}
              rows={6}
              placeholder="Ex. 10 cahiers TP, 1 trousse, 1 kit de géométrie…"
              className={cn(field, "py-3")}
            />
            <span className="mt-1.5 block text-xs text-muted-foreground">
              Vous avez seulement une photo ? Laissez vide et envoyez la photo dans la conversation
              WhatsApp.
            </span>
          </label>

          <fieldset className="mt-5">
            <legend className="text-sm font-semibold">Je préfère</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["livraison", "retrait"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  aria-pressed={mode === m}
                  className={cn(
                    "h-11 rounded-full border px-5 text-sm font-semibold transition",
                    mode === m
                      ? "border-ink bg-ink text-ink-foreground"
                      : "bg-card hover:border-ink",
                  )}
                >
                  {m === "livraison" ? "Livraison" : "Retrait en boutique"}
                </button>
              ))}
            </div>
          </fieldset>

          <button
            type="submit"
            className="mt-7 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-whatsapp font-semibold text-whatsapp-foreground transition hover:brightness-110"
          >
            <MessageCircle className="h-5 w-5" /> Envoyer ma liste sur WhatsApp
          </button>
        </form>

        <div className="space-y-6">
          <div className="rounded-3xl bg-gradient-ink p-7 text-ink-foreground shadow-lift">
            <h2 className="text-3xl font-bold text-gradient-gold">Comment ça marche</h2>
            <ol className="mt-6 space-y-5">
              {[
                ["Envoyez la liste", "Collez-la ou envoyez-la en photo sur WhatsApp."],
                ["On prépare le pack", "La boutique rassemble chaque article selon le stock."],
                [
                  "On vous rappelle",
                  "Prix total, livraison ou retrait, paiement Wave, Orange Money ou à la livraison.",
                ],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-gold font-bold text-ink">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-semibold">{t}</p>
                    <p className="text-sm text-ink-foreground/70">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <img
            src={heroRentree}
            alt="Fournitures scolaires prêtes pour la rentrée"
            width={1600}
            height={1104}
            loading="lazy"
            className="aspect-[4/3] w-full rounded-3xl object-cover object-right shadow-soft"
          />
        </div>
      </div>
    </div>
  );
}

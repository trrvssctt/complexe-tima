import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  ImagePlus,
  Link2,
  Loader2,
  Plus,
  Star,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useRef, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { saveProduct, uploadProductImage } from "@/functions/admin";
import { formatPrice } from "@/lib/shop";
import { cn } from "@/lib/utils";
import { Alert, FieldError, adminCard, adminInput } from "./ui";

export type EditorVariant = {
  id?: number;
  key: string;
  sku?: string;
  label: string;
  price: string;
  purchasePrice: string;
  stock: string;
  lowStockThreshold: string;
  active: boolean;
};

export type EditorProduct = {
  id?: number;
  sku?: string;
  slug?: string;
  name: string;
  description: string;
  brand: string;
  universeSlug: string;
  categoryId: number | null;
  optionName: string;
  optionsNote: string;
  visible: boolean;
  featured: boolean;
  giftIdea: boolean;
  needsReview: boolean;
  internalNote: string;
  images: string[];
  variants: EditorVariant[];
  /** Photo d'origine du dossier assets (affichée tant qu'aucune photo n'est ajoutée). */
  fallbackImage?: string | undefined;
};

type Universe = { slug: string; name: string; categories: { id: number; name: string }[] };

const OPTION_NAMES = ["Couleur", "Taille", "Pointure", "Modèle", "Contenance", "Parfum"];
const toInt = (s: string) => {
  const n = Number(s.replace(/[\s\u00a0\u202f]/g, ""));
  return s.trim() === "" || !Number.isFinite(n) ? null : n;
};
let keySeq = 0;
export const newVariant = (label = ""): EditorVariant => ({
  key: `n${++keySeq}`,
  label,
  price: "",
  purchasePrice: "",
  stock: "0",
  lowStockThreshold: "3",
  active: true,
});

const label = "mb-1.5 block text-sm font-semibold";

export function ProductEditor({
  initial,
  universes,
  onSaved,
}: {
  initial: EditorProduct;
  universes: Universe[];
  onSaved: (id: number) => void | Promise<void>;
}) {
  const creating = !initial.id;
  const [p, setP] = useState<EditorProduct>(initial);
  const [multi, setMulti] = useState(
    initial.variants.length > 1 || initial.variants.some((v) => v.label),
  );
  const [newCategory, setNewCategory] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{
    ok?: boolean;
    error?: string;
    fieldErrors?: Record<string, string>;
  }>({});
  const fileInput = useRef<HTMLInputElement>(null);

  const set = (patch: Partial<EditorProduct>) => setP((x) => ({ ...x, ...patch }));
  const setVariant = (key: string, patch: Partial<EditorVariant>) =>
    setP((x) => ({
      ...x,
      variants: x.variants.map((v) => (v.key === key ? { ...v, ...patch } : v)),
    }));
  const err = (k: string) => <FieldError message={result.fieldErrors?.[k]} />;
  const categories = universes.find((u) => u.slug === p.universeSlug)?.categories ?? [];

  // ── Photos ──
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setImageError(null);
    const urls: string[] = [];
    for (const file of Array.from(files).slice(0, 10 - p.images.length)) {
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await uploadProductImage({ data: fd });
        if (res.url) urls.push(res.url);
        else setImageError(`${file.name} : ${res.error}`);
      } catch {
        setImageError(`${file.name} : envoi impossible.`);
      }
    }
    setP((x) => ({ ...x, images: [...x.images, ...urls] }));
    setUploading(false);
    if (fileInput.current) fileInput.current.value = "";
  }
  function addUrl() {
    const url = imageUrl.trim();
    if (!/^https:\/\/\S+$/.test(url)) return setImageError("L’adresse doit commencer par https://");
    if (p.images.includes(url)) return setImageError("Cette photo est déjà ajoutée.");
    set({ images: [...p.images, url] });
    setImageUrl("");
    setImageError(null);
  }
  const moveImage = (i: number, dir: -1 | 1) =>
    setP((x) => {
      const images = [...x.images];
      const j = i + dir;
      if (j < 0 || j >= images.length) return x;
      [images[i], images[j]] = [images[j]!, images[i]!];
      return { ...x, images };
    });

  // ── Variantes ──
  function toggleMulti(on: boolean) {
    setMulti(on);
    if (on && p.variants.length === 1 && !p.variants[0]!.label)
      setVariant(p.variants[0]!.key, { label: "Standard" });
  }
  const removable = (v: EditorVariant) => !v.id && p.variants.length > 1;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setResult({});
    try {
      const res = await saveProduct({
        data: {
          ...(p.id ? { id: p.id } : {}),
          name: p.name,
          description: p.description,
          brand: p.brand,
          universeSlug: p.universeSlug,
          categoryId: newCategory === null ? p.categoryId : null,
          newCategory: newCategory ?? "",
          optionName: p.optionName,
          optionsNote: p.optionsNote,
          visible: p.visible,
          featured: p.featured,
          giftIdea: p.giftIdea,
          needsReview: p.needsReview,
          internalNote: p.internalNote,
          images: p.images,
          variants: (multi ? p.variants : p.variants.slice(0, 1)).map((v) => ({
            ...(v.id ? { id: v.id } : {}),
            label: multi ? v.label : "",
            price: v.price,
            purchasePrice: v.purchasePrice,
            stock: v.stock,
            lowStockThreshold: v.lowStockThreshold,
            active: v.active,
          })),
        },
      });
      setResult(res);
      if (res.ok && res.id) {
        setNewCategory(null);
        await onSaved(res.id);
      } else window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setResult({ error: "Enregistrement impossible. Réessayez." });
    } finally {
      setPending(false);
    }
  }

  // ── Résumé ──
  const rows = (multi ? p.variants : p.variants.slice(0, 1)).filter((v) => v.active);
  const priced = rows.filter((v) => toInt(v.price) !== null);
  const margins = rows
    .map((v) => ({ price: toInt(v.price), cost: toInt(v.purchasePrice) }))
    .filter(
      (m): m is { price: number; cost: number } =>
        m.price !== null && m.cost !== null && m.price > 0,
    );
  const avgRate = margins.length
    ? Math.round(
        (margins.reduce((s, m) => s + (m.price - m.cost) / m.price, 0) / margins.length) * 100,
      )
    : null;
  const stockValue = rows.reduce(
    (s, v) => s + (toInt(v.purchasePrice) ?? 0) * (toInt(v.stock) ?? 0),
    0,
  );
  const cover = p.images[0] ?? p.fallbackImage;

  return (
    <form onSubmit={submit} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-6">
        {result.error && <Alert tone="error">{result.error}</Alert>}

        {/* ── Photos ── */}
        <section className={adminCard}>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-2xl font-bold">Photos</h2>
              <p className="text-sm text-muted-foreground">
                La première est la photo principale. Fond uni, cadrage carré de préférence.
              </p>
            </div>
            <span className="text-sm text-muted-foreground">{p.images.length}/10</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {p.images.map((url, i) => (
              <figure
                key={url}
                className="group relative overflow-hidden rounded-xl border bg-sand"
              >
                <img
                  src={url}
                  alt={`Photo ${i + 1}`}
                  className="aspect-square w-full object-cover"
                />
                {i === 0 && (
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-xs font-semibold text-ink-foreground">
                    <Star className="h-3 w-3" /> Principale
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-ink/80 to-transparent p-2">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => moveImage(i, -1)}
                      disabled={i === 0}
                      aria-label="Déplacer à gauche"
                      className="grid h-8 w-8 place-items-center rounded-full bg-card/90 disabled:opacity-40"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveImage(i, 1)}
                      disabled={i === p.images.length - 1}
                      aria-label="Déplacer à droite"
                      className="grid h-8 w-8 place-items-center rounded-full bg-card/90 disabled:opacity-40"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => set({ images: p.images.filter((u) => u !== url) })}
                    aria-label="Retirer la photo"
                    className="grid h-8 w-8 place-items-center rounded-full bg-card/90 text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </figure>
            ))}
            {p.images.length < 10 && (
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  void upload(e.dataTransfer.files);
                }}
                className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gold/60 bg-ivory p-3 text-center text-sm text-muted-foreground transition hover:border-gold hover:bg-sand"
              >
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-gold-deep" />
                ) : (
                  <UploadCloud className="h-6 w-6 text-gold-deep" />
                )}
                <span className="font-semibold text-foreground">
                  {uploading ? "Envoi…" : "Ajouter des photos"}
                </span>
                <span className="text-xs">Glisser-déposer ou cliquer · 5 Mo max</span>
              </button>
            )}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            className="hidden"
            onChange={(e) => void upload(e.target.files)}
          />
          {p.images.length === 0 && p.fallbackImage && (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <img src={p.fallbackImage} alt="" className="h-10 w-10 rounded-lg object-cover" />
              Sans photo ajoutée, le site affiche la photo d’origine.
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <label htmlFor="image-url" className="sr-only">
              Adresse d’une photo
            </label>
            <span className="relative flex-1">
              <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="image-url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addUrl();
                  }
                }}
                placeholder="Ou collez l’adresse d’une photo : https://…"
                className={`${adminInput} pl-9`}
              />
            </span>
            <button
              type="button"
              onClick={addUrl}
              className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full border-2 border-ink px-4 font-semibold"
            >
              <ImagePlus className="h-4 w-4" /> Ajouter
            </button>
          </div>
          {imageError && <p className="mt-2 text-sm font-medium text-destructive">{imageError}</p>}
          {err("images")}
        </section>

        {/* ── Présentation ── */}
        <section className={`${adminCard} space-y-4`}>
          <h2 className="text-2xl font-bold">Présentation</h2>
          <div>
            <label htmlFor="name" className={label}>
              Nom du produit
            </label>
            <input
              id="name"
              value={p.name}
              onChange={(e) => set({ name: e.target.value })}
              required
              maxLength={150}
              aria-invalid={!!result.fieldErrors?.["name"]}
              className={adminInput}
              placeholder="Ex. Brûle-encens doré"
            />
            {err("name")}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="universe" className={label}>
                Rayon
              </label>
              <select
                id="universe"
                value={p.universeSlug}
                disabled={!creating}
                onChange={(e) => set({ universeSlug: e.target.value, categoryId: null })}
                className={cn(adminInput, !creating && "bg-sand text-muted-foreground")}
              >
                {universes.map((u) => (
                  <option key={u.slug} value={u.slug}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="category" className={label}>
                Sous-catégorie
              </label>
              {newCategory === null ? (
                <select
                  id="category"
                  value={p.categoryId ?? ""}
                  onChange={(e) =>
                    e.target.value === "__new"
                      ? setNewCategory("")
                      : set({ categoryId: e.target.value ? Number(e.target.value) : null })
                  }
                  className={adminInput}
                >
                  <option value="">—</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  <option value="__new">+ Nouvelle sous-catégorie…</option>
                </select>
              ) : (
                <span className="flex gap-2">
                  <input
                    id="category"
                    autoFocus
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    maxLength={60}
                    placeholder="Nom de la sous-catégorie"
                    className={adminInput}
                  />
                  <button
                    type="button"
                    onClick={() => setNewCategory(null)}
                    className="shrink-0 px-2 text-sm text-muted-foreground underline"
                  >
                    Annuler
                  </button>
                </span>
              )}
              {err("newCategory")}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="brand" className={label}>
                Marque <span className="font-normal text-muted-foreground">(facultatif)</span>
              </label>
              <input
                id="brand"
                value={p.brand}
                onChange={(e) => set({ brand: e.target.value })}
                maxLength={80}
                className={adminInput}
              />
            </div>
            <div>
              <label htmlFor="optionsNote" className={label}>
                Choix à préciser{" "}
                <span className="font-normal text-muted-foreground">(facultatif)</span>
              </label>
              <input
                id="optionsNote"
                value={p.optionsNote}
                onChange={(e) => set({ optionsNote: e.target.value })}
                maxLength={200}
                placeholder="Ex. Plusieurs teintes — demandez la liste"
                className={adminInput}
              />
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="description" className={label}>
                Description
              </label>
              <span className="text-xs text-muted-foreground">{p.description.length}/3000</span>
            </div>
            <textarea
              id="description"
              rows={5}
              maxLength={3000}
              value={p.description}
              onChange={(e) => set({ description: e.target.value })}
              placeholder="Matière, format, usage… En quelques phrases simples."
              className="w-full rounded-xl border border-input bg-card p-3.5 outline-none focus:border-gold"
            />
          </div>
        </section>

        {/* ── Prix, coûts et stock ── */}
        <section className={`${adminCard} space-y-4`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">Prix, coûts et stock</h2>
              <p className="text-sm text-muted-foreground">
                En F CFA. Sans prix de vente : « Prix sur demande ». Le prix d’achat sert aux
                statistiques de marge.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <Switch
                checked={multi}
                onCheckedChange={toggleMulti}
                aria-label="Plusieurs variantes"
              />
              Plusieurs variantes
            </label>
          </div>
          {multi && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">Les variantes sont des :</span>
              {OPTION_NAMES.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => set({ optionName: o })}
                  className={cn(
                    "h-9 rounded-full border px-3 text-sm",
                    p.optionName === o
                      ? "border-ink bg-ink font-semibold text-ink-foreground"
                      : "bg-card",
                  )}
                >
                  {o.toLowerCase()}s
                </button>
              ))}
            </div>
          )}
          {err("variants")}
          <div className="space-y-3">
            {(multi ? p.variants : p.variants.slice(0, 1)).map((v, i) => {
              const price = toInt(v.price);
              const cost = toInt(v.purchasePrice);
              const margin = price !== null && cost !== null ? price - cost : null;
              return (
                <div
                  key={v.key}
                  className={cn("rounded-2xl border p-4", !v.active && "bg-sand/60")}
                >
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_0.7fr_0.7fr]">
                    {multi && (
                      <div className="sm:col-span-2 lg:col-span-1">
                        <label
                          htmlFor={`v-${v.key}-label`}
                          className="mb-1 block text-xs font-semibold text-muted-foreground"
                        >
                          {p.optionName}
                        </label>
                        <input
                          id={`v-${v.key}-label`}
                          value={v.label}
                          onChange={(e) => setVariant(v.key, { label: e.target.value })}
                          maxLength={60}
                          placeholder="Ex. Bleu"
                          aria-invalid={!!result.fieldErrors?.[`variants.${i}.label`]}
                          className={adminInput}
                        />
                        {err(`variants.${i}.label`)}
                        {v.sku && (
                          <span className="mt-1 block text-xs text-muted-foreground">{v.sku}</span>
                        )}
                      </div>
                    )}
                    {(
                      [
                        ["price", "Prix de vente"],
                        ["purchasePrice", "Prix d’achat"],
                        ["stock", "Stock"],
                        ["lowStockThreshold", "Seuil d’alerte"],
                      ] as const
                    ).map(([field, text]) => (
                      <div key={field}>
                        <label
                          htmlFor={`v-${v.key}-${field}`}
                          className="mb-1 block text-xs font-semibold text-muted-foreground"
                        >
                          {text}
                        </label>
                        <input
                          id={`v-${v.key}-${field}`}
                          inputMode="numeric"
                          value={v[field]}
                          onChange={(e) => setVariant(v.key, { [field]: e.target.value })}
                          placeholder={
                            field === "price"
                              ? "Sur demande"
                              : field === "purchasePrice"
                                ? "Inconnu"
                                : ""
                          }
                          aria-invalid={!!result.fieldErrors?.[`variants.${i}.${field}`]}
                          className={adminInput}
                        />
                        {err(`variants.${i}.${field}`)}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                    <span
                      className={cn(
                        "font-semibold",
                        margin === null
                          ? "text-muted-foreground"
                          : margin >= 0
                            ? "text-whatsapp"
                            : "text-destructive",
                      )}
                    >
                      {margin === null
                        ? "Marge : renseignez prix de vente et prix d’achat"
                        : `Marge : ${formatPrice(margin)}${price ? ` (${Math.round((margin / price) * 100)} %)` : ""}`}
                    </span>
                    <span className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <Switch
                          checked={v.active}
                          onCheckedChange={(c) => setVariant(v.key, { active: c })}
                          aria-label={`Article en vente ${v.label}`}
                        />
                        En vente
                      </label>
                      {multi && removable(v) && (
                        <button
                          type="button"
                          onClick={() =>
                            set({ variants: p.variants.filter((x) => x.key !== v.key) })
                          }
                          className="inline-flex items-center gap-1 text-destructive"
                        >
                          <Trash2 className="h-4 w-4" /> Retirer
                        </button>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          {multi && (
            <button
              type="button"
              onClick={() => set({ variants: [...p.variants, newVariant()] })}
              className="inline-flex h-11 items-center gap-2 rounded-full border-2 border-dashed border-ink/40 px-4 font-semibold hover:border-ink"
            >
              <Plus className="h-4 w-4" /> Ajouter une variante
            </button>
          )}
        </section>
      </div>

      {/* ── Colonne de droite ── */}
      <aside className="flex flex-col gap-6 lg:sticky lg:top-6">
        <section className={`${adminCard} space-y-4`}>
          <div className="flex items-center gap-3">
            <span className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-sand">
              {cover && <img src={cover} alt="" className="h-full w-full object-cover" />}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold">{p.name || "Nouveau produit"}</p>
              <p className="text-xs text-muted-foreground">
                {p.sku ?? "Référence attribuée à l’enregistrement"}
              </p>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-sand/70 p-3">
              <dt className="text-xs text-muted-foreground">Prix</dt>
              <dd className="font-semibold">
                {priced.length === rows.length && rows.length
                  ? "Tous fixés"
                  : priced.length
                    ? `${priced.length}/${rows.length} fixés`
                    : "Sur demande"}
              </dd>
            </div>
            <div className="rounded-xl bg-sand/70 p-3">
              <dt className="text-xs text-muted-foreground">Marge moyenne</dt>
              <dd className="font-semibold">{avgRate === null ? "—" : `${avgRate} %`}</dd>
            </div>
            <div className="col-span-2 rounded-xl bg-sand/70 p-3">
              <dt className="text-xs text-muted-foreground">Valeur du stock (prix d’achat)</dt>
              <dd className="font-semibold">{formatPrice(stockValue)}</dd>
            </div>
          </dl>
        </section>

        <section className={`${adminCard} space-y-3`}>
          <h2 className="text-xl font-bold">Sur le site</h2>
          {(
            [
              ["visible", "Visible sur le site", "Sinon le produit est masqué aux clients."],
              ["featured", "Mis en avant", "Affiché dans les sélections de l’accueil."],
              ["giftIdea", "Idée cadeau", "Proposé dans « Pour Madame, un beau cadeau »."],
              ["needsReview", "Fiche à vérifier", "Rappel interne, invisible des clients."],
            ] as const
          ).map(([key, title, hint]) => (
            <label
              key={key}
              className="flex items-start justify-between gap-3 rounded-xl p-2 hover:bg-sand/50"
            >
              <span>
                <span className="block font-semibold">{title}</span>
                <span className="block text-xs text-muted-foreground">{hint}</span>
              </span>
              <Switch
                checked={p[key]}
                onCheckedChange={(c) => set({ [key]: c })}
                aria-label={title}
              />
            </label>
          ))}
          <div>
            <label htmlFor="internalNote" className={label}>
              Note interne
            </label>
            <textarea
              id="internalNote"
              rows={3}
              maxLength={2000}
              value={p.internalNote}
              onChange={(e) => set({ internalNote: e.target.value })}
              className="w-full rounded-xl border border-input bg-card p-3 text-sm outline-none focus:border-gold"
            />
          </div>
        </section>

        {result.ok && !pending && <Alert tone="success">Enregistré. Le site est à jour.</Alert>}
        <button
          type="submit"
          disabled={pending || uploading}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary font-semibold text-primary-foreground shadow-gold disabled:opacity-70"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {pending ? "Enregistrement…" : creating ? "Créer le produit" : "Enregistrer"}
        </button>
        {!creating && p.visible && p.slug && (
          <a
            href={`/produit/${p.slug}`}
            target="_blank"
            rel="noreferrer"
            className="text-center text-sm font-semibold text-gold-deep underline"
          >
            Voir la fiche sur le site
          </a>
        )}
        <Link to="/admin/produits" className="text-center text-sm text-muted-foreground underline">
          Retour à la liste
        </Link>
      </aside>
    </form>
  );
}

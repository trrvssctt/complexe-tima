import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  Check,
  MessageCircle,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
} from "lucide-react";
import { useState } from "react";
import { getCategory, variantPrice } from "@/data/catalogue";
import { loadCatalogue, useCatalogue } from "@/lib/catalogue";
import { CATEGORY_TEXT } from "@/components/shop/CategoryIcon";
import { ProductCard } from "@/components/shop/ProductCard";
import { ProductImage } from "@/components/shop/ProductImage";
import { Swatch } from "@/components/shop/Swatch";
import { useCart } from "@/lib/cart";
import { formatPrice, productQuestionMessage, whatsappUrl } from "@/lib/shop";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/produit/$slug")({
  loader: async ({ params }) => {
    const product = (await loadCatalogue()).getProduct(params.slug);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    if (!loaderData)
      return {
        meta: [
          { title: "Produit introuvable — Complexe Tima" },
          { name: "robots", content: "noindex" },
        ],
      };
    const { product } = loaderData;
    const title = `${product.name}${product.brand ? ` ${product.brand}` : ""} — Complexe Tima`;
    return {
      meta: [
        { title },
        { name: "description", content: product.description },
        { property: "og:title", content: title },
        { property: "og:description", content: product.description },
        { property: "og:type", content: "product" },
      ],
    };
  },
  component: ProductPage,
  notFoundComponent: () => (
    <div className="container-shop py-24 text-center">
      <h1 className="text-3xl font-bold">Produit introuvable</h1>
      <Link to="/boutique" className="mt-4 inline-block font-semibold text-gold-deep underline">
        Voir tous les produits
      </Link>
    </div>
  ),
});

function ProductPage() {
  const { product } = Route.useLoaderData();
  const category = getCategory(product.category)!;
  const { add } = useCart();
  const [variantSku, setVariantSku] = useState(product.variants[0]?.sku);
  const [qty, setQty] = useState(1);
  const [photo, setPhoto] = useState(0);
  const gallery = product.images ?? [];

  const variant = product.variants.find((v) => v.sku === variantSku);
  const sku = variant?.sku ?? product.id;
  const price = variantPrice(product, variant);
  const message = productQuestionMessage(product, variant?.label, qty);
  const related = useCatalogue().relatedProducts(product);

  return (
    <div className="container-shop pt-6">
      <nav aria-label="Fil d'Ariane" className="text-sm text-muted-foreground">
        <Link to="/" className="underline-offset-4 hover:underline">
          Accueil
        </Link>
        <span className="mx-2">/</span>
        <Link
          to="/rayon/$slug"
          params={{ slug: category.slug }}
          className="underline-offset-4 hover:underline"
        >
          {category.fullName}
        </Link>
        <span className="mx-2">/</span>
        <span className="font-semibold text-foreground">{product.name}</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="lg:sticky lg:top-40 lg:self-start">
          <div className="group overflow-hidden rounded-3xl border bg-card shadow-lift">
            <ProductImage
              product={product}
              src={gallery[photo]}
              className="aspect-square"
              eager
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
          </div>
          {gallery.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {gallery.map((url, i) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setPhoto(i)}
                  aria-label={`Photo ${i + 1}`}
                  aria-pressed={i === photo}
                  className={cn(
                    "overflow-hidden rounded-xl border bg-card",
                    i === photo ? "ring-2 ring-ink" : "opacity-80 hover:opacity-100",
                  )}
                >
                  <img
                    src={url}
                    alt=""
                    loading="lazy"
                    className="aspect-square w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Photo indicative · réf. {sku}
          </p>
        </div>

        <div>
          <p
            className={cn(
              "text-xs font-bold uppercase tracking-[0.18em]",
              CATEGORY_TEXT[product.category],
            )}
          >
            {category.name} · {product.subcategory}
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight md:text-5xl">{product.name}</h1>
          {product.brand && (
            <p className="mt-2 text-base">
              Marque : <span className="font-semibold">{product.brand}</span>
            </p>
          )}
          <p
            className={cn(
              "mt-5 font-semibold",
              price != null ? "text-3xl text-gold-deep" : "text-xl text-foreground",
            )}
          >
            {formatPrice(price)}
          </p>
          {price == null && (
            <p className="mt-1 text-sm text-muted-foreground">
              La boutique vous confirme le prix sur WhatsApp.
            </p>
          )}

          <p className="mt-6 text-base leading-relaxed text-foreground/85">{product.description}</p>

          {product.variants.length > 0 && (
            <div className="mt-7">
              <p className="text-sm font-semibold">
                Coloris : <span className="font-normal">{variant?.label}</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                {product.variants.map((v) => (
                  <button
                    key={v.sku}
                    type="button"
                    onClick={() => setVariantSku(v.sku)}
                    aria-pressed={v.sku === variantSku}
                    className={cn(
                      "flex items-center gap-2 rounded-full border bg-card py-1.5 pl-1.5 pr-4 text-sm font-medium transition",
                      v.sku === variantSku ? "border-ink ring-2 ring-ink" : "hover:border-ink",
                    )}
                  >
                    <Swatch swatch={v.swatch} className="h-7 w-7" />
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.options && (
            <div className="mt-6 flex items-start gap-3 rounded-2xl bg-sand p-4 text-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold-deep" />
              <p>
                <span className="font-semibold">{product.options}.</span> Indiquez votre choix dans
                le message WhatsApp.
              </p>
            </div>
          )}

          <div className="mt-7">
            <p className="text-sm font-semibold">Quantité</p>
            <div className="mt-2 inline-flex h-12 items-center rounded-full border-2 border-ink">
              <button
                type="button"
                aria-label="Diminuer"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="grid h-full w-12 place-items-center"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center font-semibold">{qty}</span>
              <button
                type="button"
                aria-label="Augmenter"
                onClick={() => setQty((q) => q + 1)}
                className="grid h-full w-12 place-items-center"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-7 grid gap-3">
            <button
              type="button"
              onClick={() => add(sku, qty)}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-primary text-base font-semibold text-primary-foreground shadow-gold transition hover:brightness-105"
            >
              <ShoppingBag className="h-5 w-5" /> Ajouter au panier
            </button>
            <a
              href={whatsappUrl(message)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-whatsapp text-base font-semibold text-whatsapp-foreground transition hover:brightness-110"
            >
              <MessageCircle className="h-5 w-5" /> Commander sur WhatsApp
            </a>
          </div>

          <div className="mt-4 rounded-2xl bg-whatsapp-soft p-4 text-sm">
            <p className="font-semibold text-whatsapp">Message envoyé sur WhatsApp</p>
            <p className="mt-1 text-foreground/80">{message}</p>
          </div>

          <ul className="mt-7 space-y-3 border-t pt-6 text-sm">
            <li className="flex items-center gap-3">
              <Truck className="h-4 w-4 text-gold-deep" />{" "}
              <span>
                <strong>Livraison</strong> à Dakar et banlieue
              </span>
            </li>
            <li className="flex items-center gap-3">
              <Store className="h-4 w-4 text-gold-deep" />{" "}
              <span>
                <strong>Retrait</strong> en boutique
              </span>
            </li>
            <li className="flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-gold-deep" />{" "}
              <span>
                <strong>Paiement</strong> Wave, Orange Money ou à la livraison
              </span>
            </li>
          </ul>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="text-3xl font-bold">Dans le même rayon</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

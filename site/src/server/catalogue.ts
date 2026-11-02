import "@tanstack/react-start/server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import {
  CATEGORIES,
  type CategorySlug,
  type Product,
  type SwatchKey,
  type Variant,
} from "@/data/catalogue";
import { db } from "./db";
import { categories, productImages, products, productVariants, universes } from "./db/schema";

/**
 * Catalogue lu en base, au format attendu par le site (type Product).
 * Gardé 30 s en mémoire ; l'espace boutique vide le cache à chaque modification.
 */
const TTL_MS = 30_000;
let cache: { at: number; data: Promise<Product[]> } | null = null;

export function invalidateCatalogue() {
  cache = null;
}

export function loadCatalogue(): Promise<Product[]> {
  if (!cache || Date.now() - cache.at > TTL_MS) {
    const data = queryCatalogue();
    cache = { at: Date.now(), data };
    data.catch(() => (cache = null)); // une erreur base ne reste pas en cache
  }
  return cache.data;
}

const SLUGS = new Set<string>(CATEGORIES.map((c) => c.slug));

async function queryCatalogue(): Promise<Product[]> {
  const rows = await db
    .select({ product: products, universeSlug: universes.slug, subcategory: categories.name })
    .from(products)
    .innerJoin(universes, eq(universes.id, products.universeId))
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(eq(products.visible, true))
    .orderBy(asc(universes.position), asc(products.id));

  const ids = rows.map((r) => r.product.id);
  const variants = ids.length
    ? await db
        .select()
        .from(productVariants)
        .where(and(inArray(productVariants.productId, ids), eq(productVariants.active, true)))
        .orderBy(asc(productVariants.position))
    : [];

  const images = ids.length
    ? await db
        .select({ productId: productImages.productId, url: productImages.url })
        .from(productImages)
        .where(inArray(productImages.productId, ids))
        .orderBy(asc(productImages.position), asc(productImages.id))
    : [];

  const out: Product[] = [];
  for (const { product: p, universeSlug, subcategory } of rows) {
    if (!SLUGS.has(universeSlug)) continue;
    const vs = variants.filter((v) => v.productId === p.id);
    if (vs.length === 0) continue; // plus aucun article actif
    const single = vs.length === 1 && Object.keys(vs[0]!.options).length === 0 ? vs[0]! : null;
    const mapped: Variant[] = single
      ? []
      : vs.map((v) => ({
          sku: v.sku,
          label: Object.values(v.options)[0] ?? v.sku,
          ...(v.swatch ? { swatch: v.swatch as SwatchKey } : {}),
          ...(v.price !== null ? { price: v.price } : {}),
        }));
    const urls = images.filter((i) => i.productId === p.id).map((i) => i.url);
    const prices = vs.map((v) => v.price).filter((x): x is number => x !== null);
    const price = single ? single.price : prices.length ? Math.min(...prices) : null;
    out.push({
      id: p.sku,
      slug: p.slug,
      name: p.name,
      ...(p.brand ? { brand: p.brand } : {}),
      category: universeSlug as CategorySlug,
      subcategory: subcategory ?? "",
      description: p.description ?? "",
      variants: mapped,
      ...(p.optionsNote ? { options: p.optionsNote } : {}),
      ...(price !== null ? { price } : {}),
      ...(urls.length ? { images: urls } : {}),
      ...(p.featured ? { featured: true } : {}),
      ...(p.giftIdea ? { giftIdea: true } : {}),
    });
  }
  return out;
}

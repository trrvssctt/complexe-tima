/**
 * Synchronise la base avec le catalogue de référence (src/data/catalogue.ts) :
 * rayons, sous-catégories, produits, variantes.
 *
 *   pnpm catalogue:sync              complète ce qui manque, sans écraser l'espace boutique
 *   pnpm catalogue:sync --textes     reprend aussi noms, marques et descriptions du catalogue
 *   pnpm catalogue:sync --publier    met tous les produits du catalogue en ligne
 *
 * Ne touche jamais aux prix, stocks et seuils (espace boutique ou import XLSX).
 */
import "dotenv/config";
import { and, eq, inArray, notInArray } from "drizzle-orm";
import { CATEGORIES, SEED_PRODUCTS } from "../src/data/catalogue";
import { db } from "../src/server/db";
import { categories, products, productVariants, universes } from "../src/server/db/schema";

const args = new Set(process.argv.slice(2));
const OVERWRITE_TEXTS = args.has("--textes");
const PUBLISH = args.has("--publier");

const COLORS: Record<string, string> = {
  fournitures: "#1F5FBF",
  informatique: "#0E6B73",
  beaute: "#B02A66",
  parfumerie: "#6A3E9E",
  mode: "#BF4A0A",
  maison: "#2E7A4C",
};
/** Anciens identifiants de rayon renommés. */
const RENAMED: Record<string, string> = { "textile-maison": "maison" };
const COLOR_SWATCHES = new Set([
  "bleu",
  "rouge",
  "jaune",
  "vert",
  "noir",
  "rose",
  "kaki",
  "lilas",
  "blanc",
]);

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " et ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

async function main() {
  const stats = {
    universes: 0,
    categories: 0,
    productsCreated: 0,
    productsUpdated: 0,
    variantsCreated: 0,
    variantsDisabled: 0,
  };

  await db.transaction(async (tx) => {
    // 1. Rayons
    for (const [oldSlug, newSlug] of Object.entries(RENAMED)) {
      const [exists] = await tx
        .select({ id: universes.id })
        .from(universes)
        .where(eq(universes.slug, newSlug));
      if (!exists)
        await tx.update(universes).set({ slug: newSlug }).where(eq(universes.slug, oldSlug));
    }
    const universeIds = new Map<string, number>();
    for (const [position, c] of CATEGORIES.entries()) {
      const values = {
        name: c.fullName,
        shortName: c.name,
        tagline: c.tagline,
        description: c.description,
        position,
      };
      const [row] = await tx
        .insert(universes)
        .values({ slug: c.slug, color: COLORS[c.slug] ?? "#14110D", ...values })
        .onConflictDoUpdate({ target: universes.slug, set: values })
        .returning({ id: universes.id });
      universeIds.set(c.slug, row!.id);
      stats.universes++;
    }

    // 2. Sous-catégories (dans l'ordre d'apparition)
    const categoryIds = new Map<string, number>();
    let position = 0;
    for (const p of SEED_PRODUCTS) {
      const key = `${p.category}|${p.subcategory}`;
      if (categoryIds.has(key)) continue;
      const universeId = universeIds.get(p.category)!;
      const slug = slugify(p.subcategory);
      await tx
        .insert(categories)
        .values({ universeId, slug, name: p.subcategory, position: position++ })
        .onConflictDoNothing();
      await tx
        .update(categories)
        .set({ name: p.subcategory })
        .where(and(eq(categories.universeId, universeId), eq(categories.slug, slug)));
      const [row] = await tx
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.universeId, universeId), eq(categories.slug, slug)));
      categoryIds.set(key, row!.id);
      stats.categories++;
    }

    // 3. Produits : slugs temporaires d'abord, pour éviter les collisions pendant le renommage
    const seedSkus = SEED_PRODUCTS.map((p) => p.id);
    const existing = await tx.select().from(products).where(inArray(products.sku, seedSkus));
    const bySku = new Map(existing.map((p) => [p.sku, p]));
    for (const p of existing)
      await tx
        .update(products)
        .set({ slug: `tmp-${p.id}` })
        .where(eq(products.id, p.id));

    for (const seed of SEED_PRODUCTS) {
      const hasVariants = seed.variants.length > 0;
      const axis =
        hasVariants && seed.variants.every((v) => v.swatch && COLOR_SWATCHES.has(v.swatch))
          ? "Couleur"
          : "Modèle";
      const always = {
        slug: seed.slug,
        universeId: universeIds.get(seed.category)!,
        categoryId: categoryIds.get(`${seed.category}|${seed.subcategory}`) ?? null,
        optionNames: hasVariants ? [axis] : [],
        featured: !!seed.featured,
        giftIdea: !!seed.giftIdea,
        optionsNote: seed.options ?? null,
      };
      const current = bySku.get(seed.id);
      let productId: number;
      if (!current) {
        const [row] = await tx
          .insert(products)
          .values({
            sku: seed.id,
            name: seed.name,
            brand: seed.brand ?? null,
            description: seed.description,
            visible: true,
            ...always,
          })
          .returning({ id: products.id });
        productId = row!.id;
        stats.productsCreated++;
      } else {
        productId = current.id;
        await tx
          .update(products)
          .set({
            ...always,
            name: OVERWRITE_TEXTS ? seed.name : current.name,
            brand: OVERWRITE_TEXTS || !current.brand ? (seed.brand ?? null) : current.brand,
            description:
              OVERWRITE_TEXTS || !current.description ? seed.description : current.description,
            ...(PUBLISH ? { visible: true } : {}),
          })
          .where(eq(products.id, productId));
        stats.productsUpdated++;
      }

      // 4. Variantes (ou article unique, SKU = SKU parent)
      const wanted = hasVariants
        ? seed.variants.map((v, i) => ({
            sku: v.sku,
            options: { [axis]: v.label },
            swatch: v.swatch ?? null,
            position: i,
          }))
        : [{ sku: seed.id, options: {}, swatch: null, position: 0 }];
      for (const v of wanted) {
        const [row] = await tx
          .select({ id: productVariants.id })
          .from(productVariants)
          .where(eq(productVariants.sku, v.sku));
        if (row) {
          await tx
            .update(productVariants)
            .set({
              productId,
              options: v.options,
              swatch: v.swatch,
              position: v.position,
              active: true,
            })
            .where(eq(productVariants.id, row.id));
        } else {
          await tx.insert(productVariants).values({ productId, ...v });
          stats.variantsCreated++;
        }
      }
      // Articles en base qui ne sont plus au catalogue : désactivés (jamais supprimés : commandes passées)
      const disabled = await tx
        .update(productVariants)
        .set({ active: false })
        .where(
          and(
            eq(productVariants.productId, productId),
            notInArray(
              productVariants.sku,
              wanted.map((w) => w.sku),
            ),
            eq(productVariants.active, true),
          ),
        )
        .returning({ id: productVariants.id });
      stats.variantsDisabled += disabled.length;
    }
  });

  const orphans = await db
    .select({ sku: products.sku, name: products.name })
    .from(products)
    .where(
      notInArray(
        products.sku,
        SEED_PRODUCTS.map((p) => p.id),
      ),
    );
  console.log("Synchronisation terminée :", stats);
  if (orphans.length)
    console.warn(
      `Produits en base absents du catalogue (laissés tels quels) : ${orphans.map((o) => o.sku).join(", ")}`,
    );
  process.exit(0);
}

main().catch((e) => {
  console.error(e?.cause?.message ?? e?.message ?? e);
  process.exit(1);
});

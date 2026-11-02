import "@tanstack/react-start/server-only";
import { and, asc, count, desc, eq, gte, ilike, inArray, ne, or, sql, sum } from "drizzle-orm";
import { invalidateCatalogue } from "./catalogue";
import { db } from "./db";
import {
  categories,
  orderEvents,
  orderItems,
  orders,
  productImages,
  products,
  productVariants,
  universes,
} from "./db/schema";
import { ORDER_STATUS, NEXT_STATUS, type OrderStatus } from "@/lib/admin-labels";

/** Minuit à Dakar (UTC+0 toute l'année). */
const startOfToday = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

// ─── Tableau de bord ─────────────────────────────────────────────────────────

export async function dashboard() {
  const today = startOfToday();
  const [[todayStats], [pending], recent, lowStock] = await Promise.all([
    db
      .select({ orders: count(), sales: sum(orders.total) })
      .from(orders)
      .where(and(gte(orders.createdAt, today), ne(orders.status, "annulee"))),
    db
      .select({ n: count() })
      .from(orders)
      .where(inArray(orders.status, ["nouvelle", "en_preparation"])),
    db.select().from(orders).orderBy(desc(orders.createdAt)).limit(5),
    db
      .select({
        productId: products.id,
        name: products.name,
        options: productVariants.options,
        stock: productVariants.stock,
      })
      .from(productVariants)
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(
        and(
          eq(products.visible, true),
          eq(productVariants.active, true),
          sql`${productVariants.price} is not null`,
          sql`${productVariants.stock} <= ${productVariants.lowStockThreshold}`,
        ),
      )
      .orderBy(productVariants.stock)
      .limit(8),
  ]);
  return {
    todayOrders: todayStats?.orders ?? 0,
    todaySales: Number(todayStats?.sales ?? 0),
    pending: pending?.n ?? 0,
    recent,
    lowStock,
  };
}

export async function pendingCount() {
  const [row] = await db.select({ n: count() }).from(orders).where(eq(orders.status, "nouvelle"));
  return row?.n ?? 0;
}

// ─── Commandes ───────────────────────────────────────────────────────────────

export async function listOrders({
  status,
  q,
}: {
  status?: string | undefined;
  q?: string | undefined;
}) {
  const validStatus = status && status in ORDER_STATUS ? (status as OrderStatus) : undefined;
  const term = q?.trim().slice(0, 80);
  const search = term
    ? or(
        ilike(orders.number, `%${term}%`),
        ilike(orders.customerName, `%${term}%`),
        ilike(orders.customerPhone, `%${term.replace(/\D/g, "") || term}%`),
      )
    : undefined;
  const [rows, counts] = await Promise.all([
    db
      .select()
      .from(orders)
      .where(and(validStatus ? eq(orders.status, validStatus) : undefined, search))
      .orderBy(desc(orders.createdAt))
      .limit(200),
    db.select({ status: orders.status, n: count() }).from(orders).groupBy(orders.status),
  ]);
  const byStatus = Object.fromEntries(counts.map((c) => [c.status, c.n])) as Partial<
    Record<OrderStatus, number>
  >;
  return {
    rows,
    byStatus,
    total: counts.reduce((s, c) => s + c.n, 0),
    status: validStatus ?? null,
  };
}

export async function orderDetail(number: string) {
  if (!/^TIMA-\d{1,10}$/.test(number)) return null;
  const [order] = await db.select().from(orders).where(eq(orders.number, number));
  if (!order) return null;
  const [items, events] = await Promise.all([
    db
      .select({
        item: orderItems,
        stock: productVariants.stock,
        threshold: productVariants.lowStockThreshold,
        productId: productVariants.productId,
      })
      .from(orderItems)
      .leftJoin(productVariants, eq(productVariants.id, orderItems.variantId))
      .where(eq(orderItems.orderId, order.id))
      .orderBy(orderItems.id),
    db
      .select()
      .from(orderEvents)
      .where(eq(orderEvents.orderId, order.id))
      .orderBy(desc(orderEvents.createdAt)),
  ]);
  return { ...order, items, events };
}

/** Fait avancer la commande d'une étape. `from` évite qu'un double clic saute une étape. */
export async function advanceOrder(id: number, from: OrderStatus, author: string) {
  const next = NEXT_STATUS[from];
  if (!next) return;
  await db.transaction(async (tx) => {
    const updated = await tx
      .update(orders)
      .set({ status: next.to })
      .where(and(eq(orders.id, id), eq(orders.status, from)))
      .returning({ id: orders.id });
    if (updated.length)
      await tx
        .insert(orderEvents)
        .values({ orderId: id, type: "statut", fromValue: from, toValue: next.to, author });
  });
}

export async function cancelOrder(id: number, author: string) {
  await db.transaction(async (tx) => {
    const [current] = await tx
      .select({ status: orders.status })
      .from(orders)
      .where(eq(orders.id, id));
    if (!current || current.status === "livree" || current.status === "annulee") return;
    await tx.update(orders).set({ status: "annulee" }).where(eq(orders.id, id));
    await tx.insert(orderEvents).values({
      orderId: id,
      type: "statut",
      fromValue: current.status,
      toValue: "annulee",
      author,
    });
  });
}

export async function markPaid(id: number, author: string) {
  await db.transaction(async (tx) => {
    const updated = await tx
      .update(orders)
      .set({ paymentStatus: "paye", paidAt: new Date() })
      .where(and(eq(orders.id, id), ne(orders.paymentStatus, "paye")))
      .returning({ id: orders.id });
    if (updated.length)
      await tx
        .insert(orderEvents)
        .values({ orderId: id, type: "paiement", toValue: "paye", author });
  });
}

export async function saveOrderNote(id: number, note: string, author: string) {
  await db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({ internalNote: note || null })
      .where(eq(orders.id, id));
    await tx.insert(orderEvents).values({ orderId: id, type: "note", author });
  });
}

// ─── Produits ────────────────────────────────────────────────────────────────

export async function listProducts({
  q,
  universe,
  visibility,
}: {
  q?: string | undefined;
  universe?: string | undefined;
  visibility?: string | undefined;
}) {
  const term = q?.trim().slice(0, 80);
  const rows = await db
    .select({ product: products, universeName: universes.shortName, universeSlug: universes.slug })
    .from(products)
    .innerJoin(universes, eq(universes.id, products.universeId))
    .where(
      and(
        term
          ? or(
              ilike(products.name, `%${term}%`),
              ilike(products.sku, `%${term}%`),
              ilike(products.brand, `%${term}%`),
            )
          : undefined,
        universe ? eq(universes.slug, universe) : undefined,
        visibility === "visible"
          ? eq(products.visible, true)
          : visibility === "masque"
            ? eq(products.visible, false)
            : undefined,
      ),
    )
    .orderBy(asc(universes.position), asc(products.id));
  const ids = rows.map((r) => r.product.id);
  const variants = ids.length
    ? await db.select().from(productVariants).where(inArray(productVariants.productId, ids))
    : [];
  const allUniverses = await db
    .select({ slug: universes.slug, shortName: universes.shortName })
    .from(universes)
    .orderBy(asc(universes.position));
  return {
    universes: allUniverses,
    rows: rows.map(({ product: p, universeName, universeSlug }) => {
      const vs = variants.filter((v) => v.productId === p.id && v.active);
      const prices = vs.map((v) => v.price).filter((x): x is number => x !== null);
      return {
        id: p.id,
        sku: p.sku,
        slug: p.slug,
        name: p.name,
        visible: p.visible,
        needsReview: p.needsReview,
        universeName,
        universeSlug,
        variantCount: vs.length,
        price: prices.length ? Math.min(...prices) : null,
        missingPrices: vs.length - prices.length,
        stock: vs.reduce((s, v) => s + v.stock, 0),
      };
    }),
  };
}

export async function productDetail(id: number) {
  const [row] = await db
    .select({ product: products, universe: universes })
    .from(products)
    .innerJoin(universes, eq(universes.id, products.universeId))
    .where(eq(products.id, id));
  if (!row) return null;
  const [variants, images, cats] = await Promise.all([
    db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, id))
      .orderBy(asc(productVariants.position)),
    db.select({ id: productImages.id }).from(productImages).where(eq(productImages.productId, id)),
    db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(eq(categories.universeId, row.universe.id))
      .orderBy(asc(categories.position)),
  ]);
  const p = row.product;
  return {
    id: p.id,
    sku: p.sku,
    slug: p.slug,
    name: p.name,
    description: p.description,
    brand: p.brand,
    categoryId: p.categoryId,
    visible: p.visible,
    featured: p.featured,
    giftIdea: p.giftIdea,
    needsReview: p.needsReview,
    internalNote: p.internalNote,
    optionsNote: p.optionsNote,
    optionNames: p.optionNames,
    universeName: row.universe.shortName,
    universeId: row.universe.id,
    imageCount: images.length,
    categories: cats,
    variants: variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      options: v.options,
      price: v.price,
      stock: v.stock,
      lowStockThreshold: v.lowStockThreshold,
      active: v.active,
    })),
  };
}

export async function setVisibility(id: number, visible: boolean) {
  await db.update(products).set({ visible }).where(eq(products.id, id));
  invalidateCatalogue();
}

export type ProductUpdate = {
  id: number;
  name: string;
  description: string | null;
  brand: string | null;
  categoryId: number | null;
  optionsNote: string | null;
  visible: boolean;
  featured: boolean;
  giftIdea: boolean;
  needsReview: boolean;
  internalNote: string | null;
  variants: {
    id: number;
    price: number | null;
    stock: number;
    lowStockThreshold: number;
    active: boolean;
  }[];
};

export async function updateProduct(
  u: ProductUpdate,
): Promise<{ error?: string; fieldErrors?: Record<string, string> }> {
  const [product] = await db.select().from(products).where(eq(products.id, u.id));
  if (!product) return { error: "Produit introuvable." };
  if (u.categoryId) {
    const [cat] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.id, u.categoryId), eq(categories.universeId, product.universeId)));
    if (!cat)
      return {
        error: "Sous-catégorie invalide.",
        fieldErrors: { categoryId: "Sous-catégorie invalide." },
      };
  }
  const own = await db
    .select({ id: productVariants.id })
    .from(productVariants)
    .where(eq(productVariants.productId, u.id));
  const ownIds = new Set(own.map((v) => v.id));
  const { id, variants, ...values } = u;
  await db.transaction(async (tx) => {
    await tx.update(products).set(values).where(eq(products.id, id));
    // Uniquement les variantes qui appartiennent bien à ce produit
    for (const { id: variantId, ...v } of variants.filter((v) => ownIds.has(v.id))) {
      await tx.update(productVariants).set(v).where(eq(productVariants.id, variantId));
    }
  });
  invalidateCatalogue();
  return {};
}

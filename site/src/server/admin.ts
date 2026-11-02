import "@tanstack/react-start/server-only";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  like,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { NEXT_STATUS, ORDER_STATUS, type OrderStatus } from "@/lib/admin-labels";
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

const DAY_MS = 24 * 60 * 60 * 1000;

/** Minuit à Dakar (UTC+0 toute l'année). */
const startOfDay = (d = new Date()) => {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
};

export const PERIODS = {
  jour: "Aujourd’hui",
  "7j": "7 derniers jours",
  "30j": "30 derniers jours",
  annee: "12 derniers mois",
} as const;
export type Period = keyof typeof PERIODS;

function periodStart(period: Period): Date {
  const today = startOfDay();
  if (period === "jour") return today;
  if (period === "7j") return new Date(today.getTime() - 6 * DAY_MS);
  if (period === "30j") return new Date(today.getTime() - 29 * DAY_MS);
  return new Date(today.getTime() - 364 * DAY_MS);
}

// ─── Statistiques ────────────────────────────────────────────────────────────

/**
 * Chiffre d'affaires, coûts et marge sur la période (commandes non annulées).
 * Seules les lignes au prix connu comptent ; les coûts utilisent le prix d'achat figé à la commande.
 */
export async function stats(period: Period) {
  const from = periodStart(period);
  const valid = and(gte(orders.createdAt, from), ne(orders.status, "annulee"));

  const [[totals], [orderStats], daily, top, byPayment, [stock], pending, recent, lowStock] =
    await Promise.all([
      db
        .select({
          revenue: sql<number>`coalesce(sum(${orderItems.lineTotal}), 0)::int`,
          cost: sql<number>`coalesce(sum(${orderItems.unitCost} * ${orderItems.quantity}) filter (where ${orderItems.lineTotal} is not null), 0)::int`,
          costedRevenue: sql<number>`coalesce(sum(${orderItems.lineTotal}) filter (where ${orderItems.unitCost} is not null), 0)::int`,
          units: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int`,
          linesWithoutCost: sql<number>`count(*) filter (where ${orderItems.lineTotal} is not null and ${orderItems.unitCost} is null)::int`,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orders.id, orderItems.orderId))
        .where(valid),
      db
        .select({
          orders: count(),
          unpriced: sql<number>`count(*) filter (where ${orders.total} is null)::int`,
          paid: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.paymentStatus} = 'paye'), 0)::int`,
          avgBasket: sql<number>`coalesce(avg(${orders.total}) filter (where ${orders.total} is not null), 0)::int`,
        })
        .from(orders)
        .where(valid),
      db
        .select({
          day: sql<string>`to_char(date_trunc('day', ${orders.createdAt} at time zone 'UTC'), 'YYYY-MM-DD')`,
          revenue: sql<number>`coalesce(sum(${orderItems.lineTotal}), 0)::int`,
          cost: sql<number>`coalesce(sum(${orderItems.unitCost} * ${orderItems.quantity}) filter (where ${orderItems.lineTotal} is not null), 0)::int`,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orders.id, orderItems.orderId))
        .where(
          and(
            gte(orders.createdAt, period === "annee" ? from : periodStart("30j")),
            ne(orders.status, "annulee"),
          ),
        )
        .groupBy(sql`1`)
        .orderBy(sql`1`),
      db
        .select({
          label: orderItems.label,
          units: sql<number>`sum(${orderItems.quantity})::int`,
          revenue: sql<number>`coalesce(sum(${orderItems.lineTotal}), 0)::int`,
          cost: sql<number>`coalesce(sum(${orderItems.unitCost} * ${orderItems.quantity}) filter (where ${orderItems.lineTotal} is not null), 0)::int`,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orders.id, orderItems.orderId))
        .where(valid)
        .groupBy(orderItems.label)
        .orderBy(sql`3 desc`, sql`2 desc`)
        .limit(6),
      db
        .select({
          method: orders.paymentMethod,
          n: count(),
          total: sql<number>`coalesce(sum(${orders.total}), 0)::int`,
        })
        .from(orders)
        .where(valid)
        .groupBy(orders.paymentMethod),
      db
        .select({
          costValue: sql<number>`coalesce(sum(${productVariants.stock} * ${productVariants.purchasePrice}), 0)::bigint`,
          saleValue: sql<number>`coalesce(sum(${productVariants.stock} * ${productVariants.price}), 0)::bigint`,
          units: sql<number>`coalesce(sum(${productVariants.stock}), 0)::int`,
          withoutCost: sql<number>`count(*) filter (where ${productVariants.purchasePrice} is null)::int`,
          withoutPrice: sql<number>`count(*) filter (where ${productVariants.price} is null)::int`,
        })
        .from(productVariants)
        .where(eq(productVariants.active, true)),
      db
        .select({ status: orders.status, n: count() })
        .from(orders)
        .where(inArray(orders.status, ["nouvelle", "en_preparation", "prete"]))
        .groupBy(orders.status),
      db.select().from(orders).orderBy(desc(orders.createdAt)).limit(6),
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
            sql`${productVariants.stock} > 0 or ${productVariants.price} is not null`,
            sql`${productVariants.stock} <= ${productVariants.lowStockThreshold}`,
          ),
        )
        .orderBy(productVariants.stock)
        .limit(6),
    ]);

  // Série quotidienne continue (jours sans vente à 0) ; par mois sur 12 mois
  const byDay = new Map(daily.map((d) => [d.day, d]));
  let series: { label: string; revenue: number; cost: number }[];
  if (period === "annee") {
    const months = new Map<string, { revenue: number; cost: number }>();
    for (const d of daily) {
      const k = d.day.slice(0, 7);
      const m = months.get(k) ?? { revenue: 0, cost: 0 };
      months.set(k, { revenue: m.revenue + d.revenue, cost: m.cost + d.cost });
    }
    series = Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      d.setUTCDate(1);
      d.setUTCMonth(d.getUTCMonth() - 11 + i);
      const k = d.toISOString().slice(0, 7);
      return { label: k, ...(months.get(k) ?? { revenue: 0, cost: 0 }) };
    });
  } else {
    const days = period === "jour" ? 7 : period === "7j" ? 7 : 30;
    const start = startOfDay().getTime() - (days - 1) * DAY_MS;
    series = Array.from({ length: days }, (_, i) => {
      const k = new Date(start + i * DAY_MS).toISOString().slice(0, 10);
      const d = byDay.get(k);
      return { label: k, revenue: d?.revenue ?? 0, cost: d?.cost ?? 0 };
    });
  }

  const revenue = totals?.revenue ?? 0;
  const cost = totals?.cost ?? 0;
  const costedRevenue = totals?.costedRevenue ?? 0;
  return {
    period,
    revenue,
    cost,
    /** Marge calculée sur les seules lignes dont le prix d'achat est connu. */
    margin: costedRevenue - cost,
    marginRate:
      costedRevenue > 0 ? Math.round(((costedRevenue - cost) / costedRevenue) * 100) : null,
    units: totals?.units ?? 0,
    linesWithoutCost: totals?.linesWithoutCost ?? 0,
    orders: orderStats?.orders ?? 0,
    unpricedOrders: orderStats?.unpriced ?? 0,
    paid: orderStats?.paid ?? 0,
    avgBasket: orderStats?.avgBasket ?? 0,
    series,
    top: top.map((t) => ({ ...t, margin: t.revenue - t.cost })),
    byPayment,
    stock: {
      costValue: Number(stock?.costValue ?? 0),
      saleValue: Number(stock?.saleValue ?? 0),
      units: stock?.units ?? 0,
      withoutCost: stock?.withoutCost ?? 0,
      withoutPrice: stock?.withoutPrice ?? 0,
    },
    pending: Object.fromEntries(pending.map((p) => [p.status, p.n])) as Partial<
      Record<OrderStatus, number>
    >,
    recent,
    lowStock,
  };
}

export async function pendingCount() {
  const [row] = await db.select({ n: count() }).from(orders).where(eq(orders.status, "nouvelle"));
  return row?.n ?? 0;
}

// ─── Commandes ───────────────────────────────────────────────────────────────

export type OrderFilters = {
  status?: string | undefined;
  q?: string | undefined;
  periode?: string | undefined;
  paiement?: string | undefined;
};

export async function listOrders(f: OrderFilters) {
  const validStatus = f.status && f.status in ORDER_STATUS ? (f.status as OrderStatus) : undefined;
  const period = f.periode && f.periode in PERIODS ? (f.periode as Period) : undefined;
  const term = f.q?.trim().slice(0, 80);
  const search = term
    ? or(
        ilike(orders.number, `%${term}%`),
        ilike(orders.customerName, `%${term}%`),
        ilike(orders.customerPhone, `%${term.replace(/\D/g, "") || term}%`),
      )
    : undefined;
  const scope = and(
    period ? gte(orders.createdAt, periodStart(period)) : undefined,
    f.paiement === "paye"
      ? eq(orders.paymentStatus, "paye")
      : f.paiement === "a_confirmer"
        ? ne(orders.paymentStatus, "paye")
        : undefined,
    search,
  );

  const [rows, counts, [sums]] = await Promise.all([
    db
      .select({
        order: orders,
        items: sql<number>`(select coalesce(sum(${orderItems.quantity}), 0) from ${orderItems} where ${orderItems.orderId} = ${orders.id})::int`,
      })
      .from(orders)
      .where(and(validStatus ? eq(orders.status, validStatus) : undefined, scope))
      .orderBy(desc(orders.createdAt))
      .limit(300),
    db
      .select({ status: orders.status, n: count() })
      .from(orders)
      .where(scope)
      .groupBy(orders.status),
    db
      .select({
        total: sql<number>`coalesce(sum(${orders.total}), 0)::int`,
        unpriced: sql<number>`count(*) filter (where ${orders.total} is null)::int`,
      })
      .from(orders)
      .where(
        and(validStatus ? eq(orders.status, validStatus) : ne(orders.status, "annulee"), scope),
      ),
  ]);
  const byStatus = Object.fromEntries(counts.map((c) => [c.status, c.n])) as Partial<
    Record<OrderStatus, number>
  >;
  return {
    rows: rows.map((r) => ({ ...r.order, itemCount: r.items })),
    byStatus,
    total: counts.reduce((s, c) => s + c.n, 0),
    amount: sums?.total ?? 0,
    unpriced: sums?.unpriced ?? 0,
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
        productId: productVariants.productId,
        stock: productVariants.stock,
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

/**
 * Prix confirmés après échange WhatsApp : prix unitaires des lignes et frais de livraison.
 * Recalcule sous-total et total (inconnus tant qu'une ligne reste sans prix).
 */
export async function updateOrderPricing(
  id: number,
  lines: { itemId: number; unitPrice: number | null }[],
  deliveryFee: number,
  author: string,
): Promise<{ error?: string }> {
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, id));
    if (!order) return { error: "Commande introuvable." };
    if (order.status === "annulee")
      return { error: "Commande annulée : les prix ne peuvent plus être modifiés." };
    const items = await tx
      .select({ item: orderItems, purchasePrice: productVariants.purchasePrice })
      .from(orderItems)
      .leftJoin(productVariants, eq(productVariants.id, orderItems.variantId))
      .where(eq(orderItems.orderId, id));
    const wanted = new Map(lines.map((l) => [l.itemId, l.unitPrice]));
    let subtotal: number | null = 0;
    for (const { item, purchasePrice } of items) {
      const unitPrice = wanted.has(item.id) ? wanted.get(item.id)! : item.unitPrice;
      const lineTotal = unitPrice === null ? null : unitPrice * item.quantity;
      await tx
        .update(orderItems)
        .set({ unitPrice, lineTotal, unitCost: item.unitCost ?? purchasePrice ?? null })
        .where(eq(orderItems.id, item.id));
      subtotal = subtotal === null || lineTotal === null ? null : subtotal + lineTotal;
    }
    await tx
      .update(orders)
      .set({ subtotal, deliveryFee, total: subtotal === null ? null : subtotal + deliveryFee })
      .where(eq(orders.id, id));
    await tx.insert(orderEvents).values({ orderId: id, type: "prix", author });
    return {};
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
  const [variants, images, allUniverses] = await Promise.all([
    ids.length
      ? db.select().from(productVariants).where(inArray(productVariants.productId, ids))
      : [],
    ids.length
      ? db
          .select({ productId: productImages.productId, url: productImages.url })
          .from(productImages)
          .where(inArray(productImages.productId, ids))
          .orderBy(asc(productImages.position))
      : [],
    db
      .select({ slug: universes.slug, shortName: universes.shortName })
      .from(universes)
      .orderBy(asc(universes.position)),
  ]);
  return {
    universes: allUniverses,
    rows: rows.map(({ product: p, universeName, universeSlug }) => {
      const vs = variants.filter((v) => v.productId === p.id && v.active);
      const prices = vs.map((v) => v.price).filter((x): x is number => x !== null);
      const costs = vs.map((v) => v.purchasePrice).filter((x): x is number => x !== null);
      return {
        id: p.id,
        sku: p.sku,
        slug: p.slug,
        name: p.name,
        visible: p.visible,
        featured: p.featured,
        needsReview: p.needsReview,
        universeName,
        universeSlug,
        image: images.find((i) => i.productId === p.id)?.url ?? null,
        variantCount: vs.length,
        price: prices.length ? Math.min(...prices) : null,
        cost: costs.length ? Math.min(...costs) : null,
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
    db
      .select({ url: productImages.url })
      .from(productImages)
      .where(eq(productImages.productId, id))
      .orderBy(asc(productImages.position), asc(productImages.id)),
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
    optionName: p.optionNames[0] ?? "Couleur",
    universeSlug: row.universe.slug,
    universeName: row.universe.shortName,
    images: images.map((i) => i.url),
    categories: cats,
    variants: variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      label: Object.values(v.options)[0] ?? "",
      price: v.price,
      purchasePrice: v.purchasePrice,
      stock: v.stock,
      lowStockThreshold: v.lowStockThreshold,
      active: v.active,
    })),
  };
}

/** Rayons et sous-catégories, pour le formulaire de création. */
export async function productFormOptions() {
  const [us, cats] = await Promise.all([
    db
      .select({ id: universes.id, slug: universes.slug, name: universes.shortName })
      .from(universes)
      .orderBy(asc(universes.position)),
    db
      .select({ id: categories.id, universeId: categories.universeId, name: categories.name })
      .from(categories)
      .orderBy(asc(categories.position)),
  ]);
  return us.map((u) => ({
    slug: u.slug,
    name: u.name,
    categories: cats.filter((c) => c.universeId === u.id).map(({ id, name }) => ({ id, name })),
  }));
}

export async function setVisibility(id: number, visible: boolean) {
  await db.update(products).set({ visible }).where(eq(products.id, id));
  invalidateCatalogue();
}

// Préfixes SKU par rayon (identiques au catalogue d'origine)
const SKU_PREFIX: Record<string, string> = {
  fournitures: "SCO",
  informatique: "INF",
  beaute: "BEA",
  parfumerie: "PAR",
  mode: "MOD",
  maison: "MAI",
};
const SWATCHES: Record<string, string> = {
  bleu: "bleu",
  rouge: "rouge",
  jaune: "jaune",
  vert: "vert",
  noir: "noir",
  rose: "rose",
  kaki: "kaki",
  lilas: "lilas",
  blanc: "blanc",
};

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " et ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export type VariantInput = {
  id?: number | undefined;
  label: string;
  price: number | null;
  purchasePrice: number | null;
  stock: number;
  lowStockThreshold: number;
  active: boolean;
};

export type ProductInput = {
  name: string;
  description: string | null;
  brand: string | null;
  universeSlug: string;
  categoryId: number | null;
  newCategory: string | null;
  optionName: string;
  optionsNote: string | null;
  visible: boolean;
  featured: boolean;
  giftIdea: boolean;
  needsReview: boolean;
  internalNote: string | null;
  images: string[];
  variants: VariantInput[];
};

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Sous-catégorie choisie, ou créée à la volée dans le rayon. */
async function resolveCategory(
  tx: Tx,
  universeId: number,
  categoryId: number | null,
  newCategory: string | null,
) {
  if (newCategory) {
    const slug = slugify(newCategory) || "autres";
    await tx
      .insert(categories)
      .values({ universeId, slug, name: newCategory, position: 999 })
      .onConflictDoNothing();
    const [cat] = await tx
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.universeId, universeId), eq(categories.slug, slug)));
    return { id: cat!.id };
  }
  if (!categoryId) return { id: null };
  const [cat] = await tx
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.universeId, universeId)));
  return cat ? { id: cat.id } : { error: "Sous-catégorie invalide." };
}

async function uniqueSlug(tx: Tx, name: string, exceptId?: number) {
  const base = slugify(name) || "produit";
  for (let i = 0; i < 50; i++) {
    const slug = i === 0 ? base : `${base}-${i + 1}`;
    const [taken] = await tx
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, slug));
    if (!taken || taken.id === exceptId) return slug;
  }
  return `${base}-${Date.now()}`;
}

async function replaceImages(tx: Tx, productId: number, urls: string[]) {
  await tx.delete(productImages).where(eq(productImages.productId, productId));
  if (urls.length)
    await tx
      .insert(productImages)
      .values(urls.map((url, position) => ({ productId, url, position })));
}

function variantSku(parentSku: string, label: string, taken: Set<string>) {
  const base = `${parentSku}-${slugify(label).toUpperCase() || "VARIANTE"}`;
  let sku = base;
  for (let i = 2; taken.has(sku); i++) sku = `${base}-${i}`;
  taken.add(sku);
  return sku;
}

export async function createProduct(
  input: ProductInput,
  author: string,
): Promise<{ id?: number; error?: string }> {
  return db.transaction(async (tx) => {
    const [universe] = await tx
      .select()
      .from(universes)
      .where(eq(universes.slug, input.universeSlug));
    if (!universe) return { error: "Rayon invalide." };
    const cat = await resolveCategory(tx, universe.id, input.categoryId, input.newCategory);
    if ("error" in cat) return { error: cat.error };

    // SKU parent : CT-<préfixe>-<numéro suivant>, ex. CT-PAR-009
    const prefix = `CT-${SKU_PREFIX[universe.slug] ?? "DIV"}-`;
    const existing = await tx
      .select({ sku: products.sku })
      .from(products)
      .where(like(products.sku, `${prefix}%`));
    const next =
      Math.max(0, ...existing.map((e) => Number.parseInt(e.sku.slice(prefix.length), 10) || 0)) + 1;
    const sku = `${prefix}${String(next).padStart(3, "0")}`;

    const multiple = input.variants.length > 1 || input.variants.some((v) => v.label.trim());
    const [created] = await tx
      .insert(products)
      .values({
        sku,
        slug: await uniqueSlug(tx, input.name),
        name: input.name,
        description: input.description,
        brand: input.brand,
        universeId: universe.id,
        categoryId: cat.id,
        optionNames: multiple ? [input.optionName] : [],
        optionsNote: input.optionsNote,
        visible: input.visible,
        featured: input.featured,
        giftIdea: input.giftIdea,
        needsReview: input.needsReview,
        internalNote: input.internalNote ? `${input.internalNote}` : `Créé par ${author}`,
      })
      .returning({ id: products.id });
    const taken = new Set<string>();
    await tx.insert(productVariants).values(
      input.variants.map((v, position) => ({
        productId: created!.id,
        sku: multiple ? variantSku(sku, v.label, taken) : sku,
        options: multiple ? { [input.optionName]: v.label.trim() } : {},
        swatch: SWATCHES[slugify(v.label)] ?? null,
        price: v.price,
        purchasePrice: v.purchasePrice,
        stock: v.stock,
        lowStockThreshold: v.lowStockThreshold,
        active: v.active,
        position,
      })),
    );
    await replaceImages(tx, created!.id, input.images);
    invalidateCatalogue();
    return { id: created!.id };
  });
}

export async function updateProduct(id: number, input: ProductInput): Promise<{ error?: string }> {
  return db.transaction(async (tx) => {
    const [product] = await tx.select().from(products).where(eq(products.id, id));
    if (!product) return { error: "Produit introuvable." };
    const cat = await resolveCategory(tx, product.universeId, input.categoryId, input.newCategory);
    if ("error" in cat) return { error: cat.error };

    const own = await tx.select().from(productVariants).where(eq(productVariants.productId, id));
    const ownIds = new Set(own.map((v) => v.id));
    const taken = new Set(
      (
        await tx
          .select({ sku: productVariants.sku })
          .from(productVariants)
          .where(isNotNull(productVariants.sku))
      ).map((v) => v.sku),
    );
    const single = own.length === 1 && Object.keys(own[0]!.options).length === 0;
    const addsVariants = input.variants.some((v) => !v.id);
    // Un article unique qui reçoit des variantes devient un produit à variantes
    const multiple = !single || addsVariants;

    await tx
      .update(products)
      .set({
        name: input.name,
        description: input.description,
        brand: input.brand,
        categoryId: cat.id,
        optionNames: multiple ? [input.optionName] : [],
        optionsNote: input.optionsNote,
        visible: input.visible,
        featured: input.featured,
        giftIdea: input.giftIdea,
        needsReview: input.needsReview,
        internalNote: input.internalNote,
      })
      .where(eq(products.id, id));

    for (const [position, v] of input.variants.entries()) {
      const values = {
        price: v.price,
        purchasePrice: v.purchasePrice,
        stock: v.stock,
        lowStockThreshold: v.lowStockThreshold,
        active: v.active,
        position,
      };
      if (v.id && ownIds.has(v.id)) {
        const label = v.label.trim();
        await tx
          .update(productVariants)
          .set({
            ...values,
            ...(multiple && label
              ? { options: { [input.optionName]: label }, swatch: SWATCHES[slugify(label)] ?? null }
              : {}),
          })
          .where(eq(productVariants.id, v.id));
      } else if (!v.id) {
        await tx.insert(productVariants).values({
          productId: id,
          sku: variantSku(product.sku, v.label, taken),
          options: { [input.optionName]: v.label.trim() },
          swatch: SWATCHES[slugify(v.label)] ?? null,
          ...values,
        });
      }
    }
    // L'ancien article unique reçoit un libellé quand des variantes sont ajoutées
    if (single && addsVariants) {
      const first = input.variants.find((v) => v.id === own[0]!.id);
      await tx
        .update(productVariants)
        .set({ options: { [input.optionName]: first?.label.trim() || "Standard" } })
        .where(eq(productVariants.id, own[0]!.id));
    }
    await replaceImages(tx, id, input.images);
    invalidateCatalogue();
    return {};
  });
}

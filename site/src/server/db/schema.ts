import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgSequence,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Montants : entiers en F CFA (le franc CFA n'a pas de centimes).

const id = () => integer().primaryKey().generatedAlwaysAsIdentity();
const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// ─── Énumérations ────────────────────────────────────────────────────────────

export const orderStatus = pgEnum("order_status", [
  "nouvelle",
  "en_preparation",
  "prete",
  "livree",
  "annulee",
]);
export const orderOrigin = pgEnum("order_origin", [
  "site",
  "whatsapp",
  "liste_fournitures",
  "boutique",
]);
export const fulfillmentMode = pgEnum("fulfillment_mode", ["livraison", "retrait"]);
export const paymentMethod = pgEnum("payment_method", ["wave", "orange_money", "a_la_livraison"]);
export const paymentStatus = pgEnum("payment_status", ["a_confirmer", "paye", "rembourse"]);
export const schoolLevel = pgEnum("school_level", ["cp_ce2", "cm1_cm2", "college", "lycee"]);
export const supplyListStatus = pgEnum("supply_list_status", [
  "nouvelle",
  "pack_pret",
  "rappele",
  "convertie",
  "abandonnee",
]);
export const syncStatus = pgEnum("sync_status", ["en_cours", "succes", "echec"]);

// ─── Catalogue ───────────────────────────────────────────────────────────────

/** Les six rayons : Fournitures, Informatique, Beauté, Parfumerie, Mode, Textile et maison. */
export const universes = pgTable("universes", {
  id: id(),
  slug: text().notNull().unique(),
  name: text().notNull(), // « Parfumerie et encens »
  shortName: text().notNull(), // « Parfumerie » (menu)
  tagline: text(), // « Parfums, encens, coffrets »
  description: text(), // phrase d'introduction de la page rayon
  color: text().notNull(), // couleur d'univers de la charte
  position: integer().notNull().default(0),
});

/** Sous-catégories d'un univers (Cahiers, Brûle-encens…). */
export const categories = pgTable(
  "categories",
  {
    id: id(),
    universeId: integer()
      .notNull()
      .references(() => universes.id, { onDelete: "restrict" }),
    slug: text().notNull(),
    name: text().notNull(),
    position: integer().notNull().default(0),
  },
  (t) => [uniqueIndex().on(t.universeId, t.slug)],
);

/**
 * Produit tel qu'affiché sur le site (fiche produit).
 * Le SKU parent du catalogue (ex. CT-SCO-001) identifie le produit ;
 * les articles vendables sont dans `product_variants`.
 */
export const products = pgTable(
  "products",
  {
    id: id(),
    sku: text().notNull().unique(),
    slug: text().notNull().unique(),
    name: text().notNull(),
    description: text(),
    brand: text(),
    universeId: integer()
      .notNull()
      .references(() => universes.id, { onDelete: "restrict" }),
    categoryId: integer().references(() => categories.id, { onDelete: "set null" }),
    /** Axes de variantes dans l'ordre d'affichage, ex. ["Finition", "Taille"]. */
    optionNames: jsonb().$type<string[]>().notNull().default([]),
    /** Affiché sur le site (tout le catalogue est en ligne par défaut, « Prix sur demande » si pas de prix). */
    visible: boolean().notNull().default(true),
    /** Mis en avant sur l'accueil (« Nos incontournables »). */
    featured: boolean().notNull().default(false),
    /** Proposé dans « Idées cadeaux ». */
    giftIdea: boolean().notNull().default(false),
    /** Choix à préciser à la commande (teintes, pointures…), affiché sur la fiche. */
    optionsNote: text(),
    /** Fiche à vérifier avec la propriétaire (colonne « Confiance » du catalogue). */
    needsReview: boolean().notNull().default(false),
    internalNote: text(),
    ...timestamps,
  },
  (t) => [index().on(t.universeId), index().on(t.categoryId)],
);

/** Article vendable : porte le prix et le stock (SKU complet, ex. CT-SCO-001-BLEU). */
export const productVariants = pgTable(
  "product_variants",
  {
    id: id(),
    productId: integer()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: text().notNull().unique(),
    /** Valeur par axe, ex. { "Finition": "Doré", "Taille": "Moyen" }. Vide si produit simple. */
    options: jsonb().$type<Record<string, string>>().notNull().default({}),
    price: integer(), // prix de vente TTC ; null = « Prix sur demande » (commandable, prix confirmé sur WhatsApp)
    purchasePrice: integer(), // prix d'achat HT, admin uniquement
    stock: integer().notNull().default(0),
    lowStockThreshold: integer().notNull().default(3),
    active: boolean().notNull().default(true),
    position: integer().notNull().default(0),
    /** Pastille de couleur affichée sur le site (bleu, rouge, motifs…). */
    swatch: text(),
    /** Référence de l'article dans GeStockPro, si la synchronisation est mise en place. */
    gestockproRef: text().unique(),
    stockSyncedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [index().on(t.productId)],
);

export const productImages = pgTable(
  "product_images",
  {
    id: id(),
    productId: integer()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    /** Photo propre à une variante (ex. cahier bleu) ; null = photo commune. */
    variantId: integer().references(() => productVariants.id, { onDelete: "set null" }),
    url: text().notNull(),
    alt: text(),
    position: integer().notNull().default(0), // 0 = photo principale
  },
  (t) => [index().on(t.productId)],
);

/** « Souvent achetés avec ». */
export const relatedProducts = pgTable(
  "related_products",
  {
    productId: integer()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    relatedId: integer()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    position: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.productId, t.relatedId] })],
);

/** Packs rentrée (Pack CP – CE2…). Le prix affiché est la somme des articles. */
export const packs = pgTable("packs", {
  id: id(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  level: schoolLevel().notNull(),
  description: text(),
  imageUrl: text(),
  visible: boolean().notNull().default(false),
  position: integer().notNull().default(0),
  ...timestamps,
});

export const packItems = pgTable(
  "pack_items",
  {
    packId: integer()
      .notNull()
      .references(() => packs.id, { onDelete: "cascade" }),
    variantId: integer()
      .notNull()
      .references(() => productVariants.id, { onDelete: "restrict" }),
    quantity: integer().notNull().default(1),
    position: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.packId, t.variantId] })],
);

/** « Me prévenir » quand une variante en rupture revient en stock. */
export const stockAlerts = pgTable(
  "stock_alerts",
  {
    id: id(),
    variantId: integer()
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    phone: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    notifiedAt: timestamp({ withTimezone: true }),
  },
  (t) => [uniqueIndex().on(t.variantId, t.phone)],
);

// ─── Clients et commandes ────────────────────────────────────────────────────

export const customers = pgTable("customers", {
  id: id(),
  name: text().notNull(),
  phone: text().notNull().unique(), // format E.164, ex. +221778032947
  ...timestamps,
});

export const deliveryZones = pgTable("delivery_zones", {
  id: id(),
  name: text().notNull(), // « Dakar centre », « Banlieue »
  fee: integer(), // null = tarif à compléter
  active: boolean().notNull().default(true),
  position: integer().notNull().default(0),
});

export const orderNumberSeq = pgSequence("order_number_seq", { startWith: 1 });

export const orders = pgTable(
  "orders",
  {
    id: id(),
    /** Numéro lisible, envoyé dans le message WhatsApp : TIMA-0124. */
    number: text()
      .notNull()
      .unique()
      .default(sql`'TIMA-' || lpad(nextval('order_number_seq')::text, 4, '0')`),
    customerId: integer().references(() => customers.id, { onDelete: "set null" }),
    // Coordonnées figées au moment de la commande
    customerName: text().notNull(),
    customerPhone: text().notNull(),
    status: orderStatus().notNull().default("nouvelle"),
    origin: orderOrigin().notNull().default("site"),
    fulfillment: fulfillmentMode().notNull(),
    deliveryZoneId: integer().references(() => deliveryZones.id, { onDelete: "set null" }),
    address: text(),
    /** null = au moins un article « Prix sur demande » : total confirmé sur WhatsApp. */
    subtotal: integer(),
    deliveryFee: integer().notNull().default(0),
    total: integer(),
    paymentMethod: paymentMethod().notNull(),
    paymentStatus: paymentStatus().notNull().default("a_confirmer"),
    paidAt: timestamp({ withTimezone: true }),
    internalNote: text(),
    /** Renseigné quand la commande livrée a été transmise à GeStockPro comme vente. */
    gestockproSyncedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [index().on(t.status), index().on(t.createdAt), index().on(t.customerPhone)],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: id(),
    orderId: integer()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    variantId: integer().references(() => productVariants.id, { onDelete: "set null" }),
    // Copie au moment de la commande : le catalogue peut changer ensuite
    sku: text().notNull(),
    label: text().notNull(),
    options: jsonb().$type<Record<string, string>>().notNull().default({}),
    unitPrice: integer(), // null = prix sur demande
    quantity: integer().notNull(),
    lineTotal: integer(),
  },
  (t) => [index().on(t.orderId)],
);

/** Historique : changements de statut, paiement confirmé, note… */
export const orderEvents = pgTable(
  "order_events",
  {
    id: id(),
    orderId: integer()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    type: text().notNull(), // "statut", "paiement", "note"
    fromValue: text(),
    toValue: text(),
    author: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.orderId)],
);

// ─── Listes de fournitures ───────────────────────────────────────────────────

export const supplyLists = pgTable(
  "supply_lists",
  {
    id: id(),
    customerId: integer().references(() => customers.id, { onDelete: "set null" }),
    customerName: text().notNull(),
    customerPhone: text().notNull(),
    level: schoolLevel().notNull(),
    rawText: text(), // liste collée
    fileUrl: text(), // photo ou PDF envoyé
    fulfillment: fulfillmentMode().notNull(),
    status: supplyListStatus().notNull().default("nouvelle"),
    /** Commande créée quand le pack est prêt. */
    orderId: integer().references(() => orders.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [index().on(t.status)],
);

/** Une ligne de la liste de l'école, associée (ou pas encore) à un article de la boutique. */
export const supplyListLines = pgTable(
  "supply_list_lines",
  {
    id: id(),
    supplyListId: integer()
      .notNull()
      .references(() => supplyLists.id, { onDelete: "cascade" }),
    label: text().notNull(), // « Cahiers 96 pages »
    variantId: integer().references(() => productVariants.id, { onDelete: "set null" }),
    quantity: integer().notNull().default(1),
    position: integer().notNull().default(0),
  },
  (t) => [index().on(t.supplyListId)],
);

// ─── Paramètres et synchronisation ───────────────────────────────────────────

/**
 * Paramètres de la boutique (clé → valeur JSON) :
 * shop.name, shop.phone, shop.address, shop.hours,
 * payment.wave / payment.orange_money / payment.cod (booléens),
 * whatsapp.orderTemplate.
 */
export const settings = pgTable("settings", {
  key: text().primaryKey(),
  value: jsonb().notNull(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/** Journal des synchronisations GeStockPro (« Voir le journal »). */
export const syncLogs = pgTable("sync_logs", {
  id: id(),
  status: syncStatus().notNull().default("en_cours"),
  startedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp({ withTimezone: true }),
  updatedVariants: integer().notNull().default(0),
  details: jsonb(),
});

// ─── Administration ──────────────────────────────────────────────────────────

/** Comptes de l'espace boutique. Créés uniquement en ligne de commande (`pnpm admin`), jamais par le site. */
export const adminUsers = pgTable("admin_users", {
  id: id(),
  email: text().notNull().unique(), // en minuscules
  name: text().notNull(),
  /** scrypt$N$r$p$sel$hash (base64) */
  passwordHash: text().notNull(),
  active: boolean().notNull().default(true),
  lastLoginAt: timestamp({ withTimezone: true }),
  ...timestamps,
});

/** Sessions : seul le SHA-256 du jeton est stocké, le jeton lui-même ne vit que dans le cookie. */
export const adminSessions = pgTable(
  "admin_sessions",
  {
    id: id(),
    tokenHash: text().notNull().unique(),
    userId: integer()
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ip: text(),
    userAgent: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.userId), index().on(t.expiresAt)],
);

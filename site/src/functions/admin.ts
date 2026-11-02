import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ORDER_STATUS, type OrderStatus } from "@/lib/admin-labels";
import * as admin from "@/server/admin";
import { getDummyHash, verifyPassword } from "@/server/auth/password";
import { clearFailures, isBlocked, recordFailure } from "@/server/auth/rate-limit";
import {
  clientIp,
  createSession,
  destroySession,
  getAdmin,
  isValidLoginKey,
  requireAdmin,
} from "@/server/auth/session";
import { db } from "@/server/db";
import { adminUsers } from "@/server/db/schema";

/**
 * Fonctions serveur de l'espace boutique. Règle : chacune appelle requireAdmin() avant tout,
 * sauf la connexion (clé secrète + mot de passe + limitation des tentatives).
 */

// ─── Connexion ───────────────────────────────────────────────────────────────

/** La page /acces/<clé> n'existe que si la clé est la bonne (sinon 404). */
export const checkLoginKey = createServerFn({ method: "GET" })
  .validator((d: unknown) => z.object({ key: z.string().max(200) }).parse(d))
  .handler(({ data }) => {
    if (!isValidLoginKey(data.key)) throw notFound();
    return true;
  });

const GENERIC_ERROR = "E-mail ou mot de passe incorrect.";

export const adminLogin = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        key: z.string().max(200),
        email: z.string().max(200),
        password: z.string().max(200),
        remember: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
    if (!isValidLoginKey(data.key)) throw notFound();
    const email = data.email.trim().toLowerCase();
    if (!email || !data.password) return { ok: false, error: GENERIC_ERROR };

    const keys: ["ip" | "email", string][] = [
      ["ip", clientIp()],
      ["email", email],
    ];
    if (isBlocked(keys))
      return { ok: false, error: "Trop de tentatives. Réessayez dans 15 minutes." };

    const [user] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
    // Même travail (scrypt) que l'e-mail existe ou non : la durée de réponse ne révèle rien
    const valid = await verifyPassword(data.password, user?.passwordHash ?? (await getDummyHash()));
    if (!user || !user.active || !valid) {
      recordFailure(keys);
      return { ok: false, error: GENERIC_ERROR };
    }
    clearFailures([["email", email]]);
    await db.update(adminUsers).set({ lastLoginAt: new Date() }).where(eq(adminUsers.id, user.id));
    await createSession(user.id, data.remember);
    return { ok: true };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  await destroySession();
  return true;
});

/** Session courante (nom affiché, compteur de commandes) ; 404 si aucune. */
export const getAdminShell = createServerFn({ method: "GET" }).handler(async () => {
  const user = await getAdmin();
  if (!user) throw notFound();
  return { name: user.name, email: user.email, pendingOrders: await admin.pendingCount() };
});

// ─── Tableau de bord et commandes ────────────────────────────────────────────

export const getDashboard = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  return admin.dashboard();
});

export const listOrders = createServerFn({ method: "GET" })
  .validator((d: unknown) =>
    z.object({ statut: z.string().max(30).optional(), q: z.string().max(80).optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    return admin.listOrders({ status: data.statut, q: data.q });
  });

export const getOrder = createServerFn({ method: "GET" })
  .validator((d: unknown) => z.object({ number: z.string().max(20) }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const order = await admin.orderDetail(data.number);
    if (!order) throw notFound();
    return order;
  });

const orderId = z.number().int().positive();
const status = z.enum(Object.keys(ORDER_STATUS) as [OrderStatus, ...OrderStatus[]]);

export const advanceOrder = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ orderId, from: status }).parse(d))
  .handler(async ({ data }) => {
    const user = await requireAdmin();
    await admin.advanceOrder(data.orderId, data.from, user.name);
    return true;
  });

export const cancelOrder = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ orderId }).parse(d))
  .handler(async ({ data }) => {
    const user = await requireAdmin();
    await admin.cancelOrder(data.orderId, user.name);
    return true;
  });

export const markOrderPaid = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ orderId }).parse(d))
  .handler(async ({ data }) => {
    const user = await requireAdmin();
    await admin.markPaid(data.orderId, user.name);
    return true;
  });

export const saveOrderNote = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ orderId, note: z.string().max(2000) }).parse(d))
  .handler(async ({ data }) => {
    const user = await requireAdmin();
    await admin.saveOrderNote(data.orderId, data.note.trim(), user.name);
    return true;
  });

// ─── Produits ────────────────────────────────────────────────────────────────

export const listProducts = createServerFn({ method: "GET" })
  .validator((d: unknown) =>
    z
      .object({
        q: z.string().max(80).optional(),
        univers: z.string().max(40).optional(),
        visibilite: z.string().max(10).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    return admin.listProducts({ q: data.q, universe: data.univers, visibility: data.visibilite });
  });

export const getProduct = createServerFn({ method: "GET" })
  .validator((d: unknown) => z.object({ id: z.number().int().positive() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const product = await admin.productDetail(data.id);
    if (!product) throw notFound();
    return product;
  });

export const setProductVisibility = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({ id: z.number().int().positive(), visible: z.boolean() }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    await admin.setVisibility(data.id, data.visible);
    return true;
  });

/** Montant ou quantité saisi : vide → null ; « 1 500 » → 1500. */
const amount = z.preprocess((v) => {
  const s = String(v ?? "").replace(/[\s\u00a0\u202f]/g, "");
  return s === "" ? null : Number(s);
}, z.number("Nombre entier attendu.").int("Nombre entier attendu.").min(0, "Pas de valeur négative.").max(100_000_000).nullable());
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((s) => s || null);

const productSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().trim().min(2, "Nom trop court.").max(150, "Nom trop long."),
  description: text(3000),
  brand: text(80),
  categoryId: z.number().int().positive().nullable(),
  optionsNote: text(200),
  visible: z.boolean(),
  featured: z.boolean(),
  giftIdea: z.boolean(),
  needsReview: z.boolean(),
  internalNote: text(2000),
  variants: z
    .array(
      z.object({
        id: z.number().int().positive(),
        price: z.unknown(),
        stock: z.unknown(),
        lowStockThreshold: z.unknown(),
        active: z.boolean(),
      }),
    )
    .max(50),
});

export const saveProduct = createServerFn({ method: "POST" })
  .validator((d: unknown) => d)
  .handler(
    async ({
      data,
    }): Promise<{ ok: boolean; error?: string; fieldErrors?: Record<string, string> }> => {
      await requireAdmin();
      const parsed = productSchema.safeParse(data);
      if (!parsed.success) {
        const fieldErrors: Record<string, string> = {};
        for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
        return { ok: false, error: "Vérifiez les champs signalés.", fieldErrors };
      }
      // Prix, stock et seuil : validés un par un pour signaler précisément le champ fautif
      const fieldErrors: Record<string, string> = {};
      const variants = parsed.data.variants.flatMap((v) => {
        const price = amount.safeParse(v.price);
        const stock = amount.safeParse(v.stock);
        const threshold = amount.safeParse(v.lowStockThreshold);
        if (!price.success) fieldErrors[`v-${v.id}-price`] = price.error.issues[0]!.message;
        if (!stock.success) fieldErrors[`v-${v.id}-stock`] = stock.error.issues[0]!.message;
        if (!threshold.success)
          fieldErrors[`v-${v.id}-threshold`] = threshold.error.issues[0]!.message;
        if (!price.success || !stock.success || !threshold.success) return [];
        return [
          {
            id: v.id,
            price: price.data,
            stock: stock.data ?? 0,
            lowStockThreshold: threshold.data ?? 3,
            active: v.active,
          },
        ];
      });
      if (Object.keys(fieldErrors).length)
        return { ok: false, error: "Vérifiez les champs signalés.", fieldErrors };
      const res = await admin.updateProduct({ ...parsed.data, variants });
      return res.error ? { ok: false, ...res } : { ok: true };
    },
  );

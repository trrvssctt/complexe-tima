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
import { isAllowedImageUrl, saveUpload } from "@/server/media";

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

// ─── Tableau de bord ─────────────────────────────────────────────────────────

const period = z.enum(Object.keys(admin.PERIODS) as [admin.Period, ...admin.Period[]]).catch("30j");

export const getStats = createServerFn({ method: "GET" })
  .validator((d: unknown) => z.object({ periode: period.optional() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    return admin.stats(data.periode ?? "30j");
  });

// ─── Commandes ───────────────────────────────────────────────────────────────

export const listOrders = createServerFn({ method: "GET" })
  .validator((d: unknown) =>
    z
      .object({
        statut: z.string().max(30).optional(),
        q: z.string().max(80).optional(),
        periode: z.string().max(10).optional(),
        paiement: z.string().max(15).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    return admin.listOrders({
      status: data.statut,
      q: data.q,
      periode: data.periode,
      paiement: data.paiement,
    });
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

/** Montant ou quantité saisi : vide → null ; « 1 500 » → 1500. */
const amount = z.preprocess((v) => {
  const s = String(v ?? "").replace(/[\s\u00a0\u202f]/g, "");
  return s === "" ? null : Number(s);
}, z.number("Nombre entier attendu.").int("Nombre entier attendu.").min(0, "Pas de valeur négative.").max(100_000_000, "Montant trop élevé.").nullable());

function firstErrors(issues: z.core.$ZodIssue[]) {
  const out: Record<string, string> = {};
  for (const i of issues) out[i.path.join(".")] ??= i.message;
  return out;
}

export const updateOrderPricing = createServerFn({ method: "POST" })
  .validator((d: unknown) => d)
  .handler(
    async ({
      data,
    }): Promise<{ ok: boolean; error?: string; fieldErrors?: Record<string, string> }> => {
      const user = await requireAdmin();
      const parsed = z
        .object({
          orderId,
          deliveryFee: amount,
          lines: z
            .array(z.object({ itemId: z.number().int().positive(), unitPrice: amount }))
            .max(100),
        })
        .safeParse(data);
      if (!parsed.success)
        return {
          ok: false,
          error: "Vérifiez les montants.",
          fieldErrors: firstErrors(parsed.error.issues),
        };
      const res = await admin.updateOrderPricing(
        parsed.data.orderId,
        parsed.data.lines,
        parsed.data.deliveryFee ?? 0,
        user.name,
      );
      return res.error ? { ok: false, error: res.error } : { ok: true };
    },
  );

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

export const getProductFormOptions = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  return admin.productFormOptions();
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

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${max} caractères maximum.`)
    .transform((s) => s || null);

const productSchema = z
  .object({
    id: z.number().int().positive().optional(),
    name: z.string().trim().min(2, "Nom trop court.").max(150, "Nom trop long."),
    description: text(3000),
    brand: text(80),
    universeSlug: z.string().max(40),
    categoryId: z.number().int().positive().nullable(),
    newCategory: text(60),
    optionName: z.string().trim().min(1).max(30).catch("Couleur"),
    optionsNote: text(200),
    visible: z.boolean(),
    featured: z.boolean(),
    giftIdea: z.boolean(),
    needsReview: z.boolean(),
    internalNote: text(2000),
    images: z
      .array(
        z
          .string()
          .trim()
          .refine(isAllowedImageUrl, "Adresse de photo invalide (https ou photo envoyée)."),
      )
      .max(10, "10 photos maximum."),
    variants: z
      .array(
        z.object({
          id: z.number().int().positive().optional(),
          label: z.string().trim().max(60, "Libellé trop long."),
          price: amount,
          purchasePrice: amount,
          stock: amount,
          lowStockThreshold: amount,
          active: z.boolean(),
        }),
      )
      .min(1, "Au moins un article.")
      .max(40),
  })
  .superRefine((p, ctx) => {
    const named = p.variants.length > 1;
    p.variants.forEach((v, i) => {
      if (named && !v.label)
        ctx.addIssue({
          code: "custom",
          path: ["variants", i, "label"],
          message: "Nom de la variante requis.",
        });
    });
    const labels = p.variants.map((v) => v.label.toLowerCase()).filter(Boolean);
    if (new Set(labels).size !== labels.length)
      ctx.addIssue({
        code: "custom",
        path: ["variants"],
        message: "Deux variantes portent le même nom.",
      });
  });

type SaveResult = {
  ok: boolean;
  id?: number;
  error?: string;
  fieldErrors?: Record<string, string>;
};

/** Création (sans id) ou modification (avec id) d'un produit, de ses variantes et de ses photos. */
export const saveProduct = createServerFn({ method: "POST" })
  .validator((d: unknown) => d)
  .handler(async ({ data }): Promise<SaveResult> => {
    const user = await requireAdmin();
    const parsed = productSchema.safeParse(data);
    if (!parsed.success)
      return {
        ok: false,
        error: "Vérifiez les champs signalés.",
        fieldErrors: firstErrors(parsed.error.issues),
      };
    const { id, ...p } = parsed.data;
    const input = {
      ...p,
      variants: p.variants.map((v) => ({
        id: v.id,
        label: v.label,
        price: v.price,
        purchasePrice: v.purchasePrice,
        stock: v.stock ?? 0,
        lowStockThreshold: v.lowStockThreshold ?? 3,
        active: v.active,
      })),
    };
    const res: { id?: number; error?: string } = id
      ? await admin.updateProduct(id, input)
      : await admin.createProduct(input, user.name);
    if (res.error) return { ok: false, error: res.error };
    const savedId = res.id ?? id;
    return savedId ? { ok: true, id: savedId } : { ok: true };
  });

/** Envoi d'une photo (JPEG, PNG, WebP, AVIF ; 5 Mo max). Renvoie son adresse /medias/… */
export const uploadProductImage = createServerFn({ method: "POST" })
  .validator((d: unknown) => {
    if (!(d instanceof FormData)) throw new Error("Formulaire attendu.");
    return d;
  })
  .handler(async ({ data }): Promise<{ url?: string; error?: string }> => {
    await requireAdmin();
    const file = data.get("file");
    if (!(file instanceof File)) return { error: "Aucun fichier reçu." };
    return saveUpload(file);
  });

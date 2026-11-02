import "@tanstack/react-start/server-only";
import { getRequestHeader } from "@tanstack/react-start/server";
import { inArray } from "drizzle-orm";
import { z } from "zod";
import { createCatalogue } from "@/data/catalogue";
import { buildOrderMessage, whatsappUrl } from "@/lib/shop";
import { loadCatalogue } from "./catalogue";
import { db } from "./db";
import { customers, orderEvents, orderItems, orders, productVariants } from "./db/schema";

/** « 77 803 29 47 », « +221778032947 », « 00221 77… » → « +221778032947 ». null si invalide. */
export function normalizeSenegalPhone(input: string): string | null {
  let d = input.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 9) d = `221${d}`;
  return /^221[37]\d{8}$/.test(d) ? `+${d}` : null;
}

export const checkoutSchema = z
  .object({
    name: z.string().trim().min(2, "Indiquez votre nom.").max(80, "Nom trop long."),
    phone: z.string().transform((value, ctx) => {
      const phone = normalizeSenegalPhone(value);
      if (!phone) {
        ctx.addIssue({
          code: "custom",
          message: "Numéro sénégalais à 9 chiffres, ex. 77 123 45 67.",
        });
        return z.NEVER;
      }
      return phone;
    }),
    delivery: z.enum(["livraison", "retrait"], "Choisissez livraison ou retrait."),
    address: z.string().trim().max(200, "Adresse trop longue.").optional(),
    payment: z.enum(["wave", "orange-money", "livraison"], "Choisissez un moyen de paiement."),
    note: z.string().trim().max(500, "Note trop longue.").optional(),
    lines: z
      .array(z.object({ sku: z.string().max(60), qty: z.number().int().min(1).max(99) }))
      .min(1, "Votre panier est vide.")
      .max(50),
    /** Champ piège invisible : rempli uniquement par les robots. */
    website: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.delivery === "livraison" && (!v.address || v.address.length < 3))
      ctx.addIssue({
        code: "custom",
        path: ["address"],
        message: "Indiquez l’adresse ou le quartier.",
      });
  });

export type PlaceOrderResult =
  | { ok: true; number: string; total: number | null; message: string; whatsappUrl: string }
  | { ok: false; fieldErrors?: Record<string, string>; formError?: string; removedSkus?: string[] };

const PAYMENT = {
  wave: "wave",
  "orange-money": "orange_money",
  livraison: "a_la_livraison",
} as const;

// Limite anti-abus : 10 commandes par IP sur 10 minutes (mémoire du processus)
const WINDOW_MS = 10 * 60 * 1000;
const recent = new Map<string, number[]>();
function tooMany(ip: string) {
  const now = Date.now();
  const list = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.size > 10_000) recent.clear();
  if (list.length >= 10) return true;
  recent.set(ip, [...list, now]);
  return false;
}

export async function placeOrder(input: unknown): Promise<PlaceOrderResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues)
      fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
    return {
      ok: false,
      fieldErrors,
      formError: fieldErrors["lines"] ?? "Vérifiez les champs signalés.",
    };
  }
  const data = parsed.data;
  if (data.website) return { ok: false, formError: "Commande refusée." };
  const ip = getRequestHeader("x-real-ip") ?? "inconnue";
  if (tooMany(ip))
    return {
      ok: false,
      formError:
        "Trop de commandes en peu de temps. Réessayez dans quelques minutes ou écrivez-nous sur WhatsApp.",
    };

  // Le catalogue en base fait foi (visibilité, prix) : jamais les données envoyées par le navigateur
  const catalogue = createCatalogue(await loadCatalogue());
  const lines = mergeLines(data.lines);
  const removedSkus = lines.filter((l) => !catalogue.findBySku(l.sku)).map((l) => l.sku);
  if (removedSkus.length) {
    return {
      ok: false,
      removedSkus,
      formError:
        "Certains articles ne sont plus disponibles et ont été retirés du panier. Vérifiez puis validez à nouveau.",
    };
  }

  const variants = await db
    .select({
      id: productVariants.id,
      sku: productVariants.sku,
      options: productVariants.options,
      purchasePrice: productVariants.purchasePrice,
    })
    .from(productVariants)
    .where(
      inArray(
        productVariants.sku,
        lines.map((l) => l.sku),
      ),
    );
  const variantBySku = new Map(variants.map((v) => [v.sku, v]));

  const items = lines.map((l) => {
    const { product } = catalogue.findBySku(l.sku)!;
    const unitPrice = catalogue.unitPrice(l.sku) ?? null;
    const v = variantBySku.get(l.sku);
    return {
      variantId: v?.id ?? null,
      sku: l.sku,
      label: product.name,
      options: v?.options ?? {},
      unitPrice,
      unitCost: v?.purchasePrice ?? null, // prix d'achat figé au moment de la commande
      quantity: l.qty,
      lineTotal: unitPrice === null ? null : unitPrice * l.qty,
    };
  });
  const subtotal = items.every((i) => i.lineTotal !== null)
    ? items.reduce((s, i) => s + i.lineTotal!, 0)
    : null;

  const order = await db.transaction(async (tx) => {
    const [customer] = await tx
      .insert(customers)
      .values({ name: data.name, phone: data.phone })
      .onConflictDoUpdate({ target: customers.phone, set: { name: data.name } })
      .returning({ id: customers.id });
    const [created] = await tx
      .insert(orders)
      .values({
        customerId: customer!.id,
        customerName: data.name,
        customerPhone: data.phone,
        origin: "site",
        fulfillment: data.delivery,
        address: data.delivery === "livraison" ? (data.address ?? null) : null,
        subtotal,
        deliveryFee: 0, // tarif confirmé par la boutique selon la zone
        total: subtotal,
        paymentMethod: PAYMENT[data.payment],
        internalNote: data.note ? `Note du client : ${data.note}` : null,
      })
      .returning({ id: orders.id, number: orders.number });
    await tx.insert(orderItems).values(items.map((i) => ({ ...i, orderId: created!.id })));
    await tx
      .insert(orderEvents)
      .values({ orderId: created!.id, type: "statut", toValue: "nouvelle", author: "site" });
    return created!;
  });

  const message = buildOrderMessage(catalogue, lines, {
    name: data.name,
    phone: data.phone,
    delivery: data.delivery,
    ...(data.address ? { address: data.address } : {}),
    payment: data.payment,
    ...(data.note ? { note: data.note } : {}),
    number: order.number,
  });
  return {
    ok: true,
    number: order.number,
    total: subtotal,
    message,
    whatsappUrl: whatsappUrl(message),
  };
}

/** Regroupe les lignes d'un même SKU. */
function mergeLines(lines: { sku: string; qty: number }[]) {
  const map = new Map<string, number>();
  for (const l of lines) map.set(l.sku, Math.min(99, (map.get(l.sku) ?? 0) + l.qty));
  return [...map].map(([sku, qty]) => ({ sku, qty }));
}

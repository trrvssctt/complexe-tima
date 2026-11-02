import type { Catalogue, Product } from "@/data/catalogue";

export const SHOP = {
  name: "Complexe Tima",
  owner: "Fatou Barry DIOP",
  phoneDisplay: "+221 77 803 29 47",
  phoneE164: "221778032947",
  city: "Dakar",
};

export interface CartLine {
  sku: string;
  qty: number;
}

export function formatPrice(price?: number) {
  if (price == null) return "Prix sur demande";
  return `${new Intl.NumberFormat("fr-FR").format(price).replace(/\u202f|\u00a0/g, " ")} F CFA`;
}

export function lineLabel(cat: Catalogue, sku: string) {
  const found = cat.findBySku(sku);
  if (!found) return sku;
  return found.variant ? `${found.product.name} (${found.variant.label})` : found.product.name;
}

/** Total connu uniquement si tous les articles ont un prix. */
export function cartTotal(cat: Catalogue, lines: CartLine[]): number | undefined {
  let total = 0;
  for (const line of lines) {
    const price = cat.unitPrice(line.sku);
    if (price == null) return undefined;
    total += price * line.qty;
  }
  return total;
}

export function whatsappUrl(message: string) {
  return `https://wa.me/${SHOP.phoneE164}?text=${encodeURIComponent(message)}`;
}

export interface OrderDetails {
  name?: string;
  phone?: string;
  delivery?: "livraison" | "retrait";
  address?: string;
  payment?: "wave" | "orange-money" | "livraison";
  note?: string;
  /** Numéro attribué par la boutique (TIMA-0001), ajouté une fois la commande enregistrée. */
  number?: string;
}

const PAYMENT_LABEL: Record<NonNullable<OrderDetails["payment"]>, string> = {
  wave: "Wave",
  "orange-money": "Orange Money",
  livraison: "À la livraison",
};

export function buildOrderMessage(cat: Catalogue, lines: CartLine[], details: OrderDetails = {}) {
  const rows = lines.map((l) => {
    const price = cat.unitPrice(l.sku);
    const p = price != null ? ` — ${formatPrice(price * l.qty)}` : "";
    return `• ${l.qty} × ${lineLabel(cat, l.sku)}${p}`;
  });
  const total = cartTotal(cat, lines);
  const parts = [
    details.number
      ? `Bonjour ${SHOP.name}, je souhaite commander (commande ${details.number}) :`
      : `Bonjour ${SHOP.name}, je souhaite commander :`,
    ...rows,
    total != null
      ? `Total : ${formatPrice(total)}`
      : "Merci de me confirmer les prix et la disponibilité.",
  ];
  if (details.delivery) {
    parts.push(
      details.delivery === "livraison"
        ? `Livraison : ${details.address?.trim() || "adresse à préciser"}`
        : "Retrait en boutique",
    );
  }
  if (details.payment) parts.push(`Paiement : ${PAYMENT_LABEL[details.payment]}`);
  if (details.name?.trim()) parts.push(`Nom : ${details.name.trim()}`);
  if (details.phone?.trim()) parts.push(`Téléphone : ${details.phone.trim()}`);
  if (details.note?.trim()) parts.push(`Note : ${details.note.trim()}`);
  return parts.join("\n");
}

export function productQuestionMessage(product: Product, variantLabel?: string, qty = 1) {
  const name = variantLabel ? `${product.name} (${variantLabel})` : product.name;
  return `Bonjour ${SHOP.name}, je souhaite commander : ${qty} × ${name}. Pouvez-vous me confirmer le prix et la disponibilité ?`;
}

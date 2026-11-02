import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SEED_PRODUCTS as PRODUCTS, createCatalogue } from "@/data/catalogue";

import { buildOrderMessage, cartTotal, formatPrice, SHOP } from "@/lib/shop";

const catalogue = createCatalogue(PRODUCTS);
const { allSkus, findBySku } = catalogue;

const csv = readFileSync(path.resolve(__dirname, "../data/catalogue_complexe_tima.csv"), "utf-8");
const rows = csv
  .trim()
  .split(/\r?\n/)
  .slice(1)
  .map((l) => l.split(";"));
const csvSkus = rows.map((r) => r[0] ?? "");
const csvParents = Array.from(new Set(rows.map((r) => r[1] ?? "")));

describe("Catalogue de la cliente", () => {
  it("contient chaque SKU du fichier catalogue_complexe_tima.csv (76 références)", () => {
    expect(csvSkus).toHaveLength(76);
    const missing = csvSkus.filter((sku) => !findBySku(sku));
    expect(missing).toEqual([]);
  });

  it("a un produit par SKU parent (63 produits) et aucun SKU inventé", () => {
    expect(PRODUCTS.map((p) => p.id).sort()).toEqual([...csvParents].sort());
    expect(allSkus().sort()).toEqual([...csvSkus].sort());
  });

  it("a une photo pour chaque produit", () => {
    const files = import.meta.glob("../assets/products/*.jpg");
    const ids = Object.keys(files).map((f) =>
      f.split("/").pop()!.replace(".jpg", "").toUpperCase(),
    );
    const withoutPhoto = PRODUCTS.filter((p) => !ids.includes(p.id)).map((p) => p.id);
    expect(withoutPhoto).toEqual([]);
  });
});

describe("Commande WhatsApp", () => {
  it("affiche « Prix sur demande » tant que la boutique n'a pas donné de prix", () => {
    expect(formatPrice(undefined)).toBe("Prix sur demande");
    expect(cartTotal(catalogue, [{ sku: "CT-SCO-005", qty: 2 }])).toBeUndefined();
  });

  it("envoie la commande au numéro de la boutique +221 77 803 29 47 avec le coloris choisi", () => {
    expect(SHOP.phoneE164).toBe("221778032947");
    const msg = buildOrderMessage(catalogue, [{ sku: "CT-SCO-001-BLEU", qty: 3 }], {
      delivery: "retrait",
      payment: "wave",
    });
    expect(msg).toContain("3 × Cahier Travaux Pratiques grand format (Bleu)");
    expect(msg).toContain("Retrait en boutique");
    expect(msg).toContain("Paiement : Wave");
  });
});

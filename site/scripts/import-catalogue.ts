/**
 * Importe le fichier « catalogue_complexe_tima_a_remplir.xlsx » rempli par la boutique :
 * met à jour prix de vente, prix d'achat HT, stock et seuil d'alerte de chaque variante (par SKU).
 * Une case vide ne modifie rien. Les SKU inconnus sont signalés.
 *
 *   pnpm catalogue:import [chemin/vers/fichier.xlsx] [--dry-run]
 */
import "dotenv/config";
import { resolve } from "node:path";
import ExcelJS from "exceljs";
import { eq } from "drizzle-orm";
import { db } from "../src/server/db";
import { productVariants } from "../src/server/db/schema";

const COLUMNS = {
  sku: "SKU",
  purchasePrice: "Prix achat HT (F CFA)",
  price: "Prix vente (F CFA)",
  stock: "Stock compté",
  lowStockThreshold: "Seuil alerte",
} as const;

function toInt(v: ExcelJS.CellValue): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "object" && "result" in v) v = v.result as ExcelJS.CellValue; // formule
  const n =
    typeof v === "number"
      ? v
      : Number(
          String(v)
            .replace(/[\s\u202f]/g, "")
            .replace(",", "."),
        );
  if (!Number.isFinite(n) || n < 0) throw new Error(`valeur invalide « ${String(v)} »`);
  return Math.round(n);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const path = resolve(
    args.find((a) => !a.startsWith("--")) ?? "../catalogue_complexe_tima_a_remplir.xlsx",
  );

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  const ws = wb.getWorksheet("Catalogue");
  if (!ws) throw new Error("Onglet « Catalogue » introuvable");

  const header = (ws.getRow(1).values as ExcelJS.CellValue[]).map((v) => String(v ?? "").trim());
  const col = Object.fromEntries(
    Object.entries(COLUMNS).map(([k, label]) => {
      const i = header.indexOf(label);
      if (i < 0) throw new Error(`Colonne « ${label} » introuvable`);
      return [k, i];
    }),
  ) as Record<keyof typeof COLUMNS, number>;

  let updated = 0;
  const unknown: string[] = [];
  const errors: string[] = [];

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const sku = String(row.getCell(col.sku).value ?? "").trim();
    if (!sku) continue;
    try {
      const [current] = await db.select().from(productVariants).where(eq(productVariants.sku, sku));
      if (!current) {
        unknown.push(sku);
        continue;
      }
      const patch: Partial<typeof productVariants.$inferInsert> = {};
      for (const k of ["price", "purchasePrice", "stock", "lowStockThreshold"] as const) {
        const n = toInt(row.getCell(col[k]).value);
        if (n !== null && n !== current[k]) patch[k] = n;
      }
      if (Object.keys(patch).length === 0) continue;
      if (dryRun) console.log(`  ${sku} :`, patch);
      else await db.update(productVariants).set(patch).where(eq(productVariants.id, current.id));
      updated++;
    } catch (e) {
      errors.push(`ligne ${r} (${sku}) : ${(e as Error).message}`);
    }
  }

  console.log(`${dryRun ? "[simulation] " : ""}${updated} variantes modifiées depuis ${path}`);
  if (unknown.length) console.warn(`SKU inconnus (${unknown.length}) : ${unknown.join(", ")}`);
  if (errors.length) console.warn(`Erreurs (${errors.length}) :\n  ${errors.join("\n  ")}`);
  process.exit(errors.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

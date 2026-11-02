const modules = import.meta.glob("../assets/products/*.jpg", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const byId: Record<string, string> = {};
for (const [path, url] of Object.entries(modules)) {
  const file = path
    .split("/")
    .pop()!
    .replace(/\.jpg$/, "");
  byId[file.toUpperCase()] = url;
}

/** Image d'un produit à partir de son SKU parent (ex. CT-SCO-001). */
export function productImage(id: string): string | undefined {
  return byId[id.toUpperCase()];
}

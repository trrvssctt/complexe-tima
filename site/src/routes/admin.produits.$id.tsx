import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { ProductEditor } from "@/components/admin/ProductEditor";
import { getProduct } from "@/functions/admin";
import { productImage } from "@/lib/product-images";

export const Route = createFileRoute("/admin/produits/$id")({
  loader: ({ params }) => getProduct({ data: { id: Number(params.id) } }),
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.name ?? "Produit"} — Espace boutique` }],
  }),
  component: EditProduct,
});

const str = (n: number | null) => (n === null ? "" : String(n));

function EditProduct() {
  const p = Route.useLoaderData();
  const router = useRouter();
  return (
    <>
      <Link to="/admin/produits" className="text-sm text-muted-foreground underline">
        ← Produits et stock
      </Link>
      <div>
        <h1 className="text-3xl font-bold lg:text-4xl">{p.name}</h1>
        <p className="text-muted-foreground">
          {p.universeName} · {p.sku}
        </p>
      </div>
      <ProductEditor
        // Nouvelle clé après chaque enregistrement : le formulaire repart des données à jour
        key={JSON.stringify(p)}
        universes={[{ slug: p.universeSlug, name: p.universeName, categories: p.categories }]}
        initial={{
          id: p.id,
          sku: p.sku,
          slug: p.slug,
          name: p.name,
          description: p.description ?? "",
          brand: p.brand ?? "",
          universeSlug: p.universeSlug,
          categoryId: p.categoryId,
          optionName: p.optionName,
          optionsNote: p.optionsNote ?? "",
          visible: p.visible,
          featured: p.featured,
          giftIdea: p.giftIdea,
          needsReview: p.needsReview,
          internalNote: p.internalNote ?? "",
          images: p.images,
          fallbackImage: productImage(p.sku),
          variants: p.variants.map((v) => ({
            id: v.id,
            key: `v${v.id}`,
            sku: v.sku,
            label: v.label,
            price: str(v.price),
            purchasePrice: str(v.purchasePrice),
            stock: String(v.stock),
            lowStockThreshold: String(v.lowStockThreshold),
            active: v.active,
          })),
        }}
        onSaved={async () => {
          toast.success("Produit enregistré");
          await router.invalidate();
        }}
      />
    </>
  );
}

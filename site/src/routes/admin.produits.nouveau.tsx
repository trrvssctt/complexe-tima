import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ProductEditor, newVariant } from "@/components/admin/ProductEditor";
import { PageHeader } from "@/components/admin/ui";
import { getProductFormOptions } from "@/functions/admin";

export const Route = createFileRoute("/admin/produits/nouveau")({
  loader: () => getProductFormOptions(),
  head: () => ({ meta: [{ title: "Nouveau produit — Espace boutique" }] }),
  component: NewProduct,
});

function NewProduct() {
  const universes = Route.useLoaderData();
  const navigate = useNavigate();
  return (
    <>
      <Link to="/admin/produits" className="text-sm text-muted-foreground underline">
        ← Produits et stock
      </Link>
      <PageHeader
        title="Nouveau produit"
        subtitle="Il apparaît sur le site dès l’enregistrement s’il est visible."
      />
      <ProductEditor
        universes={universes}
        initial={{
          name: "",
          description: "",
          brand: "",
          universeSlug: universes[0]?.slug ?? "fournitures",
          categoryId: null,
          optionName: "Couleur",
          optionsNote: "",
          visible: true,
          featured: false,
          giftIdea: false,
          needsReview: false,
          internalNote: "",
          images: [],
          variants: [newVariant()],
        }}
        onSaved={async (id) => {
          toast.success("Produit créé");
          await navigate({ to: "/admin/produits/$id", params: { id: String(id) } });
        }}
      />
    </>
  );
}

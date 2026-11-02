import { createServerFn } from "@tanstack/react-start";
import { loadCatalogue } from "@/server/catalogue";

/** Produits visibles, lus en base (prix, descriptions, variantes). */
export const getCatalogue = createServerFn({ method: "GET" }).handler(() => loadCatalogue());

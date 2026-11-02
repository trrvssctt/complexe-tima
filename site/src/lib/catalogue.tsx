import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createCatalogue, type Catalogue, type Product } from "@/data/catalogue";
import { getCatalogue } from "@/functions/catalogue";

/**
 * Côté navigateur, le catalogue reçu avec la première page est gardé 60 s :
 * les navigations suivantes ne rappellent pas le serveur à chaque clic.
 */
const CLIENT_TTL_MS = 60_000;
let clientCache: { at: number; data: Promise<Product[]> } | null = null;

export function fetchCatalogue(): Promise<Product[]> {
  if (typeof window === "undefined") return getCatalogue();
  if (!clientCache || Date.now() - clientCache.at > CLIENT_TTL_MS) {
    const data = getCatalogue();
    clientCache = { at: Date.now(), data };
    data.catch(() => (clientCache = null));
  }
  return clientCache.data;
}

/** Catalogue + fonctions de recherche, pour les loaders des routes. */
export async function loadCatalogue(): Promise<Catalogue> {
  return createCatalogue(await fetchCatalogue());
}

const CatalogueContext = createContext<Catalogue | null>(null);

export function CatalogueProvider({
  products,
  children,
}: {
  products: Product[];
  children: ReactNode;
}) {
  const value = useMemo(() => {
    if (typeof window !== "undefined" && !clientCache)
      clientCache = { at: Date.now(), data: Promise.resolve(products) };
    return createCatalogue(products);
  }, [products]);
  return <CatalogueContext.Provider value={value}>{children}</CatalogueContext.Provider>;
}

export function useCatalogue(): Catalogue {
  const ctx = useContext(CatalogueContext);
  if (!ctx) throw new Error("useCatalogue doit être utilisé dans CatalogueProvider");
  return ctx;
}

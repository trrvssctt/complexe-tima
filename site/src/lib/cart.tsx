import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { useCatalogue } from "./catalogue";
import type { CartLine } from "./shop";
import { lineLabel } from "./shop";

interface CartContextValue {
  lines: CartLine[];
  count: number;
  add: (sku: string, qty?: number) => void;
  setQty: (sku: string, qty: number) => void;
  remove: (sku: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "complexe-tima-panier";

export function CartProvider({ children }: { children: ReactNode }) {
  const catalogue = useCatalogue();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines, ready]);

  const add = useCallback(
    (sku: string, qty = 1) => {
      setLines((prev) => {
        const existing = prev.find((l) => l.sku === sku);
        if (existing) return prev.map((l) => (l.sku === sku ? { ...l, qty: l.qty + qty } : l));
        return [...prev, { sku, qty }];
      });
      toast.success("Ajouté au panier", { description: `${qty} × ${lineLabel(catalogue, sku)}` });
    },
    [catalogue],
  );

  const setQty = useCallback((sku: string, qty: number) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.sku !== sku)
        : prev.map((l) => (l.sku === sku ? { ...l, qty } : l)),
    );
  }, []);

  const remove = useCallback(
    (sku: string) => setLines((prev) => prev.filter((l) => l.sku !== sku)),
    [],
  );
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(
    () => ({ lines, count: lines.reduce((n, l) => n + l.qty, 0), add, setQty, remove, clear }),
    [lines, add, setQty, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

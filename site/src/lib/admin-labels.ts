export const ORDER_STATUS = {
  nouvelle: "Nouvelle",
  en_preparation: "En préparation",
  prete: "Prête",
  livree: "Livrée",
  annulee: "Annulée",
} as const;
export type OrderStatus = keyof typeof ORDER_STATUS;

/** Étape suivante du parcours normal, et libellé du bouton qui y mène. */
export const NEXT_STATUS: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  nouvelle: { to: "en_preparation", label: "Passer en préparation" },
  en_preparation: { to: "prete", label: "Marquer comme prête" },
  prete: { to: "livree", label: "Marquer comme livrée" },
};

export const STEPS: OrderStatus[] = ["nouvelle", "en_preparation", "prete", "livree"];

export const STATUS_STYLE: Record<OrderStatus, string> = {
  nouvelle: "bg-[#dce8fa] text-[#17407f]",
  en_preparation: "bg-[#fbe6c8] text-[#6e3700]",
  prete: "bg-[#ece2f6] text-[#4b2a73]",
  livree: "bg-whatsapp-soft text-whatsapp",
  annulee: "bg-sand text-muted-foreground",
};

export const PAYMENT_METHOD = {
  wave: "Wave",
  orange_money: "Orange Money",
  a_la_livraison: "À la livraison",
} as const;
export const PAYMENT_STATUS = {
  a_confirmer: "À confirmer",
  paye: "Payé",
  rembourse: "Remboursé",
} as const;
export const FULFILLMENT = { livraison: "Livraison", retrait: "Retrait" } as const;
export const ORIGIN = {
  site: "Site",
  whatsapp: "WhatsApp",
  liste_fournitures: "Liste",
  boutique: "Boutique",
} as const;

const dakar = { timeZone: "Africa/Dakar" } as const;
export const formatDateTime = (d: Date) =>
  new Intl.DateTimeFormat("fr-FR", { ...dakar, dateStyle: "medium", timeStyle: "short" }).format(d);
export const formatTime = (d: Date) =>
  new Intl.DateTimeFormat("fr-FR", { ...dakar, timeStyle: "short" }).format(d);
export const formatDay = (d: Date) =>
  new Intl.DateTimeFormat("fr-FR", {
    ...dakar,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);

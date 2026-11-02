import { createServerFn } from "@tanstack/react-start";
import { placeOrder } from "@/server/orders";

/** Enregistre la commande (numéro TIMA-xxxx) et renvoie le message WhatsApp à envoyer. */
export const submitOrder = createServerFn({ method: "POST" })
  .validator((input: unknown) => input)
  .handler(async ({ data }) => {
    try {
      return await placeOrder(data);
    } catch (e) {
      console.error("placeOrder", e);
      return {
        ok: false as const,
        formError:
          "La commande n’a pas pu être enregistrée. Réessayez, ou écrivez-nous sur WhatsApp.",
      };
    }
  });

import { createFileRoute } from "@tanstack/react-router";

/** Photos envoyées depuis l'espace boutique (voir src/server/media.ts). */
export const Route = createFileRoute("/medias/$fichier")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { readMedia } = await import("@/server/media");
        const media = await readMedia(params.fichier);
        if (!media) return new Response("Introuvable", { status: 404 });
        return new Response(media.body as BodyInit, {
          headers: {
            "content-type": media.type,
            "cache-control": "public, max-age=31536000, immutable", // nom de fichier unique
            "x-content-type-options": "nosniff",
          },
        });
      },
    },
  },
});

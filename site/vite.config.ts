import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  server: { port: 3000 },
  resolve: {
    // Une seule copie de React et du routeur, même si une dépendance en embarque une autre
    dedupe: ["react", "react-dom", "@tanstack/react-router", "@tanstack/react-start"],
  },
  optimizeDeps: {
    include: ["lucide-react", "sonner", "zod", "clsx", "tailwind-merge"],
  },
  plugins: [
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    // src/server.ts : point d'entrée serveur (page d'erreur 500 lisible)
    tanstackStart({ server: { entry: "server" } }),
    // Serveur Node autonome : node .output/server/index.mjs (PORT / HOST)
    nitro({ preset: "node-server" }),
    viteReact(),
  ],
});

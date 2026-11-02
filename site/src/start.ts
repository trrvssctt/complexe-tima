import { createCsrfMiddleware, createMiddleware, createStart } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

/**
 * Sécurité, sur toutes les requêtes :
 * - en-têtes de sécurité (HSTS, anti-iframe, nosniff…) ;
 * - /admin sans cookie de session correctement signé → 404, sans même interroger la base.
 *   (Première barrière seulement : chaque fonction serveur de l'admin revérifie la session.)
 */
const securityMiddleware = createMiddleware().server(async ({ request, pathname, next }) => {
  const { setResponseHeaders } = await import("@tanstack/react-start/server");
  const backOffice =
    pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/acces/");

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const { readSignedToken, SESSION_COOKIE_NAMES } = await import("./server/auth/session");
    const cookies = parseCookies(request.headers.get("cookie"));
    const signed = SESSION_COOKIE_NAMES.some((name) => readSignedToken(cookies[name]) !== null);
    if (!signed) {
      return new Response("Page introuvable", {
        status: 404,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "x-robots-tag": "noindex, nofollow",
          "cache-control": "no-store",
        },
      });
    }
  }

  setResponseHeaders(
    new Headers({
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "referrer-policy": "strict-origin-when-cross-origin",
      "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=()",
      ...(process.env["NODE_ENV"] === "production"
        ? { "strict-transport-security": "max-age=31536000" }
        : {}),
      ...(backOffice ? { "x-robots-tag": "noindex, nofollow", "cache-control": "no-store" } : {}),
    }),
  );
  return next();
});

function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of header?.split(";") ?? []) {
    const i = part.indexOf("=");
    if (i <= 0) continue;
    try {
      out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
    } catch {
      /* cookie malformé : ignoré */
    }
  }
  return out;
}

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware, securityMiddleware, csrfMiddleware],
}));

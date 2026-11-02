import "@tanstack/react-start/server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getCookie, getRequestHeader, setCookie } from "@tanstack/react-start/server";
import { notFound } from "@tanstack/react-router";
import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "../db";
import { adminSessions, adminUsers } from "../db/schema";

const PROD = process.env["NODE_ENV"] === "production";
/** `__Host-` impose Secure, Path=/ et aucun Domain : le cookie ne peut pas être posé par un sous-domaine. */
export const SESSION_COOKIE = PROD ? "__Host-tima_session" : "tima_session";
export const SESSION_COOKIE_NAMES = ["__Host-tima_session", "tima_session"];
const SHORT_SESSION_MS = 12 * 60 * 60 * 1000;
const LONG_SESSION_MS = 7 * 24 * 60 * 60 * 1000;

export type AdminUser = { id: number; email: string; name: string };

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/**
 * Le cookie vaut « jeton.signature » (HMAC-SHA256 avec SESSION_SECRET) : le middleware peut rejeter
 * un cookie forgé sans interroger la base. La session est ensuite vérifiée en base.
 */
function secret(): string {
  const s = process.env["SESSION_SECRET"] ?? "";
  if (s.length < 32)
    throw new Error("SESSION_SECRET manquant ou trop court (32 caractères minimum).");
  return s;
}
const sign = (token: string) => createHmac("sha256", secret()).update(token).digest("base64url");

/** Jeton contenu dans un cookie correctement signé, ou null. */
export function readSignedToken(cookieValue: string | undefined): string | null {
  if (!cookieValue || cookieValue.length > 200) return null;
  const [token, signature] = cookieValue.split(".");
  if (!token || !signature) return null;
  const expected = Buffer.from(sign(token));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given) ? token : null;
}

/** Adresse du client : nginx renseigne X-Real-IP (X-Forwarded-For peut être falsifié). */
export function clientIp(): string {
  return getRequestHeader("x-real-ip") ?? "inconnue";
}

const cookieOptions = { httpOnly: true, secure: PROD, sameSite: "strict" as const, path: "/" };

export async function createSession(userId: number, remember: boolean) {
  const token = randomBytes(32).toString("base64url");
  const ttl = remember ? LONG_SESSION_MS : SHORT_SESSION_MS;
  await db.insert(adminSessions).values({
    tokenHash: hashToken(token),
    userId,
    expiresAt: new Date(Date.now() + ttl),
    ip: clientIp(),
    userAgent: getRequestHeader("user-agent")?.slice(0, 300) ?? null,
  });
  await db.delete(adminSessions).where(lt(adminSessions.expiresAt, new Date())); // ménage
  setCookie(SESSION_COOKIE, `${token}.${sign(token)}`, {
    ...cookieOptions,
    ...(remember ? { maxAge: ttl / 1000 } : {}),
  });
}

export async function destroySession() {
  const token = readSignedToken(getCookie(SESSION_COOKIE));
  if (token) await db.delete(adminSessions).where(eq(adminSessions.tokenHash, hashToken(token)));
  // Un cookie __Host- ne s'efface qu'avec les mêmes attributs (Secure, Path=/)
  setCookie(SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 });
}

/** Utilisateur connecté, ou null. */
export async function getAdmin(): Promise<AdminUser | null> {
  const token = readSignedToken(getCookie(SESSION_COOKIE));
  if (!token) return null;
  const [row] = await db
    .select({ id: adminUsers.id, email: adminUsers.email, name: adminUsers.name })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminUsers.id, adminSessions.userId))
    .where(
      and(
        eq(adminSessions.tokenHash, hashToken(token)),
        gt(adminSessions.expiresAt, new Date()),
        eq(adminUsers.active, true),
      ),
    );
  return row ?? null;
}

/**
 * À appeler en tête de CHAQUE fonction serveur de l'espace boutique.
 * Sans session valide : 404, pour ne pas révéler l'existence de l'espace boutique.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdmin();
  if (!admin) throw notFound();
  return admin;
}

/** Compare la clé de l'URL de connexion (/acces/<clé>) à ADMIN_LOGIN_KEY, en temps constant. */
export function isValidLoginKey(key: unknown): boolean {
  const expected = process.env["ADMIN_LOGIN_KEY"] ?? "";
  if (expected.length < 16 || typeof key !== "string" || key.length > 200) return false;
  const a = createHash("sha256").update(key).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

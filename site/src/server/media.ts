import "@tanstack/react-start/server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Photos envoyées depuis l'espace boutique.
 * Rangées dans UPLOAD_DIR (hors du dossier de l'application : un redéploiement ne les efface pas),
 * servies par la route /medias/<fichier>.
 */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const NAME = /^[a-f0-9]{32}\.(jpg|png|webp|avif)$/;
const TYPES = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
} as const;
type Ext = keyof typeof TYPES;

function uploadDir() {
  return path.resolve(process.env["UPLOAD_DIR"] ?? "uploads");
}

/** Format réel du fichier d'après ses premiers octets (le nom et le type annoncés ne comptent pas). */
function detect(b: Uint8Array): Ext | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  if (ascii(4, 8) === "ftyp" && ["avif", "avis"].includes(ascii(8, 12))) return "avif";
  return null;
}

export async function saveUpload(file: File): Promise<{ url: string } | { error: string }> {
  if (file.size === 0) return { error: "Fichier vide." };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "Photo trop lourde (5 Mo maximum)." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = detect(bytes);
  if (!ext) return { error: "Format non pris en charge : JPEG, PNG, WebP ou AVIF uniquement." };
  const name = `${randomBytes(16).toString("hex")}.${ext}`;
  await mkdir(uploadDir(), { recursive: true });
  await writeFile(path.join(uploadDir(), name), bytes, { mode: 0o644 });
  return { url: `/medias/${name}` };
}

export async function readMedia(name: string): Promise<{ body: Uint8Array; type: string } | null> {
  const m = NAME.exec(name);
  if (!m) return null; // refuse tout autre nom (pas de « ../ »)
  try {
    const body = new Uint8Array(await readFile(path.join(uploadDir(), name)));
    return { body, type: TYPES[m[1] as Ext] };
  } catch {
    return null;
  }
}

/** URL de photo acceptée : fichier envoyé (/medias/…) ou adresse https. */
export function isAllowedImageUrl(url: string): boolean {
  if (/^\/medias\/[a-f0-9]{32}\.(jpg|png|webp|avif)$/.test(url)) return true;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && url.length <= 500;
  } catch {
    return false;
  }
}

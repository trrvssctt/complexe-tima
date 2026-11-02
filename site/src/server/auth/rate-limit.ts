import "@tanstack/react-start/server-only";

/**
 * Limitation des échecs de connexion, en mémoire (un seul processus Node sur le VPS).
 * Un redémarrage remet les compteurs à zéro : acceptable pour ce volume.
 */
const WINDOW_MS = 15 * 60 * 1000;
const LIMITS = { ip: 10, email: 5 } as const;

type Kind = keyof typeof LIMITS;
const failures = new Map<string, number[]>();

function recent(key: string, now: number) {
  const list = (failures.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (list.length) failures.set(key, list);
  else failures.delete(key);
  return list;
}

export function isBlocked(entries: [Kind, string][]): boolean {
  const now = Date.now();
  return entries.some(([kind, value]) => recent(`${kind}:${value}`, now).length >= LIMITS[kind]);
}

export function recordFailure(entries: [Kind, string][]) {
  const now = Date.now();
  for (const [kind, value] of entries) {
    const key = `${kind}:${value}`;
    failures.set(key, [...recent(key, now), now]);
  }
  // Évite que la table grossisse indéfiniment
  if (failures.size > 10_000) failures.clear();
}

export function clearFailures(entries: [Kind, string][]) {
  for (const [kind, value] of entries) failures.delete(`${kind}:${value}`);
}

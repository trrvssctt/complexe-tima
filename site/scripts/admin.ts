/**
 * Gestion des comptes de l'espace boutique (aucune inscription possible depuis le site).
 *
 *   pnpm admin create <email> "<Nom>"     crée le compte et affiche un mot de passe généré
 *   pnpm admin reset <email>              nouveau mot de passe + déconnexion de tous les appareils
 *   pnpm admin disable <email>            bloque le compte (et le déconnecte)
 *   pnpm admin enable <email>
 *   pnpm admin list
 *
 * Pour choisir le mot de passe au lieu de le générer : ADMIN_PASSWORD="…" pnpm admin create …
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../src/server/db";
import { adminSessions, adminUsers } from "../src/server/db/schema";
import { generatePassword, hashPassword } from "../src/server/auth/password";

const [command, rawEmail, name] = process.argv.slice(2);
const email = rawEmail?.trim().toLowerCase();

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

async function findUser() {
  if (!email) fail("E-mail manquant.");
  const [user] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
  if (!user) fail(`Aucun compte pour ${email}.`);
  return user;
}

function newPassword() {
  return process.env.ADMIN_PASSWORD ?? generatePassword();
}

function show(password: string) {
  if (process.env.ADMIN_PASSWORD)
    return console.log("Mot de passe : celui fourni dans ADMIN_PASSWORD.");
  console.log(`Mot de passe : ${password}`);
  console.log("À transmettre par un canal sûr, puis à ne plus conserver en clair.");
}

async function main() {
  switch (command) {
    case "create": {
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
        fail('Usage : pnpm admin create <email> "<Nom>"');
      if (!name?.trim()) fail("Nom manquant.");
      const [existing] = await db
        .select({ id: adminUsers.id })
        .from(adminUsers)
        .where(eq(adminUsers.email, email));
      if (existing)
        fail(
          `Un compte existe déjà pour ${email} (utilisez « reset » pour changer son mot de passe).`,
        );
      const password = newPassword();
      await db
        .insert(adminUsers)
        .values({ email, name: name.trim(), passwordHash: await hashPassword(password) });
      console.log(`Compte créé : ${email}`);
      show(password);
      break;
    }
    case "reset": {
      const user = await findUser();
      const password = newPassword();
      await db
        .update(adminUsers)
        .set({ passwordHash: await hashPassword(password) })
        .where(eq(adminUsers.id, user.id));
      await db.delete(adminSessions).where(eq(adminSessions.userId, user.id));
      console.log(`Mot de passe changé pour ${email}, toutes les sessions sont fermées.`);
      show(password);
      break;
    }
    case "disable":
    case "enable": {
      const user = await findUser();
      await db
        .update(adminUsers)
        .set({ active: command === "enable" })
        .where(eq(adminUsers.id, user.id));
      if (command === "disable")
        await db.delete(adminSessions).where(eq(adminSessions.userId, user.id));
      console.log(`Compte ${email} ${command === "enable" ? "réactivé" : "désactivé"}.`);
      break;
    }
    case "list": {
      const users = await db.select().from(adminUsers).orderBy(adminUsers.id);
      for (const u of users)
        console.log(
          `${u.active ? "actif  " : "bloqué "} ${u.email.padEnd(32)} ${u.name.padEnd(24)} dernière connexion : ${u.lastLoginAt?.toISOString() ?? "jamais"}`,
        );
      if (!users.length) console.log("Aucun compte.");
      break;
    }
    default:
      fail("Commandes : create | reset | disable | enable | list");
  }
  process.exit(0);
}

// Les erreurs SQL contiennent les paramètres de la requête (dont le hachage) : on n'affiche que la cause
main().catch((e) => {
  const cause =
    e?.cause?.message ??
    (e instanceof Error && !("query" in e) ? e.message : "erreur base de données");
  fail(`Échec : ${cause}`);
});

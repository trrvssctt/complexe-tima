# Complexe Tima — boutique en ligne

Boutique multi-rayons à Dakar : catalogue, panier, commandes enregistrées puis envoyées sur WhatsApp,
et espace boutique sécurisé (commandes, prix, stock, produits en ligne).

TanStack Start (React 19, Vite, SSR) · Tailwind CSS 4 · PostgreSQL · Drizzle ORM · serveur Node (Nitro).

## Démarrer en local

Node **22.12 ou plus** est requis.

```bash
pnpm install
cp .env.example .env        # puis renseigner ADMIN_LOGIN_KEY et SESSION_SECRET
pnpm db:up                  # PostgreSQL 16 dans Docker (port 5433)
pnpm db:migrate
pnpm catalogue:sync --textes --publier   # remplit la base depuis src/data/catalogue.ts (une fois)
pnpm dev                    # http://localhost:3000
```

Production : `pnpm build` puis `node --env-file=.env .output/server/index.mjs` (variables `PORT`, `HOST`,
`NODE_ENV=production`). Sur le VPS : `deploy/ecosystem.config.cjs` (pm2) et `deploy/update.sh`.

## Catalogue

- **La base fait foi** : prix, stock, visibilité, descriptions modifiées dans l'espace boutique.
  Le site la lit via `getCatalogue` (`src/functions/catalogue.ts`), puis `useCatalogue()` dans les pages.
- `src/data/catalogue.ts` : rayons, packs et **textes de référence** des produits (`SEED_PRODUCTS`).
  `pnpm catalogue:sync` les reporte en base sans écraser l'espace boutique (`--textes` pour reprendre
  noms et descriptions, `--publier` pour tout mettre en ligne). Jamais de prix ni de stock.
- Photos : `src/assets/products/<sku-parent-en-minuscules>.jpg` (ajouter une photo ne demande aucun code).
- Prix et stocks en masse : `pnpm catalogue:import fichier.xlsx [--dry-run]`
  (fichier `catalogue_complexe_tima_a_remplir.xlsx`, une case vide ne change rien).
- Sans prix : « Prix sur demande ». L'article reste commandable ; le total est confirmé sur WhatsApp.

## Commandes

`src/server/orders.ts` : validation (zod, téléphone sénégalais), prix relus en base (jamais ceux du
navigateur), commande enregistrée avec un numéro `TIMA-0001`, puis message WhatsApp pré-rempli.
Anti-abus : champ piège, 10 commandes / 10 min par IP. Le stock n'est pas décrémenté à la commande.

## Espace boutique

Tableau de bord, commandes (statuts, paiement, notes, historique), produits (prix, stock, visibilité,
mise en avant). **Aucun lien** depuis le site public.

- Connexion uniquement à `/acces/<ADMIN_LOGIN_KEY>` ; toute autre clé → 404.
- `/admin` répond 404 sans cookie de session signé (`src/start.ts`), et chaque fonction serveur
  appelle `requireAdmin()` (`src/server/auth/session.ts`).
- Mots de passe scrypt + sel ; cookie `__Host-` httpOnly, Secure, SameSite=strict, signé HMAC
  (`SESSION_SECRET`) ; seul le SHA-256 du jeton est en base ; 12 h (7 jours avec « rester connectée ») ;
  blocage 15 min après 5 échecs par e-mail ou 10 par IP ; message d'erreur unique.
- Comptes en ligne de commande uniquement : `pnpm admin create <email> "<Nom>"`, `reset`, `disable`,
  `enable`, `list`.

## Arborescence

| Dossier                                         | Contenu                                                                                |
| ----------------------------------------------- | -------------------------------------------------------------------------------------- |
| `src/routes/`                                   | Pages (routage par fichiers ; `admin.*` = espace boutique, `acces.$cle` = connexion)   |
| `src/functions/`                                | Fonctions serveur appelées par les pages                                               |
| `src/server/`                                   | Code serveur uniquement : base (`db/`), catalogue, commandes, authentification         |
| `src/components/shop/`, `src/components/admin/` | Composants de la boutique et de l'espace boutique                                      |
| `drizzle/`                                      | Migrations SQL (`pnpm db:generate --name <nom>` après une modification de `schema.ts`) |
| `scripts/`                                      | Synchronisation et import du catalogue, gestion des comptes                            |
| `deploy/`                                       | pm2, nginx, mise à jour du VPS                                                         |

## Règles du projet

- **La base PostgreSQL est la source de vérité** du catalogue (prix, stock, visibilité, textes modifiés dans
  l'espace boutique). Les pages lisent les produits avec `useCatalogue()` / `loadCatalogue()` (`src/lib/catalogue.tsx`),
  jamais `SEED_PRODUCTS` directement. Pourquoi : la propriétaire modifie le catalogue depuis l'espace boutique.
- `src/data/catalogue.ts` (`SEED_PRODUCTS`) sert à remplir la base (`pnpm catalogue:sync`) et doit contenir chaque SKU
  du fichier de la cliente (`src/data/catalogue_complexe_tima.csv`) ; `src/test/catalogue.test.ts` le vérifie.
- Photos produits : `src/assets/products/<sku-parent-en-minuscules>.jpg`, résolues par `src/lib/product-images.ts`.
- Le prix est facultatif : sans prix, « Prix sur demande », l'article reste commandable et le total est confirmé
  sur WhatsApp. Les prix et totaux sont toujours recalculés côté serveur (`src/server/orders.ts`).
- Code serveur dans `src/server/` (marqué `@tanstack/react-start/server-only`) ; les pages n'appellent que les
  fonctions de `src/functions/`.
- **Espace boutique** : chaque fonction serveur commence par `requireAdmin()` (sauf la connexion). Aucun lien vers
  `/admin` ou `/acces/` depuis le site public. Ne jamais afficher ni journaliser un mot de passe, un hachage ou un secret.
- Node 22.12+ ; gestionnaire de paquets pnpm.

/**
 * Catalogue Complexe Tima.
 *
 * - Types, rayons (CATEGORIES) et packs : utilisés directement par le site.
 * - SEED_PRODUCTS : textes de référence (noms, descriptions, variantes) qui servent à remplir la base
 *   avec `pnpm catalogue:sync`. En production, le site lit les produits EN BASE (prix, visibilité,
 *   modifications de l'espace boutique) via `getCatalogue` → `useCatalogue()`.
 * - Chaque SKU du fichier de la cliente (src/data/catalogue_complexe_tima.csv) doit exister ici
 *   (vérifié par un test). Sans prix : « Prix sur demande ».
 */

export type CategorySlug =
  "fournitures" | "informatique" | "beaute" | "parfumerie" | "mode" | "maison";

export type SwatchKey =
  "bleu" | "rouge" | "jaune" | "vert" | "noir" | "rose" | "kaki" | "lilas" | "blanc" | "motifs";

export interface Variant {
  sku: string;
  label: string;
  swatch?: SwatchKey;
  /** Prix propre à la variante (base de données) ; sinon celui du produit. */
  price?: number;
}

export interface Product {
  id: string; // SKU parent
  slug: string;
  name: string;
  brand?: string;
  category: CategorySlug;
  subcategory: string;
  description: string;
  /** Variantes vendues séparément (couleurs, etc.). Vide => produit unique (sku = id). */
  variants: Variant[];
  /** Choix à préciser à la commande (teintes, pointures, tailles...). */
  options?: string;
  price?: number;
  /** Photos ajoutées dans l'espace boutique (la première est la principale). Sinon : photo du dossier assets. */
  images?: string[];
  featured?: boolean;
  giftIdea?: boolean;
}

export interface Category {
  slug: CategorySlug;
  name: string;
  fullName: string;
  tagline: string;
  description: string;
}

export const CATEGORIES: Category[] = [
  {
    slug: "fournitures",
    name: "Fournitures",
    fullName: "Fournitures scolaires & bureau",
    tagline: "Cahiers, trousses, manuels, papier",
    description:
      "Tout pour la rentrée et le bureau : cahiers, papeterie, écriture, coloriage, trousses et manuels scolaires.",
  },
  {
    slug: "informatique",
    name: "Informatique",
    fullName: "Informatique & électrique",
    tagline: "Claviers, souris, multiprises",
    description: "Périphériques Dell, multiprises, rallonges et petits accessoires pratiques.",
  },
  {
    slug: "beaute",
    name: "Beauté",
    fullName: "Beauté & soins",
    tagline: "Laits, déodorants, soins cheveux",
    description: "Soins du corps, soins capillaires, déodorants, brumes et hygiène du quotidien.",
  },
  {
    slug: "parfumerie",
    name: "Parfumerie",
    fullName: "Parfumerie & encens",
    tagline: "Parfums, encens, coffrets",
    description:
      "Parfums orientaux, huiles parfumées, charbon pour encens, brûle-encens et coffrets cadeaux.",
  },
  {
    slug: "mode",
    name: "Mode",
    fullName: "Mode & accessoires",
    tagline: "Sandales, montres, pochettes",
    description:
      "Sandales de soirée, pochettes, montres en coffret, casquettes, vêtements de nuit et voiles.",
  },
  {
    slug: "maison",
    name: "Textile & maison",
    fullName: "Textile & maison",
    tagline: "Serviettes, pagnes, entretien",
    description: "Linge de bain, tissus brodés et pagnes, accessoires d'entretien.",
  },
];

const c = (sku: string, label: string, swatch: SwatchKey): Variant => ({ sku, label, swatch });
const colors4 = (id: string) => [
  c(`${id}-BLEU`, "Bleu", "bleu"),
  c(`${id}-ROUGE`, "Rouge", "rouge"),
  c(`${id}-JAUNE`, "Jaune", "jaune"),
  c(`${id}-VERT`, "Vert", "vert"),
];

export const SEED_PRODUCTS: Product[] = [
  // ───────── Fournitures scolaires & bureau ─────────
  {
    id: "CT-SCO-001",
    slug: "cahier-travaux-pratiques-grand-format",
    name: "Cahier Travaux Pratiques grand format",
    brand: "Monila",
    category: "fournitures",
    subcategory: "Cahiers",
    description:
      "Le cahier de TP grand format pour les schémas, dessins et exercices pratiques. Couverture colorée avec cadre Nom, Prénom, Matière et Classe.",
    variants: colors4("CT-SCO-001"),
    featured: true,
  },
  {
    id: "CT-SCO-002",
    slug: "cahier-grand-format-college",
    name: "Cahier grand format « Collège »",
    brand: "Monila",
    category: "fournitures",
    subcategory: "Cahiers",
    description:
      "Cahier grand format à couverture plastique brillante, plus résistante pour tenir toute l'année scolaire.",
    variants: colors4("CT-SCO-002"),
    featured: true,
  },
  {
    id: "CT-SCO-003",
    slug: "cahiers-petit-format",
    name: "Cahiers petit format",
    category: "fournitures",
    subcategory: "Cahiers",
    description: "Cahiers petit format pour les leçons et les devoirs, en couleurs assorties.",
    variants: [],
    options: "Assortiment de couleurs",
  },
  {
    id: "CT-SCO-004",
    slug: "cahier-illustre-enfant",
    name: "Cahier illustré enfant",
    category: "fournitures",
    subcategory: "Cahiers",
    description: "Cahier aux couvertures illustrées et colorées, pensé pour les plus petits.",
    variants: [],
    options: "Couvertures illustrées au choix",
  },
  {
    id: "CT-SCO-005",
    slug: "rame-papier-a4-double-a",
    name: "Rame de papier A4 80 g",
    brand: "Double A",
    category: "fournitures",
    subcategory: "Papier & papeterie",
    description:
      "Rame de 500 feuilles A4 80 g Double A, pour l'imprimante, la photocopie et l'écriture.",
    variants: [],
    featured: true,
  },
  {
    id: "CT-SCO-006",
    slug: "pochette-papier-dessin-canson",
    name: "Pochette papier à dessin",
    brand: "Canson",
    category: "fournitures",
    subcategory: "Papier & papeterie",
    description:
      "Pochette de papier à dessin Canson, pour les crayons de couleur, les feutres et la peinture.",
    variants: [],
  },
  {
    id: "CT-SCO-007",
    slug: "bloc-de-feuilles",
    name: "Bloc de feuilles",
    category: "fournitures",
    subcategory: "Papier & papeterie",
    description: "Bloc de feuilles détachables pour les notes, brouillons et exercices.",
    variants: [],
  },
  {
    id: "CT-SCO-008",
    slug: "feuillets-adhesifs-repositionnables",
    name: "Feuillets adhésifs repositionnables",
    category: "fournitures",
    subcategory: "Papier & papeterie",
    description: "Petits feuillets adhésifs de couleur pour noter, marquer une page ou organiser.",
    variants: [],
    options: "Assortiment de couleurs",
  },
  {
    id: "CT-SCO-009",
    slug: "feuilles-carton-kraft",
    name: "Feuilles de carton kraft",
    category: "fournitures",
    subcategory: "Papier & papeterie",
    description: "Feuilles de carton kraft pour les travaux manuels, exposés et emballages.",
    variants: [],
  },
  {
    id: "CT-SCO-010",
    slug: "rouleau-papier-blanc",
    name: "Rouleau de papier blanc",
    category: "fournitures",
    subcategory: "Papier & papeterie",
    description: "Grand rouleau de papier blanc pour affiches, dessins et protections.",
    variants: [],
  },
  {
    id: "CT-SCO-011",
    slug: "stylo-correcteur",
    name: "Stylo correcteur",
    category: "fournitures",
    subcategory: "Écriture & correction",
    description: "Stylo correcteur à pointe fine pour effacer proprement les erreurs.",
    variants: [],
  },
  {
    id: "CT-SCO-012",
    slug: "surligneurs",
    name: "Surligneurs",
    category: "fournitures",
    subcategory: "Écriture & correction",
    description: "Surligneurs fluo pour réviser et faire ressortir l'essentiel.",
    variants: [],
    options: "Assortiment de couleurs",
  },
  {
    id: "CT-SCO-013",
    slug: "stylos-a-bille-boite",
    name: "Stylos à bille (boîte)",
    category: "fournitures",
    subcategory: "Écriture & correction",
    description: "Boîte de stylos à bille pour l'école et le bureau, en bleu, noir ou rouge.",
    variants: [
      c("CT-SCO-013-BLEU", "Bleu", "bleu"),
      c("CT-SCO-013-NOIR", "Noir", "noir"),
      c("CT-SCO-013-ROUGE", "Rouge", "rouge"),
    ],
  },
  {
    id: "CT-SCO-014",
    slug: "gomme",
    name: "Gomme",
    category: "fournitures",
    subcategory: "Écriture & correction",
    description: "Gomme douce qui efface le crayon sans abîmer le papier.",
    variants: [],
  },
  {
    id: "CT-SCO-015",
    slug: "crayons-de-couleur-color-peps",
    name: "Crayons de couleur Color'Peps",
    brand: "Maped",
    category: "fournitures",
    subcategory: "Dessin & coloriage",
    description: "Les crayons de couleur Maped Color'Peps, aux couleurs vives, en boîte.",
    variants: [],
    options: "Boîte de 12 ou 24 couleurs",
    featured: true,
  },
  {
    id: "CT-SCO-016",
    slug: "craies-giotto",
    name: "Craies Giotto (boîte)",
    brand: "Giotto",
    category: "fournitures",
    subcategory: "Matériel de classe",
    description: "Boîte de craies Giotto pour le tableau de la classe ou de la maison.",
    variants: [],
  },
  {
    id: "CT-SCO-017",
    slug: "kit-de-geometrie",
    name: "Kit de géométrie",
    category: "fournitures",
    subcategory: "Dessin & coloriage",
    description: "Compas, règle, équerre et rapporteur réunis dans un même kit.",
    variants: [],
    featured: true,
  },
  {
    id: "CT-SCO-018",
    slug: "trousse-scolaire",
    name: "Trousse scolaire",
    category: "fournitures",
    subcategory: "Trousses & rangement",
    description: "Trousse zippée pour ranger stylos, crayons et gomme. Deux modèles au choix.",
    variants: [
      c("CT-SCO-018-ROSE", "Rose", "rose"),
      c("CT-SCO-018-MOTIFS-GROUPE-MUSICAL", "Motifs groupe musical", "motifs"),
    ],
    featured: true,
  },
  {
    id: "CT-SCO-019",
    slug: "syllabaire-mamadou-et-bineta",
    name: "Syllabaire « Mamadou et Bineta »",
    category: "fournitures",
    subcategory: "Manuels scolaires",
    description:
      "Le célèbre syllabaire Mamadou et Bineta, nouvelle édition, pour apprendre à lire.",
    variants: [],
    featured: true,
  },
  {
    id: "CT-SCO-020",
    slug: "manuel-de-mathematiques-2026",
    name: "Manuel de mathématiques (édition 2026)",
    category: "fournitures",
    subcategory: "Manuels scolaires",
    description: "Manuel de mathématiques, édition 2026. Précisez la classe à la commande.",
    variants: [],
    options: "Niveau / classe à préciser",
  },
  {
    id: "CT-SCO-021",
    slug: "manuels-et-livres-illustres",
    name: "Manuels et livres illustrés",
    category: "fournitures",
    subcategory: "Manuels scolaires",
    description:
      "Sélection de manuels et de livres illustrés pour enfants. Demandez-nous les titres disponibles.",
    variants: [],
    options: "Titres disponibles sur demande",
  },
  {
    id: "CT-SCO-022",
    slug: "craies-blanches-boite",
    name: "Craies blanches (boîte)",
    category: "fournitures",
    subcategory: "Matériel de classe",
    description: "Boîte de craies blanches pour le tableau noir.",
    variants: [],
  },
  {
    id: "CT-SCO-023",
    slug: "craies-de-couleur-boite",
    name: "Craies de couleur (boîte)",
    category: "fournitures",
    subcategory: "Matériel de classe",
    description: "Boîte de craies de couleur pour écrire et dessiner au tableau.",
    variants: [],
  },

  // ───────── Informatique & électrique ─────────
  {
    id: "CT-INF-001",
    slug: "clavier-dell-kb216",
    name: "Clavier filaire USB KB216",
    brand: "Dell",
    category: "informatique",
    subcategory: "Périphériques",
    description: "Clavier Dell KB216 filaire USB, silencieux et confortable, prêt à brancher.",
    variants: [],
    featured: true,
  },
  {
    id: "CT-INF-002",
    slug: "souris-optique-dell",
    name: "Souris optique filaire",
    brand: "Dell",
    category: "informatique",
    subcategory: "Périphériques",
    description: "Souris optique filaire Dell, USB, précise et simple à utiliser.",
    variants: [],
  },
  {
    id: "CT-INF-003",
    slug: "multiprise-verticale",
    name: "Multiprise verticale",
    category: "informatique",
    subcategory: "Multiprises & rallonges",
    description: "Multiprise en tour verticale, pratique pour brancher plusieurs appareils.",
    variants: [],
  },
  {
    id: "CT-INF-004",
    slug: "multiprise-5-prises-interrupteur",
    name: "Multiprise 5 prises avec interrupteur",
    category: "informatique",
    subcategory: "Multiprises & rallonges",
    description: "Multiprise 5 prises avec interrupteur pour couper tous les appareils d'un geste.",
    variants: [],
  },
  {
    id: "CT-INF-005",
    slug: "rallonge-electrique",
    name: "Rallonge électrique",
    category: "informatique",
    subcategory: "Multiprises & rallonges",
    description: "Rallonge électrique pour la maison ou le bureau.",
    variants: [],
  },
  {
    id: "CT-INF-006",
    slug: "ruban-double-face-nano-tape",
    name: "Ruban adhésif double face Nano Tape",
    category: "informatique",
    subcategory: "Petits accessoires",
    description:
      "Ruban gel transparent double face, réutilisable, pour fixer sans clou ni perçage.",
    variants: [],
  },

  // ───────── Beauté & soins ─────────
  {
    id: "CT-BEA-001",
    slug: "coloration-cheveux-citation",
    name: "Coloration cheveux Citation",
    brand: "Citation",
    category: "beaute",
    subcategory: "Soins capillaires",
    description: "Coloration Citation pour des cheveux brillants et une couleur intense.",
    variants: [],
    options: "Plusieurs teintes — précisez la vôtre",
    featured: true,
  },
  {
    id: "CT-BEA-002",
    slug: "spray-capillaire-parfume",
    name: "Spray capillaire parfumé",
    category: "beaute",
    subcategory: "Soins capillaires",
    description: "Spray capillaire parfumé en flacon pompe, pour des cheveux doux et parfumés.",
    variants: [],
  },
  {
    id: "CT-BEA-003",
    slug: "creme-masque-capillaire",
    name: "Crème / masque capillaire",
    category: "beaute",
    subcategory: "Soins capillaires",
    description: "Soin capillaire en pot pour nourrir et assouplir les cheveux.",
    variants: [],
  },
  {
    id: "CT-BEA-004",
    slug: "peignes-accessoires-cheveux",
    name: "Peignes & accessoires cheveux",
    category: "beaute",
    subcategory: "Soins capillaires",
    description: "Peignes et petits accessoires pour coiffer et entretenir les cheveux.",
    variants: [],
  },
  {
    id: "CT-BEA-005",
    slug: "lait-corporel-nova",
    name: "Lait corporel Nova",
    brand: "Nova",
    category: "beaute",
    subcategory: "Soins du corps",
    description: "Lait corporel Nova pour une peau douce et hydratée au quotidien.",
    variants: [],
  },
  {
    id: "CT-BEA-006",
    slug: "lait-corporel-coco-hydralux",
    name: "Lait corporel Coco",
    brand: "Hydralux",
    category: "beaute",
    subcategory: "Soins du corps",
    description: "Lait corporel Hydralux à la noix de coco, pour une peau nourrie et parfumée.",
    variants: [],
    featured: true,
  },
  {
    id: "CT-BEA-007",
    slug: "lait-de-beaute-skin-net",
    name: "Lait de beauté Skin Net",
    category: "beaute",
    subcategory: "Soins du corps",
    description: "Lait de beauté Skin Net pour le soin du corps.",
    variants: [],
  },
  {
    id: "CT-BEA-008",
    slug: "lotion-corporelle-familia",
    name: "Lotion corporelle Familia",
    category: "beaute",
    subcategory: "Soins du corps",
    description: "Lotion corporelle Familia, pour toute la famille.",
    variants: [],
  },
  {
    id: "CT-BEA-009",
    slug: "soin-homme-men-perfect-day",
    name: "Soin homme « MEN Perfect Day »",
    category: "beaute",
    subcategory: "Soins du corps",
    description: "Soin pour homme MEN Perfect Day.",
    variants: [],
  },
  {
    id: "CT-BEA-010",
    slug: "huile-corporelle",
    name: "Huile corporelle",
    category: "beaute",
    subcategory: "Soins du corps",
    description: "Huile corporelle en flacon ambré pour une peau satinée.",
    variants: [],
  },
  {
    id: "CT-BEA-011",
    slug: "deodorant-spray-dove",
    name: "Déodorant spray",
    brand: "Dove",
    category: "beaute",
    subcategory: "Déodorants & brumes",
    description: "Déodorant spray Dove, fraîcheur et douceur pour la peau.",
    variants: [],
    options: "Plusieurs parfums disponibles",
  },
  {
    id: "CT-BEA-012",
    slug: "brume-parfumee-love-me",
    name: "Brume parfumée Love Me",
    category: "beaute",
    subcategory: "Déodorants & brumes",
    description: "Brume parfumée Love Me, légère et gourmande, pour le corps.",
    variants: [],
    giftIdea: true,
  },
  {
    id: "CT-BEA-013",
    slug: "deodorant-spray-homme",
    name: "Déodorant spray homme",
    category: "beaute",
    subcategory: "Déodorants & brumes",
    description: "Déodorant spray pour homme, fraîcheur longue durée.",
    variants: [],
  },
  {
    id: "CT-BEA-014",
    slug: "coffret-style",
    name: "Coffret « Style »",
    category: "beaute",
    subcategory: "Maquillage & ongles",
    description: "Coffret maquillage « Style » — une jolie idée cadeau.",
    variants: [],
    giftIdea: true,
  },
  {
    id: "CT-BEA-015",
    slug: "brosses-a-dents-pro-complete",
    name: "Brosses à dents Pro Complete (lot)",
    category: "beaute",
    subcategory: "Hygiène",
    description: "Lot de brosses à dents Pro Complete pour toute la famille.",
    variants: [],
  },
  {
    id: "CT-BEA-016",
    slug: "masques-jetables-3-plis",
    name: "Masques jetables 3 plis (boîte)",
    category: "beaute",
    subcategory: "Hygiène",
    description: "Boîte de masques jetables 3 plis.",
    variants: [],
  },

  // ───────── Parfumerie & encens ─────────
  {
    id: "CT-PAR-001",
    slug: "parfum-ameer-al-oudh",
    name: "Parfum Ameer Al Oudh",
    category: "parfumerie",
    subcategory: "Parfums",
    description: "Parfum oriental Ameer Al Oudh, aux notes boisées et chaleureuses de oud.",
    variants: [],
    featured: true,
    giftIdea: true,
  },
  {
    id: "CT-PAR-002",
    slug: "huile-parfumee-petit-flacon",
    name: "Huile parfumée (petit flacon)",
    category: "parfumerie",
    subcategory: "Parfums",
    description: "Huile parfumée concentrée en petit flacon, à porter sur la peau.",
    variants: [],
    options: "Plusieurs senteurs — demandez la liste",
  },
  {
    id: "CT-PAR-003",
    slug: "coffret-parfum-oriental",
    name: "Coffret parfum oriental",
    category: "parfumerie",
    subcategory: "Parfums",
    description: "Coffret parfum oriental, prêt à offrir.",
    variants: [],
    giftIdea: true,
  },
  {
    id: "CT-PAR-004",
    slug: "charbon-encens-al-shula",
    name: "Charbon pour encens Al Shu'la",
    brand: "Al Shu'la",
    category: "parfumerie",
    subcategory: "Encens & charbon",
    description: "Charbon Al Shu'la à allumage rapide pour brûler l'encens et le thiouraye.",
    variants: [],
  },
  {
    id: "CT-PAR-005",
    slug: "brule-encens-dore",
    name: "Brûle-encens doré",
    category: "parfumerie",
    subcategory: "Brûle-encens",
    description: "Brûle-encens doré, ouvragé, à utiliser avec du charbon pour encens.",
    variants: [],
    featured: true,
    giftIdea: true,
  },
  {
    id: "CT-PAR-006",
    slug: "brule-encens-en-coffret",
    name: "Brûle-parfum céramique en coffret",
    category: "parfumerie",
    subcategory: "Brûle-encens",
    description:
      "Brûle-parfum en céramique à bougie chauffe-plat, présenté dans son coffret. Plusieurs finitions selon arrivage.",
    variants: [],
    giftIdea: true,
  },
  {
    id: "CT-PAR-007",
    slug: "brule-encens-ceramique-decore",
    name: "Brûle-encens céramique décoré",
    category: "parfumerie",
    subcategory: "Brûle-encens",
    description: "Brûle-encens en céramique décorée, joli dans un salon ou une chambre.",
    variants: [],
  },
  {
    id: "CT-PAR-008",
    slug: "coffret-cadeau",
    name: "Coffret cadeau",
    category: "parfumerie",
    subcategory: "Coffrets cadeaux",
    description: "Coffret cadeau élégant pour faire plaisir. Demandez-nous son contenu.",
    variants: [],
    giftIdea: true,
  },

  // ───────── Mode & accessoires ─────────
  {
    id: "CT-MOD-001",
    slug: "sandales-femme-dorees-strass",
    name: "Sandales femme dorées à strass",
    category: "mode",
    subcategory: "Chaussures",
    description: "Sandales dorées ornées de strass, parfaites pour les cérémonies et soirées.",
    variants: [],
    options: "Pointure à préciser",
    featured: true,
    giftIdea: true,
  },
  {
    id: "CT-MOD-002",
    slug: "pochette-de-soiree-doree",
    name: "Pochette de soirée dorée",
    category: "mode",
    subcategory: "Sacs & pochettes",
    description: "Pochette de soirée dorée et brillante, l'accessoire chic des grandes occasions.",
    variants: [],
    featured: true,
    giftIdea: true,
  },
  {
    id: "CT-MOD-003",
    slug: "montre-femme-en-coffret",
    name: "Montre femme en coffret",
    category: "mode",
    subcategory: "Montres & bijoux",
    description: "Montre femme élégante présentée dans son coffret, prête à offrir.",
    variants: [],
    featured: true,
    giftIdea: true,
  },
  {
    id: "CT-MOD-004",
    slug: "casquette",
    name: "Casquette",
    category: "mode",
    subcategory: "Casquettes",
    description: "Casquette ajustable, coloris noir ou kaki.",
    variants: [c("CT-MOD-004-NOIR", "Noir", "noir"), c("CT-MOD-004-KAKI", "Kaki", "kaki")],
  },
  {
    id: "CT-MOD-005",
    slug: "ensemble-de-nuit-nuisette",
    name: "Ensemble de nuit / nuisette",
    category: "mode",
    subcategory: "Vêtements de nuit",
    description: "Ensemble de nuit et nuisette pour femme, doux et féminin.",
    variants: [],
    options: "Taille et couleur à préciser",
    giftIdea: true,
  },
  {
    id: "CT-MOD-006",
    slug: "t-shirt-polo",
    name: "T-shirt / polo",
    category: "mode",
    subcategory: "Vêtements",
    description: "T-shirt ou polo blanc, emballé neuf.",
    variants: [],
    options: "Taille à préciser",
  },
  {
    id: "CT-MOD-007",
    slug: "voile-foulard-noir",
    name: "Voile / foulard noir",
    category: "mode",
    subcategory: "Vêtements",
    description: "Voile noir léger et élégant, à porter au quotidien ou pour la prière.",
    variants: [],
  },

  // ───────── Textile & maison ─────────
  {
    id: "CT-MAI-001",
    slug: "serviette-drap-de-bain",
    name: "Serviette / drap de bain",
    category: "maison",
    subcategory: "Linge de maison",
    description: "Serviette de bain moelleuse et absorbante, en quatre coloris.",
    variants: [
      c("CT-MAI-001-ROSE", "Rose", "rose"),
      c("CT-MAI-001-LILAS", "Lilas", "lilas"),
      c("CT-MAI-001-BLANC", "Blanc", "blanc"),
      c("CT-MAI-001-BLEU", "Bleu", "bleu"),
    ],
    featured: true,
  },
  {
    id: "CT-MAI-002",
    slug: "tissu-brode-pagne",
    name: "Tissu brodé / pagne",
    category: "maison",
    subcategory: "Tissus & pagnes",
    description: "Tissu brodé et pagne pour la couture ou la décoration.",
    variants: [],
    options: "Motif à choisir",
  },
  {
    id: "CT-MAI-003",
    slug: "brosse-de-nettoyage",
    name: "Brosse de nettoyage",
    category: "maison",
    subcategory: "Entretien",
    description: "Brosse longue à poils durs pour le ménage et le nettoyage des sols.",
    variants: [],
  },
];

export interface Pack {
  slug: string;
  name: string;
  level: string;
  items: string[];
}

export const PACKS: Pack[] = [
  {
    slug: "pack-cp-ce2",
    name: "Pack CP – CE2",
    level: "CP – CE2",
    items: [
      "Cahiers Travaux Pratiques",
      "Trousse garnie",
      "Crayons de couleur",
      "Syllabaire Mamadou et Bineta",
    ],
  },
  {
    slug: "pack-cm1-cm2",
    name: "Pack CM1 – CM2",
    level: "CM1 – CM2",
    items: [
      "Cahiers TP et cahiers « Collège »",
      "Trousse garnie",
      "Crayons de couleur",
      "Kit de géométrie",
    ],
  },
  {
    slug: "pack-college",
    name: "Pack Collège",
    level: "Collège",
    items: ["Cahiers « Collège »", "Trousse garnie", "Stylos et surligneurs", "Kit de géométrie"],
  },
];

// ───────── Helpers ─────────

/**
 * Prix d'un article. Une variante a son propre prix ; elle ne reprend le prix du produit que si
 * AUCUNE variante n'a de prix (catalogue de référence, prix au niveau du produit).
 * Une variante sans prix alors que d'autres en ont un reste « Prix sur demande ».
 */
export function variantPrice(product: Product, variant?: Variant): number | undefined {
  if (!variant) return product.price;
  if (variant.price != null) return variant.price;
  return product.variants.some((v) => v.price != null) ? undefined : product.price;
}

export function getCategory(slug: string) {
  return CATEGORIES.find((cat) => cat.slug === slug);
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/** Fonctions de recherche sur une liste de produits (celle de la base, ou SEED_PRODUCTS en test). */
export function createCatalogue(products: Product[]) {
  const findBySku = (sku: string): { product: Product; variant?: Variant } | undefined => {
    for (const product of products) {
      if (product.id === sku && product.variants.length === 0) return { product };
      const variant = product.variants.find((v) => v.sku === sku);
      if (variant) return { product, variant };
    }
    return undefined;
  };
  const getProductsByCategory = (slug: CategorySlug) => products.filter((p) => p.category === slug);

  return {
    products,
    findBySku,
    getProductsByCategory,
    getProduct: (slug: string) => products.find((p) => p.slug === slug),
    getSubcategories: (slug: CategorySlug) =>
      Array.from(new Set(getProductsByCategory(slug).map((p) => p.subcategory))),
    /** Tous les SKU vendables (variante ou produit unique). */
    allSkus: () =>
      products.flatMap((p) => (p.variants.length ? p.variants.map((v) => v.sku) : [p.id])),
    /** Prix unitaire d'un SKU : celui de la variante, sinon celui du produit. */
    unitPrice: (sku: string) => {
      const found = findBySku(sku);
      return found ? variantPrice(found.product, found.variant) : undefined;
    },
    searchProducts: (query: string) => {
      const q = normalize(query.trim());
      if (!q) return products;
      const terms = q.split(/\s+/);
      return products.filter((p) => {
        const cat = getCategory(p.category);
        const hay = normalize(
          [
            p.name,
            p.brand,
            p.subcategory,
            cat?.fullName,
            p.description,
            ...p.variants.map((v) => v.label),
          ]
            .filter(Boolean)
            .join(" "),
        );
        return terms.every((t) => hay.includes(t));
      });
    },
    relatedProducts: (product: Product, count = 4) => {
      const same = products.filter(
        (p) =>
          p.id !== product.id &&
          p.category === product.category &&
          p.subcategory === product.subcategory,
      );
      const sameCat = products.filter(
        (p) =>
          p.id !== product.id &&
          p.category === product.category &&
          p.subcategory !== product.subcategory,
      );
      return [...same, ...sameCat].slice(0, count);
    },
  };
}

export type Catalogue = ReturnType<typeof createCatalogue>;

#!/usr/bin/env tsx
//
// ============================================================================
// SEED D'UN DOSSIER COMPLET — À PARTIR DE RIEN
// ============================================================================
//
// POURQUOI CE SCRIPT EXISTE. Les trois seeds du dépôt REMPLISSENT un dossier ;
// aucun n'en CRÉE un.
//
//   · `scripts/seed-demo.ts` code en dur deux `cuid` d'établissement qui
//     n'existent que sur une seule machine ;
//   · `prisma/seed.ts` travaille sur « un établissement **existant** » — son
//     en-tête le dit — et s'arrête si la base est vide ;
//   · `scripts/seed-salaries-demo.ts` est additif sur les établissements déjà
//     là, et n'écrit rien s'il n'y en a aucun.
//
// Conséquence mesurée : sur une base fraîchement migrée, les trois échouent, et
// le contrôle visuel du produit n'a jamais pu se faire ailleurs que sur la
// machine de la propriétaire. Une session distante a buté dessus le 2026-09-02,
// sept écrans vides — et un écran vide ne prouve rien sur une correction de
// charte.
//
// Ce script part d'une base MIGRÉE MAIS VIDE et écrit un dossier de bout en
// bout : entreprise, établissement, zones, équipements, salariés et titres,
// DUERP versionné, prestataires, permis de feu, plan de prévention, carnet
// sanitaire, registre d'accessibilité, prescription d'assureur, calendrier et
// plan d'actions.
//
// AUCUN IDENTIFIANT EN DUR. C'est le défaut qu'on répare : tout ce qui est créé
// l'est par `create`, et les identifiants circulent de proche en proche.
//
// -----------------------------------------------------------------------------
// IL N'A PAS BESOIN DE BASE D'OMBRE.
// -----------------------------------------------------------------------------
// Ce script n'utilise que le client Prisma généré. Il ne lance ni
// `prisma migrate dev` ni `prisma migrate diff --from-migrations`, les deux
// seules commandes qui réclament une `SHADOW_DATABASE_URL` — et qui, lorsqu'elle
// manque, retombent en silence sur `DIRECT_URL`, la VIDENT et y rejouent les
// migrations. C'est ce mécanisme qui a effacé la base de production le
// 2026-08-27 (cf. l'en-tête de `docker-compose.yml`). La marche à suivre en tête
// de fichier ne passe donc que par `prisma migrate deploy`, qui n'a pas de base
// d'ombre : le script reste sûr sur une machine où la variable est absente.
//
// -----------------------------------------------------------------------------
// IL REFUSE DE TOURNER SUR UNE BASE NON VIDE — ET IL LE DIT.
// -----------------------------------------------------------------------------
// Ni idempotent ni destructif : il s'arrête net si la base porte déjà une
// entreprise. Le troisième cas — empiler des dossiers en silence — est celui
// qu'on ne veut pas. Repartir d'une base neuve est la seule manœuvre :
// `createdb` d'une base à part, `prisma migrate deploy`, relance.
//
// -----------------------------------------------------------------------------
// MARCHE À SUIVRE, DEPUIS UNE BASE VIDE, SUR N'IMPORTE QUELLE MACHINE
// -----------------------------------------------------------------------------
//   1. pnpm install && pnpm prisma generate
//   2. docker compose up -d
//   3. docker exec duerp-db psql -U duerp -d postgres \
//        -c "CREATE DATABASE duerp_demo OWNER duerp;"
//   4. pointer DATABASE_URL et DIRECT_URL du .env sur `duerp_demo`
//   5. npx prisma migrate deploy
//   6. pnpm seed:complet --user <uuid Supabase>
//   7. pnpm dev, se connecter avec CE compte-là, ouvrir le dossier.
//
// -----------------------------------------------------------------------------
// `--user` EST OBLIGATOIRE, ET VOICI OÙ TROUVER SA VALEUR
// -----------------------------------------------------------------------------
// L'authentification vit chez Supabase (ADR-005) : il n'existe pas de modèle
// `User` en base, et `Entreprise.userId` — un UUID de `auth.users` stocké en
// texte, sans clé étrangère — est le SEUL lien entre un compte et son dossier.
// Ce script ne crée donc aucun compte : il n'a pas la clé de service, et le
// dépôt n'en stocke aucune. Il rattache le dossier à un compte qui existe déjà.
//
// Trois façons de lire cet identifiant, de la plus immédiate à la plus sûre :
//
//   · **Depuis une base où vous avez déjà un dossier.** Si vous avez créé un
//     dossier par l'onboarding avec ce compte, votre UUID y est déjà écrit :
//       docker exec duerp-db psql -U duerp -d <votre_base> \
//         -c 'SELECT "userId", "raisonSociale" FROM "Entreprise" WHERE "userId" IS NOT NULL;'
//   · **Depuis la console Supabase** : Authentication → Users, colonne UID.
//   · **Depuis l'application connectée**, en lisant le JWT de session : le
//     champ `sub` du jeton porté par le cookie `sb-<ref>-auth-token`.
//
// SANS `--user`, LE SCRIPT S'ARRÊTE. Il n'invente pas de valeur et ne retombe
// pas sur `null` : un dossier créé sous un identifiant que personne ne détient
// est invisible de tous les écrans — tous les helpers de `lib/auth/scope.ts`
// bornent par `entreprise.userId` — tout en ayant l'air d'avoir réussi. C'est le
// pire des trois résultats possibles, et le seul qu'on refuse d'atteindre.
//
// LES PERSONNES SONT FICTIVES. Le suivi nominatif traite de vraies données de
// santé-sécurité (RGPD 6.1.c, cf. docs/rgpd.md) ; y verser des identités réelles
// « pour tester » serait exactement ce que ce produit s'interdit.
//
// Usage :
//   pnpm seed:complet --user 3f2a91c4-7d18-4e02-9b55-0c1ee6a4d7b0
//   pnpm tsx --env-file=.env scripts/seed-dossier-complet.ts --user <uuid>

import {
  PrismaClient,
  Prisma,
  type CategorieEquipement,
  type Periodicite,
  type Realisateur,
  type StatutVerification,
  type TypeAction,
} from "@prisma/client";

import { genererSlug } from "@/lib/accessibilite/schema";
import { NOM_BATIMENT_PRINCIPAL } from "@/lib/batiments/schema";
import { calculerCriticite } from "@/lib/cotation";
import {
  equipementSchema,
  serialiserCaracteristiques,
} from "@/lib/equipements/schema";
import { restauration } from "@/lib/referentiels/restauration";
import { questionsActivites } from "@/lib/activites/reponses";
import { figerCouverture } from "@/lib/activites/snapshot";
import type { DuerpSnapshot, UniteSnapshot } from "@/lib/versions/snapshot";
import type { TypeMesure } from "@/lib/referentiels/types";
import {
  appliquerPrescriptions,
  determineObligationsApplicables,
  projeterEtablissement,
} from "@/lib/matching";
import {
  genererProchainesVerifications,
  genererVerificationsDepuisTitres,
  genererVerificationsSurMesure,
  type TitreDeclare,
} from "@/lib/calendrier/generateur";
import { obligationParId } from "@/lib/referentiels/conformite";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Horloge injectée une seule fois. Toutes les dates du dossier se lisent par
// rapport à elle : deux exécutions le même jour produisent le même dossier.
// ---------------------------------------------------------------------------
const MAINTENANT = new Date();

/** Date civile décalée de `n` jours par rapport à aujourd'hui, à minuit local. */
function jours(n: number): Date {
  const d = new Date(MAINTENANT);
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Date civile absolue, à minuit UTC — pour les faits datés (mises en service). */
function jour(iso: string): Date {
  const d = new Date(`${iso}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`Date invalide : ${iso}`);
  return d;
}

// ---------------------------------------------------------------------------
// La bande de calendrier RÉSERVÉE à l'échéance d'assureur.
//
// Le widget d'échéances en variante frise regroupe les échéances trop proches
// pour être distinguées à l'œil : à l'échelle « 12 mois », le seuil de
// `ECART_MIN_PX` (92 px) vaut ~35 jours (cf. `lib/dashboard/frise.ts`). Une
// ligne marquée « engagement d'assurance » noyée dans une grappe n'a plus de
// carte à elle, et la pastille ambre de l'ADR-032 devient invisible — c'est ce
// qui a empêché de la juger au contrôle du 2026-09-02.
//
// On lui réserve donc une bande vide de part et d'autre : aucune autre échéance
// n'est posée entre J+112 et J+208, et elle tombe au milieu, à J+160. La marge
// de 48 jours tient largement au-dessus des ~35 jours de regroupement.
// ---------------------------------------------------------------------------
const ASSUREUR_JOUR = 160;
const BANDE_RESERVEE_DEBUT = 112;
const BANDE_RESERVEE_FIN = 208;

// ===========================================================================
// 1. L'établissement — un restaurant, secteur cible du produit.
// ===========================================================================

const ENTREPRISE = {
  raisonSociale: "Le Comptoir des Halles",
  siret: "84219753600027",
  codeNaf: "56.10A", // Restauration traditionnelle
  adresse: "14 rue des Halles, 44000 Nantes",
  effectif: 9,
} as const;

const ZONES = [
  {
    nom: NOM_BATIMENT_PRINCIPAL, // « Zone principale » — cf. ADR-029
    complementAdresse: "Salle, bar, sanitaires — rez-de-chaussée",
    ordre: 0,
  },
  {
    nom: "Cuisine et réserves",
    complementAdresse: "Cuisine, plonge, réserve sèche, chambre froide",
    ordre: 1,
  },
  {
    nom: "Terrasse et local technique",
    complementAdresse: "Terrasse couverte et local technique sur cour",
    ordre: 2,
  },
] as const;

type NomZone = (typeof ZONES)[number]["nom"];

// ===========================================================================
// 2. Les équipements.
//
// Huit domaines, et des mises en service ÉCHELONNÉES : c'est d'elles que le
// générateur tire la première échéance de chaque ligne (cf.
// `genererProchainesVerifications`). Un parc entièrement daté du même jour
// produirait un calendrier d'une seule couleur, sur lequel un contrôle visuel
// ne montre rien.
//
// Les caractéristiques passent par `equipementSchema` avant d'être sérialisées :
// la cohérence catégorie ↔ propriété (une question de VMC sur un extincteur,
// par exemple) est ainsi vérifiée par la règle du produit, et non par ma
// relecture.
// ===========================================================================

type EquipementSeed = {
  libelle: string;
  categorie: CategorieEquipement;
  zone: NomZone;
  localisation: string;
  dateMiseEnService: string;
  champs?: Record<string, unknown>;
};

const EQUIPEMENTS: EquipementSeed[] = [
  {
    libelle: "Installation électrique du restaurant",
    categorie: "INSTALLATION_ELECTRIQUE",
    zone: NOM_BATIMENT_PRINCIPAL,
    localisation: "Tableau général — local technique",
    dateMiseEnService: "2015-06-10",
  },
  {
    libelle: "Extincteurs de la salle et du bar",
    categorie: "EXTINCTEUR",
    zone: NOM_BATIMENT_PRINCIPAL,
    localisation: "Salle, bar, dégagement",
    dateMiseEnService: "2023-04-18",
    champs: { nombre: 4 },
  },
  {
    libelle: "Extincteurs de la cuisine (dont classe F)",
    categorie: "EXTINCTEUR",
    zone: "Cuisine et réserves",
    localisation: "Cuisine, plonge",
    dateMiseEnService: "2021-10-02",
    champs: { nombre: 3 },
  },
  {
    libelle: "Blocs autonomes d'éclairage de sécurité",
    categorie: "BAES",
    zone: NOM_BATIMENT_PRINCIPAL,
    localisation: "Dégagements, issues de secours",
    dateMiseEnService: "2019-09-02",
    champs: { nombre: 9 },
  },
  {
    libelle: "Système de sécurité incendie — alarme type 4",
    categorie: "ALARME_INCENDIE",
    zone: NOM_BATIMENT_PRINCIPAL,
    localisation: "Entrée, cuisine, réserve",
    dateMiseEnService: "2021-02-15",
  },
  {
    libelle: "VMC de la cuisine et des sanitaires",
    categorie: "VMC",
    zone: "Cuisine et réserves",
    localisation: "Local technique sur cour",
    dateMiseEnService: "2018-11-05",
    champs: { estVmcGaz: "non", estLocalPollutionSpecifique: true },
  },
  {
    libelle: "Hotte de cuisson et conduit d'extraction",
    categorie: "HOTTE_PRO",
    zone: "Cuisine et réserves",
    localisation: "Cuisine — au-dessus du piano",
    dateMiseEnService: "2018-11-05",
    champs: { estLocalPollutionSpecifique: true },
  },
  {
    libelle: "Piano de cuisson gaz et friteuse",
    categorie: "APPAREIL_CUISSON_ERP",
    zone: "Cuisine et réserves",
    localisation: "Cuisine — ligne chaude",
    dateMiseEnService: "2022-03-21",
    champs: { aExtinctionAutomatique: "non" },
  },
  {
    libelle: "Chambre froide positive et groupe frigorifique",
    categorie: "INSTALLATION_FRIGORIFIQUE",
    zone: "Cuisine et réserves",
    localisation: "Réserve — groupe en local technique",
    dateMiseEnService: "2022-07-01",
    champs: {
      estChargeSousSeuilControle: "non",
      estHermetiquementScelleSousSeuil: "non",
      estChargeSuperieure50TCo2: "non",
      estChargeSuperieure500TCo2: "non",
      aDetectionDeFuites: "non",
    },
  },
  {
    libelle: "Porte automatique du sas d'entrée",
    categorie: "PORTE_AUTO",
    zone: NOM_BATIMENT_PRINCIPAL,
    localisation: "Sas d'entrée sur rue",
    dateMiseEnService: "2020-05-14",
  },
];

// ===========================================================================
// 3. L'équipe.
//
// Les titres sont choisis dans le catalogue dérivé du référentiel
// (`lib/salaries/catalogue.ts`) et évitent les couples que le droit interdit de
// cumuler (`conflitsExclusion`) : la VIP et le suivi individuel renforcé ne
// coexistent pas sur la même personne (R. 4624-24).
//
// Les échéances sont volontairement de trois natures : une déclarée et passée,
// une déclarée et proche, une laissée au calcul depuis la délivrance.
// ===========================================================================

type TitreSeed = {
  obligationId: string;
  delivreLe: string;
  /** Échéance déclarée, ou `null` pour la laisser calculer depuis la périodicité. */
  echeanceJours: number | null;
  note: string;
};

type SalarieSeed = {
  prenom: string;
  nom: string;
  poste: string;
  entreLe: string;
  actif?: boolean;
  titres: TitreSeed[];
};

const EQUIPE: SalarieSeed[] = [
  {
    prenom: "Awa",
    nom: "Traoré",
    poste: "Cheffe de cuisine",
    entreLe: "2019-02-04",
    titres: [
      {
        obligationId: "formation-securite-salarie-accueil",
        delivreLe: "2019-02-11",
        echeanceJours: null,
        note: "Accueil sécurité au poste — consigné au registre.",
      },
      {
        obligationId: "secours-salarie-secouriste",
        delivreLe: "2023-06-15",
        echeanceJours: 274,
        note: "SST — recyclage à programmer auprès de l'organisme habilité.",
      },
    ],
  },
  {
    prenom: "Yann",
    nom: "Le Goff",
    poste: "Responsable de salle",
    entreLe: "2021-09-01",
    titres: [
      {
        obligationId: "sante-travail-salarie-vip",
        delivreLe: "2021-10-12",
        // ÉCHÉANCE PASSÉE : donne une ligne dépassée au calendrier et au
        // compteur du tableau de bord.
        echeanceJours: -47,
        note: "Visite d'information et de prévention — renouvellement en retard.",
      },
      {
        obligationId: "formation-securite-salarie-cse-sst",
        delivreLe: "2024-03-04",
        echeanceJours: null,
        note: "Membre du CSE — formation santé, sécurité et conditions de travail.",
      },
    ],
  },
  {
    prenom: "Inès",
    nom: "Marchand",
    poste: "Serveuse",
    entreLe: "2024-04-15",
    titres: [
      {
        obligationId: "sante-travail-salarie-vip",
        delivreLe: "2024-05-06",
        echeanceJours: null, // calculée : cinq ans après la délivrance
        note: "VIP réalisée à l'embauche.",
      },
    ],
  },
  {
    prenom: "Théo",
    nom: "Barreau",
    poste: "Commis de cuisine",
    entreLe: "2025-01-06",
    titres: [
      {
        obligationId: "formation-securite-salarie-accueil",
        delivreLe: "2025-01-08",
        echeanceJours: null,
        note: "Accueil sécurité — poste de cuisine, machines et produits.",
      },
    ],
  },
  {
    prenom: "Sonia",
    nom: "Dupré",
    poste: "Plongeuse",
    entreLe: "2022-05-30",
    // Sortie de l'effectif : l'écran Équipe la montre encore (ses titres
    // restent une preuve, cf. docs/rgpd.md § 4.3) mais elle ne produit plus de
    // ligne de calendrier.
    actif: false,
    titres: [
      {
        obligationId: "formation-securite-salarie-accueil",
        delivreLe: "2022-06-02",
        echeanceJours: null,
        note: "Accueil sécurité — poste de plonge.",
      },
    ],
  },
];

// ===========================================================================
// 4. Le DUERP — risques cotés par unité de travail.
//
// Les risques reprennent le référentiel « Restauration traditionnelle » (INRS
// ED 880) déjà encodé dans `lib/referentiels/restauration.ts` : `referentielId`
// est renseigné, ce qui rattache chaque risque à sa fiche d'origine et rend les
// mesures recommandées cliquables dans le wizard.
//
// La criticité n'est jamais écrite à la main : elle passe par
// `calculerCriticite`, seule définition de la règle dans le produit.
// ===========================================================================

type RisqueSeed = {
  referentielId: string;
  gravite: number;
  probabilite: number;
  maitrise: number;
  nombreSalariesExposes: number;
  description?: string;
  /** Mesures du référentiel déjà en place — actions « levée ». */
  mesuresEnPlace: string[];
  /** Mesures encore à faire — actions ouvertes, avec échéance relative. */
  aFaire?: {
    libelle: string;
    type: TypeAction;
    echeanceJours: number | null;
    statut: "ouverte" | "en_cours";
    responsable?: string;
  }[];
};

const DUERP: Record<string, RisqueSeed[]> = {
  // Les clés sont les `referentielUniteId` du secteur restauration.
  reception: [
    {
      referentielId: "resto-charge-physique",
      gravite: 3,
      probabilite: 4,
      maitrise: 2,
      nombreSalariesExposes: 4,
      description:
        "Déchargement quotidien des livraisons depuis la rue, seuil de porte à franchir, cartons de 15 kg portés jusqu'à la réserve.",
      mesuresEnPlace: ["resto-stockage-hauteur"],
      aFaire: [
        {
          libelle: "Acquérir un diable à trois roues pour le franchissement du seuil",
          type: "reduction_source",
          echeanceJours: -14,
          statut: "ouverte",
          responsable: "Gérant",
        },
      ],
    },
    {
      referentielId: "resto-chute-plain-pied",
      gravite: 2,
      probabilite: 4,
      maitrise: 2,
      nombreSalariesExposes: 4,
      description:
        "Trottoir et sas d'entrée mouillés par temps de pluie, zone de réception encombrée pendant la livraison.",
      mesuresEnPlace: ["resto-circulation", "resto-chaussures-anti"],
    },
  ],

  stockage: [
    {
      referentielId: "resto-ambiance-thermique",
      gravite: 2,
      probabilite: 3,
      maitrise: 2,
      nombreSalariesExposes: 3,
      description:
        "Passages répétés entre la cuisine chaude et la chambre froide positive, sans vêtement adapté.",
      mesuresEnPlace: ["resto-ouverture-cf"],
      aFaire: [
        {
          libelle: "Fournir une veste isotherme pour les passages en chambre froide",
          type: "protection_individuelle",
          echeanceJours: 38,
          statut: "ouverte",
        },
      ],
    },
    {
      referentielId: "resto-chute-hauteur",
      gravite: 3,
      probabilite: 2,
      maitrise: 2,
      nombreSalariesExposes: 3,
      description:
        "Accès au stock haut de la réserve sèche depuis un escabeau non stabilisé.",
      mesuresEnPlace: ["resto-range-hauteur"],
      aFaire: [
        {
          libelle: "Remplacer l'escabeau par une plateforme individuelle roulante",
          type: "protection_collective",
          echeanceJours: 21,
          statut: "en_cours",
          responsable: "Gérant",
        },
      ],
    },
  ],

  production: [
    {
      referentielId: "resto-brulure",
      gravite: 3,
      probabilite: 3,
      maitrise: 2,
      nombreSalariesExposes: 4,
      description:
        "Friteuse en bout de ligne chaude, bacs de cuisson portés pleins jusqu'à la plonge, service en coup de feu.",
      mesuresEnPlace: ["resto-queues-casserole", "resto-protections-saisie"],
      aFaire: [
        {
          libelle: "Déplacer la friteuse hors du passage principal de la ligne chaude",
          type: "reduction_source",
          echeanceJours: 60,
          statut: "ouverte",
          responsable: "Cheffe de cuisine",
        },
      ],
    },
    {
      referentielId: "resto-coupure",
      gravite: 2,
      probabilite: 3,
      maitrise: 2,
      nombreSalariesExposes: 4,
      description:
        "Mandoline et trancheuse utilisées quotidiennement, couteaux rangés dans un tiroir commun.",
      mesuresEnPlace: ["resto-rangement-couteaux", "resto-gants-anti"],
      aFaire: [
        {
          libelle: "Remettre en place le protège-lame de la trancheuse et former à son emploi",
          type: "protection_collective",
          echeanceJours: -6,
          statut: "ouverte",
        },
      ],
    },
    {
      referentielId: "resto-incendie",
      gravite: 4,
      probabilite: 2,
      maitrise: 2,
      nombreSalariesExposes: 4,
      description:
        "Friteuse à proximité de la hotte, filtres à dégraisser toutes les semaines, conduit d'extraction ancien.",
      mesuresEnPlace: ["resto-extincteurs", "resto-vanne-gaz"],
      aFaire: [
        {
          libelle: "Faire ramoner le conduit d'extraction de la hotte",
          type: "organisationnelle",
          echeanceJours: 9,
          statut: "ouverte",
          responsable: "Gérant",
        },
      ],
    },
    {
      referentielId: "resto-rps-coup-feu",
      gravite: 3,
      probabilite: 3,
      maitrise: 2,
      nombreSalariesExposes: 6,
      mesuresEnPlace: ["resto-pauses"],
    },
  ],

  "service-salle": [
    {
      referentielId: "resto-chute-plain-pied",
      gravite: 2,
      probabilite: 4,
      maitrise: 3,
      nombreSalariesExposes: 3,
      description:
        "Sol carrelé lisse en salle, nettoyage en service sans signalisation, seuil de terrasse.",
      mesuresEnPlace: ["resto-nettoyage-rapide", "resto-chaussures-anti"],
      aFaire: [
        {
          libelle: "Acquérir des panneaux « sol glissant » pour la salle et la terrasse",
          type: "organisationnelle",
          echeanceJours: 15,
          statut: "ouverte",
        },
      ],
    },
    {
      referentielId: "resto-bruit",
      gravite: 1,
      probabilite: 3,
      maitrise: 2,
      nombreSalariesExposes: 3,
      mesuresEnPlace: ["resto-bruit-musique"],
    },
  ],

  plonge: [
    {
      referentielId: "resto-chimique",
      gravite: 3,
      probabilite: 2,
      maitrise: 2,
      nombreSalariesExposes: 2,
      description:
        "Dégraissants et produits de lave-vaisselle stockés sous l'évier, transvasements occasionnels.",
      mesuresEnPlace: ["resto-gants-chim"],
      aFaire: [
        {
          libelle: "Rassembler les fiches de données de sécurité et les afficher en plonge",
          type: "formation",
          echeanceJours: -31,
          statut: "ouverte",
          responsable: "Gérant",
        },
        {
          libelle: "Poser une armoire fermée pour les produits lessiviels",
          type: "protection_collective",
          echeanceJours: 45,
          statut: "ouverte",
        },
      ],
    },
    {
      referentielId: "resto-electrisation",
      gravite: 4,
      probabilite: 1,
      maitrise: 3,
      nombreSalariesExposes: 2,
      mesuresEnPlace: ["resto-debranchement"],
    },
  ],
};

/**
 * Réponses aux questions d'activités hors couverture du référentiel (ADR-020).
 * Elles sont figées dans la version validée : un silence n'y devient jamais un
 * « non », donc on répond explicitement aux trois.
 */
const ACTIVITES: Record<string, boolean> = {
  "resto-fabrication-boulangere": false,
  "resto-caisse-espece-fermeture": true,
  "resto-repas-hors-site": false,
};

// ===========================================================================
// 5. Prestataires — trois états de vigilance : à jour, bientôt, expiré.
// ===========================================================================

const PRESTATAIRES = [
  {
    raisonSociale: "Vérif Élec Atlantique",
    siret: "51288741900034",
    domaines: ["electricite", "bureau_controle"] as const,
    estOrganismeAgree: true,
    contactNom: "M. Lopez",
    contactEmail: "contact@verif-elec-atlantique.fr",
    contactTelephone: "02 40 12 34 56",
    urssafJours: 214, // à jour
    rcProJours: 168,
    kbisJours: -320,
  },
  {
    raisonSociale: "Sécurité Incendie Ouest",
    siret: "44902213700018",
    domaines: ["incendie"] as const,
    estOrganismeAgree: false,
    contactNom: "Mme Robin",
    contactEmail: "sav@securite-incendie-ouest.fr",
    contactTelephone: "02 51 88 40 12",
    urssafJours: 17, // expire bientôt — seuil d'alerte à 30 jours
    rcProJours: 96,
    kbisJours: -180,
  },
  {
    raisonSociale: "Froid & Ventilation Loire",
    siret: "80311204500021",
    domaines: ["froid", "ventilation_vmc", "cuisson_hotte"] as const,
    estOrganismeAgree: false,
    contactNom: "M. Diallo",
    contactEmail: "interventions@froid-ventilation-loire.fr",
    contactTelephone: "02 40 76 55 09",
    urssafJours: -23, // expirée
    rcProJours: 41,
    kbisJours: -95,
  },
];

// ===========================================================================
// Résolution du compte Supabase.
// ===========================================================================

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const OU_TROUVER_L_UUID = [
  "  · dans une base où vous avez déjà un dossier, il y est déjà écrit :",
  "      docker exec duerp-db psql -U duerp -d <votre_base> \\",
  "        -c 'SELECT \"userId\", \"raisonSociale\" FROM \"Entreprise\" WHERE \"userId\" IS NOT NULL;'",
  "  · dans la console Supabase : Authentication → Users, colonne UID ;",
  "  · dans le JWT de session de l'application connectée, champ `sub`.",
].join("\n");

/**
 * L'UUID Supabase du compte auquel rattacher le dossier — obligatoire.
 *
 * Il n'y a pas de valeur par défaut, et surtout pas `null` : un dossier créé
 * sous un identifiant que personne ne détient n'est visible d'aucun écran (les
 * helpers de `lib/auth/scope.ts` bornent tous par `entreprise.userId`) tout en
 * ayant l'air d'avoir réussi. Le script s'arrête plutôt que de le produire.
 */
/**
 * `--zone-unique` replie le dossier sur une seule zone.
 *
 * POURQUOI CETTE OPTION EXISTE. Le dossier de démonstration porte trois zones
 * parce qu'un restaurant en a trois, et parce que la répartition par zone est
 * ce qui rend la plaque du tableau de bord lisible. Mais un dossier qui sert à
 * MONTRER le produit n'a pas toujours besoin de cette richesse : trois zones
 * font trois volumes à expliquer avant d'arriver au sujet.
 *
 * Repliée, la zone principale reçoit tous les équipements — leur `zone` est
 * réécrite, jamais ignorée : un équipement sans zone ne s'afficherait nulle
 * part, ce qui est exactement le défaut qu'on passe ses journées à traquer.
 */
/**
 * `--second-etablissement` rattache le dossier à une entreprise EXISTANTE au
 * lieu d'en créer une.
 *
 * POURQUOI CE N'EST PAS UN CONTOURNEMENT DU REFUS. Le refus sur base non vide
 * protège d'un empilement SILENCIEUX : relancer le script par mégarde ajoutait
 * un dossier sans le dire. Ici, l'intention est nommée sur la ligne de
 * commande, et l'entreprise d'accueil est désignée : rien n'est deviné.
 *
 * ET SURTOUT, LE MODÈLE L'EXIGE. `Entreprise.userId` est `@unique` — un
 * utilisateur a UNE entreprise et autant d'établissements qu'il en tient
 * (ADR-028). Créer une seconde entreprise sous le même compte violerait la
 * contrainte ; le second dossier doit donc être un second ÉTABLISSEMENT de
 * l'entreprise déjà là. C'est aussi ce qui fait apparaître le sélecteur de la
 * barre haute, qui ne se montre qu'à partir de deux.
 */
function lireEntrepriseHote(argv: string[]): string | null {
  const i = argv.indexOf("--second-etablissement");
  if (i === -1) return null;
  const valeur = argv[i + 1];
  if (valeur === undefined || valeur.startsWith("--")) {
    throw new Error(
      "--second-etablissement <id> attend l'identifiant de l'entreprise\n" +
        "d'accueil. Pour le trouver :\n" +
        '  select id, "raisonSociale", "userId" from "Entreprise";',
    );
  }
  return valeur;
}

function lireZoneUnique(argv: string[]): boolean {
  return argv.includes("--zone-unique");
}

function lireUserId(argv: string[]): string {
  const i = argv.indexOf("--user");
  const valeur = i === -1 ? undefined : argv[i + 1];

  if (valeur === undefined || valeur.startsWith("--")) {
    throw new Error(
      "--user <uuid> est obligatoire : le dossier doit appartenir à un compte\n" +
        "Supabase existant, sans quoi aucun écran ne s'ouvrira dessus (ADR-005 —\n" +
        "l'auth ne vit pas en base, `Entreprise.userId` est le seul lien).\n" +
        "Où trouver cet identifiant :\n" +
        OU_TROUVER_L_UUID,
    );
  }

  if (!UUID.test(valeur)) {
    throw new Error(
      `« ${valeur} » n'est pas un UUID. \`Entreprise.userId\` porte l'identifiant\n` +
        "de `auth.users`, typé `uuid` en base : une chaîne libre y sera refusée par\n" +
        "Postgres, et un identifiant approximatif ne correspondrait à aucun compte.\n" +
        "Où trouver le bon :\n" +
        OU_TROUVER_L_UUID,
    );
  }

  return valeur;
}

// ===========================================================================
// Le seed proprement dit.
// ===========================================================================

async function main(): Promise<void> {
  const userId = lireUserId(process.argv.slice(2));
  const zoneUnique = lireZoneUnique(process.argv.slice(2));
  const entrepriseHote = lireEntrepriseHote(process.argv.slice(2));

  // Refus explicite sur base non vide — cf. l'en-tête. Le compte des
  // entreprises suffit : elles sont la racine de tenancy (ADR-005), tout le
  // reste en dépend par cascade.
  const dejaLa = await prisma.entreprise.count();
  if (dejaLa > 0 && entrepriseHote === null) {
    console.error(
      `REFUS : la base porte déjà ${dejaLa} entreprise(s).\n` +
        "Ce script CRÉE un dossier, il n'en complète aucun — le relancer ici\n" +
        "empilerait un second dossier sans le dire. Repartez d'une base neuve :\n" +
        '  docker exec duerp-db psql -U duerp -d postgres -c "CREATE DATABASE duerp_demo OWNER duerp;"\n' +
        "  (pointez DATABASE_URL / DIRECT_URL dessus) puis npx prisma migrate deploy",
    );
    process.exitCode = 1;
    return;
  }

  console.log("Création du dossier…\n");

  // -------------------------------------------------------------------------
  // 1. Entreprise + établissement + zones (ADR-001, ADR-004, ADR-029).
  // -------------------------------------------------------------------------
  const entreprise = entrepriseHote
    ? await prisma.entreprise.findUniqueOrThrow({ where: { id: entrepriseHote } })
    : await prisma.entreprise.create({
    data: {
      userId,
      raisonSociale: ENTREPRISE.raisonSociale,
      siret: ENTREPRISE.siret,
      codeNaf: ENTREPRISE.codeNaf,
      effectif: ENTREPRISE.effectif,
      adresse: ENTREPRISE.adresse,
    },
      });

  // Un second établissement porte son PROPRE nom et sa propre adresse. Deux
  // dossiers homonymes rendraient le sélecteur de la barre haute illisible —
  // il n'affiche que `raisonDisplay` —, et son slug public entrerait en
  // collision avec celui du premier, `slugPublic` étant unique.
  const nomDuDossier = entrepriseHote
    ? "Le Comptoir des Halles — Quai Nord"
    : ENTREPRISE.raisonSociale;
  const adresseDuDossier = entrepriseHote
    ? "3 quai Nord, 44000 Nantes"
    : ENTREPRISE.adresse;

  const etablissement = await prisma.etablissement.create({
    data: {
      entrepriseId: entreprise.id,
      raisonDisplay: nomDuDossier,
      adresse: adresseDuDossier,
      codeNaf: ENTREPRISE.codeNaf,
      effectifSurSite: ENTREPRISE.effectif,

      // Régimes cumulables (ADR-004) : établissement de travail ET ERP.
      estEtablissementTravail: true,
      estERP: true,
      estIGH: false,
      estHabitation: false,
      typeErp: "N", // Restaurants et débits de boissons
      categorieErp: "N5",
      classeIgh: null,
      // Pas d'habitation déclarée : la famille reste `null`, ce qui est sa
      // valeur juste. Un enum posé « pour remplir » inventerait un régime.
      familleHabitation: null,

      // Champ d'application de R. 4227-34 CT — « plus de cinquante personnes
      // occupées ou réunies habituellement », public compris. 92 = 84 couverts
      // en service plein + l'équipe. C'est ce nombre, et non `effectifSurSite`,
      // qui fait naître l'alarme sonore puis les exercices semestriels.
      personnesPresentesHabituellement: 92,
      manipuleMatieresR422722: false,
      // Un restaurant sans hébergement : réponse donnée, pas silence.
      comporteLocauxSommeilPublic: false,

      natureActivite: "Restauration traditionnelle — service midi et soir, 84 couverts",
      effectifPublicAdmis: 84,
      dateAutorisationOuverture: jour("2015-07-02"),
      dateCertificatConformite: jour("2015-06-24"),

      epiPresents: true,
      epiPresentsDetail:
        "Chaussures de sécurité antidérapantes, gants anti-coupure, gants de manutention chaude, gants chimiques pour la plonge.",
      aDemandesAssureur: true,

      batiments: {
        create: (zoneUnique ? [ZONES[0]] : ZONES).map((z) => ({
          nom: z.nom,
          complementAdresse: z.complementAdresse,
          ordre: z.ordre,
        })),
      },
    },
    include: { batiments: true },
  });

  const zoneParNom = new Map(etablissement.batiments.map((b) => [b.nom, b.id]));
  console.log(
    `  entreprise « ${entreprise.raisonSociale} » et son établissement, ${etablissement.batiments.length} zones`,
  );

  // -------------------------------------------------------------------------
  // 2. Équipements.
  // -------------------------------------------------------------------------
  const equipementParLibelle = new Map<string, string>();
  for (const e of EQUIPEMENTS) {
    const batimentId = zoneParNom.get(
      zoneUnique ? NOM_BATIMENT_PRINCIPAL : e.zone,
    );
    if (!batimentId) throw new Error(`Zone inconnue : ${e.zone}`);

    // Passage par le schéma du produit : c'est lui qui refuse une propriété
    // posée sur une catégorie qui ne la porte pas.
    const valide = equipementSchema.parse({
      libelle: e.libelle,
      categorie: e.categorie,
      localisation: e.localisation,
      dateMiseEnService: e.dateMiseEnService,
      ...(e.champs ?? {}),
    });

    const cree = await prisma.equipement.create({
      data: {
        etablissementId: etablissement.id,
        batimentId,
        categorie: e.categorie,
        libelle: e.libelle,
        localisation: e.localisation,
        dateMiseEnService: valide.dateMiseEnService,
        caracteristiques:
          (serialiserCaracteristiques(valide) as Prisma.InputJsonValue) ??
          Prisma.DbNull,
      },
      select: { id: true },
    });
    equipementParLibelle.set(e.libelle, cree.id);
  }
  console.log(`  ${EQUIPEMENTS.length} équipements sur 8 domaines`);

  // -------------------------------------------------------------------------
  // 3. Équipe et titres (ADR-023).
  // -------------------------------------------------------------------------
  let nbTitres = 0;
  for (const s of EQUIPE) {
    await prisma.salarie.create({
      data: {
        etablissementId: etablissement.id,
        nom: s.nom,
        prenom: s.prenom,
        poste: s.poste,
        entreLe: jour(s.entreLe),
        actif: s.actif ?? true,
        titres: {
          create: s.titres.map((t) => {
            if (!obligationParId(t.obligationId)) {
              throw new Error(
                `Titre « ${t.obligationId} » absent du référentiel : le seed est périmé.`,
              );
            }
            nbTitres += 1;
            return {
              obligationId: t.obligationId,
              delivreLe: jour(t.delivreLe),
              echeanceLe: t.echeanceJours === null ? null : jours(t.echeanceJours),
              note: t.note,
            };
          }),
        },
      },
    });
  }
  console.log(`  ${EQUIPE.length} salariés (dont 1 sorti de l'effectif), ${nbTitres} titres`);

  // -------------------------------------------------------------------------
  // 4. DUERP : unités du secteur, risques cotés, mesures, version validée.
  // -------------------------------------------------------------------------
  const duerp = await prisma.duerp.create({
    data: {
      etablissementId: etablissement.id,
      referentielSecteurId: restauration.id,
      transversesRepondues: true,
      reponsesActivitesNonCouvertes: ACTIVITES as Prisma.InputJsonValue,
      unites: {
        create: [
          // L'unité transverse naît avec le DUERP et ne compte pas dans les
          // cinq places de l'ADR-033.
          {
            nom: "Risques transverses",
            description:
              "Risques transverses à l'entreprise (routier, RPS, TMS, écrans). Gérés via les questions détecteurs.",
            estTransverse: true,
          },
          ...restauration.unitesTravailSuggerees.map((u) => ({
            nom: u.nom,
            description: u.description,
            referentielUniteId: u.id,
          })),
        ],
      },
    },
    include: { unites: true },
  });

  const uniteParRef = new Map(
    duerp.unites
      .filter((u) => u.referentielUniteId !== null)
      .map((u) => [u.referentielUniteId as string, u.id]),
  );

  const risquesParReferentiel = new Map(restauration.risques.map((r) => [r.id, r]));
  let nbRisques = 0;
  let nbActionsDuerp = 0;

  for (const [refUnite, risques] of Object.entries(DUERP)) {
    const uniteId = uniteParRef.get(refUnite);
    if (!uniteId) throw new Error(`Unité de référentiel inconnue : ${refUnite}`);

    for (const r of risques) {
      const ref = risquesParReferentiel.get(r.referentielId);
      if (!ref) {
        throw new Error(
          `Risque « ${r.referentielId} » absent du référentiel restauration : le seed est périmé.`,
        );
      }

      const risque = await prisma.risque.create({
        data: {
          uniteId,
          referentielId: r.referentielId,
          libelle: ref.libelle,
          description: r.description ?? ref.description,
          gravite: r.gravite,
          probabilite: r.probabilite,
          maitrise: r.maitrise,
          criticite: calculerCriticite(r),
          cotationSaisie: true,
          nombreSalariesExposes: r.nombreSalariesExposes,
        },
        select: { id: true, criticite: true },
      });
      nbRisques += 1;

      // Mesures du référentiel cochées « déjà en place » — l'écran des mesures
      // les crée en `levee` avec une date de levée (cf. `toggleMesureReferentiel`).
      for (const mesureId of r.mesuresEnPlace) {
        const mesure = ref.mesuresRecommandees.find((m) => m.id === mesureId);
        if (!mesure) {
          throw new Error(
            `Mesure « ${mesureId} » absente du risque « ${r.referentielId} » : le seed est périmé.`,
          );
        }
        await prisma.action.create({
          data: {
            etablissementId: etablissement.id,
            risqueId: risque.id,
            referentielMesureId: mesureId,
            libelle: mesure.libelle,
            type: mesure.type as TypeAction,
            statut: "levee",
            // Pas de `criticite` — et surtout pas `risque.criticite`, qui est
            // sur l'échelle [1, 16] du DUERP quand `Action.criticite` est sur
            // celle de l'écart, [1, 5]. Le seed a recopié l'une dans l'autre
            // jusqu'au 2026-09-04, et la fiche de l'action affichait « 6 sur 5 »
            // avec cinq points pleins. Le code de production ne remplit ce
            // champ que depuis un écart de vérification
            // (`actionVerificationSchema`) ; une mesure du wizard le laisse
            // vide (`toggleMesureReferentiel`, `ajouterMesureCustom`), et le
            // seed doit produire ce que l'application produit.
            leveeLe: jours(-120),
            leveeCommentaire: "Constatée en place lors de l'évaluation.",
          },
        });
        nbActionsDuerp += 1;
      }

      // Mesures encore à faire — actions ouvertes rattachées au risque (XOR de
      // l'ADR-002 : origine risque, jamais vérification).
      for (const a of r.aFaire ?? []) {
        await prisma.action.create({
          data: {
            etablissementId: etablissement.id,
            risqueId: risque.id,
            libelle: a.libelle,
            type: a.type,
            statut: a.statut,
            // Même raison qu'au bloc précédent : l'échelle du risque n'est pas
            // celle de l'action.
            echeance: a.echeanceJours === null ? null : jours(a.echeanceJours),
            responsable: a.responsable,
          },
        });
        nbActionsDuerp += 1;
      }
    }
  }
  console.log(
    `  DUERP : ${duerp.unites.length} unités, ${nbRisques} risques cotés, ${nbActionsDuerp} mesures`,
  );

  // Version validée. Le snapshot est construit ici plutôt qu'appelé :
  // `construireSnapshot` commence par `requireUser()`, qui lit les cookies
  // Supabase et n'a pas de sens hors d'une requête. La forme, elle, est celle
  // de `DuerpSnapshot` — c'est le type qui tient le contrat, pas la fonction.
  const pourSnapshot = await prisma.uniteTravail.findMany({
    where: { duerpId: duerp.id },
    orderBy: { nom: "asc" },
    include: {
      risques: { orderBy: { libelle: "asc" }, include: { actions: true } },
    },
  });

  const unitesSnap: UniteSnapshot[] = pourSnapshot.map((u) => ({
    id: u.id,
    nom: u.nom,
    description: u.description,
    estTransverse: u.estTransverse,
    referentielUniteId: u.referentielUniteId,
    aucunRisqueJustif: u.aucunRisqueJustif,
    risques: u.risques.map((r) => ({
      id: r.id,
      referentielId: r.referentielId,
      libelle: r.libelle,
      description: r.description,
      gravite: r.gravite,
      probabilite: r.probabilite,
      maitrise: r.maitrise,
      criticite: r.criticite,
      cotationSaisie: r.cotationSaisie,
      nombreSalariesExposes: r.nombreSalariesExposes,
      dateMesuresPhysiques: r.dateMesuresPhysiques
        ? r.dateMesuresPhysiques.toISOString()
        : null,
      exposeCMR: r.exposeCMR,
      mesures: r.actions.map((a) => ({
        id: a.id,
        libelle: a.libelle,
        type: a.type as TypeMesure,
        statut: a.statut === "levee" ? ("existante" as const) : ("prevue" as const),
        echeance: a.echeance ? a.echeance.toISOString() : null,
        responsable: a.responsable,
      })),
    })),
  }));

  const snapshot: DuerpSnapshot = {
    version: 1,
    genereLe: MAINTENANT.toISOString(),
    motif: "Première évaluation — mise à jour annuelle (art. R. 4121-2)",
    referentielSecteurId: restauration.id,
    entreprise: {
      raisonSociale: entreprise.raisonSociale,
      siret: entreprise.siret,
      codeNaf: etablissement.codeNaf ?? entreprise.codeNaf,
      effectif: etablissement.effectifSurSite,
      adresse: etablissement.adresse,
    },
    unites: unitesSnap,
    couverture: figerCouverture(
      restauration.id,
      questionsActivites(restauration.id, ACTIVITES),
    ),
  };

  await prisma.duerpVersion.create({
    data: {
      duerpId: duerp.id,
      numero: 1,
      motif: snapshot.motif,
      snapshot: snapshot as unknown as Prisma.InputJsonValue,
    },
  });
  console.log("  DUERP : version 1 validée");

  // -------------------------------------------------------------------------
  // 5. Prestataires.
  // -------------------------------------------------------------------------
  const prestataireParRaison = new Map<string, string>();
  for (const p of PRESTATAIRES) {
    const cree = await prisma.prestataire.create({
      data: {
        etablissementId: etablissement.id,
        raisonSociale: p.raisonSociale,
        siret: p.siret,
        estOrganismeAgree: p.estOrganismeAgree,
        domaines: [...p.domaines],
        contactNom: p.contactNom,
        contactEmail: p.contactEmail,
        contactTelephone: p.contactTelephone,
        // Dates de validité sans pièce déposée : état plausible (date saisie,
        // document pas encore téléversé) et suffisant pour la vigilance. En
        // fabriquer une clé de fichier pointerait vers un fichier absent.
        attestationUrssafValableJusquA: jours(p.urssafJours),
        assuranceRcProValableJusquA: jours(p.rcProJours),
        kbisDateEmission: jours(p.kbisJours),
      },
      select: { id: true },
    });
    prestataireParRaison.set(p.raisonSociale, cree.id);
  }
  console.log("  3 prestataires — attestations à jour, proche d'expirer, expirée");

  // -------------------------------------------------------------------------
  // 6. Permis de feu, plan de prévention (ADR-019 : rattachés à une zone).
  // -------------------------------------------------------------------------
  await prisma.permisFeu.create({
    data: {
      etablissementId: etablissement.id,
      numero: 1,
      prestataireId: prestataireParRaison.get("Froid & Ventilation Loire"),
      prestataireRaison: "Froid & Ventilation Loire",
      prestataireContact: "M. Diallo",
      prestataireEmail: "interventions@froid-ventilation-loire.fr",
      donneurOrdreNom: "Direction du Comptoir des Halles",
      donneurOrdreFonction: "Gérant",
      dateDebut: jours(8),
      dateFin: jours(8),
      lieu: "Local technique sur cour — raccordement du groupe froid",
      batimentId: zoneParNom.get(zoneUnique ? NOM_BATIMENT_PRINCIPAL : "Terrasse et local technique"),
      naturesTravaux: ["brasage", "meulage"],
      descriptionTravaux:
        "Brasage des liaisons frigorifiques et reprise du support du groupe. Meulage ponctuel sur platine acier.",
      mesuresValidees: [
        "zone-degagee-5m",
        "balisage-zone",
        "extincteurs-proximite",
        "verif-etat-materiel",
        "surveillant-dedie",
        "epi-operateur",
        "surveillance-2h-min",
      ],
      mesuresNotes:
        "Détection incendie du local isolée pendant l'intervention, réactivée à la fin par le gérant.",
      dureeSurveillanceMinutes: 120,
      statut: "attente_signatures",
    },
  });

  await prisma.planPrevention.create({
    data: {
      etablissementId: etablissement.id,
      numero: 1,
      prestataireId: prestataireParRaison.get("Froid & Ventilation Loire"),
      entrepriseExterieureRaison: "Froid & Ventilation Loire",
      entrepriseExterieureSiret: "80311204500021",
      efChefNom: "M. Diallo",
      efChefEmail: "interventions@froid-ventilation-loire.fr",
      efEffectifIntervenant: 2,
      euChefNom: "Direction du Comptoir des Halles",
      euChefFonction: "Gérant",
      dateDebut: jours(8),
      dateFin: jours(12),
      dureeHeuresEstimee: 22,
      lieux: "Local technique sur cour, cuisine, réserve",
      batimentId: zoneParNom.get(zoneUnique ? NOM_BATIMENT_PRINCIPAL : "Terrasse et local technique"),
      naturesTravaux:
        "Remplacement du groupe frigorifique de la chambre froide positive et reprise du réseau d'extraction de la hotte.",
      travauxDangereux: true,
      inspectionDate: jours(2),
      inspectionParticipants:
        "Gérant (entreprise utilisatrice), M. Diallo (entreprise extérieure), cheffe de cuisine.",
      statut: "inspection_faite",
      // Les cinq rubriques du contenu minimal — art. R. 4512-8. Semées parce
      // que ce dossier sert aux passes de contrôle visuel : un plan dont les
      // cinq rubriques sont vides montrerait la carte « non renseignée », pas
      // la carte renseignée, et c'est celle-là qu'on n'a jamais pu regarder.
      adaptationMateriels:
        "Groupe frigorifique livré sur diable à sangles, chariot de manutention de l'établissement mis à disposition et vérifié le 04-02-2026. Chalumeau et bouteilles de l'entreprise extérieure, contrôle visuel des flexibles chaque matin ; entretien du matériel à la charge de l'entreprise extérieure.",
      instructionsTravailleurs:
        "Accueil sécurité du chef d'équipe à l'arrivée. Interdiction d'intervenir en cuisine avant 15 h. Coupure du fluide frigorigène signalée au gérant avant toute reprise de réseau. Évacuation par la cour, point de rassemblement devant le 12 de la rue.",
      organisationSecours:
        "Trousse de secours en cuisine, au-dessus du poste de plonge. Deux sauveteurs secouristes du travail présents en service (la cheffe de cuisine et le second). Téléphone d'alerte au comptoir, plan d'accès pompiers affiché en réserve, accès par la cour laissé libre pendant toute la durée des travaux.",
      participationCroisee:
        "Aucun salarié de l'établissement ne participe aux travaux. Le chef d'équipe de l'entreprise extérieure commande seul son personnel et rend compte au gérant chaque matin avant le service ; le gérant reste seul à décider de l'ouverture ou de la fermeture de la cuisine.",
      phasesDangereuses: {
        create: [
          {
            ordre: 0,
            phase: "Point chaud au chalumeau sur le réseau d'extraction de la hotte",
            moyensPrevention:
              "Permis de feu, dégraissage préalable du conduit, extincteur à eau pulvérisée en poste, surveillance deux heures après l'arrêt.",
          },
          {
            ordre: 1,
            phase: "Manutention du groupe frigorifique dans l'escalier de réserve",
            moyensPrevention:
              "Intervention à deux opérateurs, sangles de portage, palier et couloir dégagés avant la descente.",
          },
          {
            ordre: 2,
            phase: "Manipulation du fluide frigorigène en local technique fermé",
            moyensPrevention:
              "Porte du local maintenue ouverte et ventilation forcée pendant le transfert, détecteur de fuite de l'entreprise extérieure, aucun point chaud simultané.",
          },
        ],
      },
      lignes: {
        create: [
          {
            ordre: 0,
            risque: "Travaux par point chaud à proximité de la hotte empoussiérée de graisses",
            mesureEntrepriseUtilisatrice:
              "Dégraissage du conduit avant intervention, isolement de la détection, extincteur à eau pulvérisée en poste.",
            mesureEntrepriseExterieure:
              "Permis de feu signé, surveillance maintenue deux heures après la fin des travaux.",
          },
          {
            ordre: 1,
            risque: "Co-activité avec le service en cuisine aux heures d'ouverture",
            mesureEntrepriseUtilisatrice:
              "Travaux limités au créneau 15 h – 18 h, cuisine libérée et balisée.",
            mesureEntrepriseExterieure:
              "Aucun stockage de matériel dans les circulations, repli quotidien.",
          },
          {
            ordre: 2,
            risque: "Manutention du groupe frigorifique dans un escalier étroit",
            mesureEntrepriseUtilisatrice: "Dégagement du palier et du couloir de réserve.",
            mesureEntrepriseExterieure:
              "Sangles de portage et intervention à deux opérateurs, gants de manutention.",
          },
        ],
      },
    },
  });
  // UN SECOND PLAN, VOLONTAIREMENT INCOMPLET, ET C'EST LE PLUS UTILE DES DEUX.
  // Le plan ci-dessus a reçu ses cinq rubriques, donc le dossier semé ne montre
  // plus que l'état PLEIN — alors que l'objet même de ce lot est de rendre le
  // manque visible. Ni « N rubriques sur 5 non renseignées » sur la fiche, ni
  // les « NON RENSEIGNÉE » du ZIP n'étaient plus atteignables sans vider des
  // colonnes à la main, ce qu'une passe de contrôle visuel a dû faire.
  //
  // Celui-ci reste en brouillon, avec ses cinq rubriques nulles et ses risques
  // d'interférence renseignés : c'est exactement la forme qu'avait tout plan du
  // produit avant le 2026-09-07, et celle qu'aura tout plan créé sans remplir
  // la nouvelle section.
  await prisma.planPrevention.create({
    data: {
      etablissementId: etablissement.id,
      numero: 2,
      entrepriseExterieureRaison: "Vitrerie des Deux Ponts",
      efChefNom: "Mme Roussel",
      efChefEmail: "contact@vitrerie-deux-ponts.fr",
      efEffectifIntervenant: 1,
      euChefNom: "Direction du Comptoir des Halles",
      euChefFonction: "Gérant",
      dateDebut: jours(20),
      dateFin: jours(21),
      dureeHeuresEstimee: 6,
      lieux: "Vitrine sur rue",
      batimentId: zoneParNom.get(NOM_BATIMENT_PRINCIPAL),
      naturesTravaux:
        "Remplacement d'un vitrage feuilleté de vitrine fissuré, dépose par ventouses depuis le trottoir.",
      travauxDangereux: false,
      statut: "brouillon",
      lignes: {
        create: [
          {
            ordre: 0,
            risque:
              "Circulation des clients sur le trottoir pendant la dépose du vitrage",
            mesureEntrepriseUtilisatrice:
              "Fermeture de la terrasse et balisage du cheminement piéton pendant l'intervention.",
            mesureEntrepriseExterieure:
              "Pose de barrières, manutention à deux opérateurs, ventouses vérifiées.",
          },
        ],
      },
    },
  });

  console.log(
    "  1 permis de feu, 2 plans de prévention (1 complet, 1 sans aucune des cinq rubriques de R. 4512-8)",
  );

  // -------------------------------------------------------------------------
  // 7. Carnet sanitaire — points de relevé et relevés de température.
  // -------------------------------------------------------------------------
  const carnet = await prisma.carnetSanitaire.create({
    data: {
      etablissementId: etablissement.id,
      descriptionReseau:
        "Production d'eau chaude sanitaire par ballon électrique 300 L en local technique, bouclage vers la cuisine et la plonge. Eau froide sur réseau public.",
      pointsReleve: {
        create: [
          {
            nom: "Sortie de production — ballon ECS",
            localisation: "Local technique sur cour",
            batimentId: zoneParNom.get(zoneUnique ? NOM_BATIMENT_PRINCIPAL : "Terrasse et local technique"),
            typeReseau: "ECS",
            seuilMinCelsius: 55,
          },
          {
            nom: "Point le plus éloigné — plonge",
            localisation: "Plonge, mitigeur de l'évier double bac",
            batimentId: zoneParNom.get("Cuisine et réserves"),
            typeReseau: "ECS",
            seuilMinCelsius: 50,
          },
          {
            nom: "Retour de boucle",
            localisation: "Local technique sur cour",
            batimentId: zoneParNom.get(zoneUnique ? NOM_BATIMENT_PRINCIPAL : "Terrasse et local technique"),
            typeReseau: "ECS_BOUCLAGE",
            seuilMinCelsius: 50,
          },
        ],
      },
    },
    include: { pointsReleve: true },
  });

  // Un relevé mensuel sur six mois. Le point le plus éloigné passe deux fois
  // sous son seuil : c'est ce qui donne à l'écran un état non conforme à
  // montrer, et à la conformité un motif d'exister.
  const MESURES: Record<string, number[]> = {
    "Sortie de production — ballon ECS": [61, 60, 62, 59, 61, 60],
    "Point le plus éloigné — plonge": [52, 51, 47, 50, 46, 53],
    "Retour de boucle": [55, 54, 53, 52, 54, 55],
  };
  let nbReleves = 0;
  for (const point of carnet.pointsReleve) {
    const valeurs = MESURES[point.nom] ?? [];
    for (const [i, temperature] of valeurs.entries()) {
      await prisma.releveTemperature.create({
        data: {
          pointReleveId: point.id,
          // i = 0 est le plus ancien : six relevés mensuels jusqu'au mois passé.
          dateReleve: jours(-30 * (valeurs.length - i)),
          temperatureCelsius: temperature,
          conforme: temperature >= point.seuilMinCelsius,
          operateur: "Gérant",
          commentaire:
            temperature < point.seuilMinCelsius
              ? "Sous le seuil — purge du bras mort et contrôle du bouclage demandés."
              : null,
        },
      });
      nbReleves += 1;
    }
  }

  await prisma.analyseLegionelle.create({
    data: {
      carnetId: carnet.id,
      dateAnalyse: jours(-104),
      laboratoire: "Laboratoire départemental de Loire-Atlantique",
      valeurUfcParL: 320,
      conforme: true,
      commentaire:
        "Prélèvement au point le plus éloigné. Résultat inférieur au seuil de 1 000 UFC/L.",
    },
  });
  console.log(
    `  carnet sanitaire : ${carnet.pointsReleve.length} points, ${nbReleves} relevés, 1 analyse`,
  );

  // -------------------------------------------------------------------------
  // 8. Registre d'accessibilité (l'établissement est un ERP).
  // -------------------------------------------------------------------------
  await prisma.registreAccessibilite.create({
    data: {
      etablissementId: etablissement.id,
      // Le slug est calculé comme dans l'app, depuis la raison sociale et le
      // SIRET : l'URL publique est donc reproductible d'une machine à l'autre.
      slugPublic: genererSlug(etablissement.raisonDisplay, entreprise.siret),
      prestationsFournies:
        "Restauration sur place, service en salle et en terrasse couverte, vente à emporter au comptoir.",
      handicapsAccueillis: ["moteur", "visuel", "auditif", "mental"],
      servicesAdaptes:
        "Carte en gros caractères et carte illustrée disponibles au comptoir. Aide au service à table sur demande. Chiens guides admis en salle et en terrasse.",
      conformiteRegime: "conforme_apres_travaux",
      dateConformite: jour("2019-04-26"),
      numeroAttestationAccess: "ATT-ACC-44109-2019",
      personnelForme: true,
      dateDerniereFormation: jour("2024-11-19"),
      organismeFormation: "CCI Nantes Saint-Nazaire",
      effectifForme: 6,
      equipementsAccessibilite:
        "Rampe amovible à l'entrée sur rue (pente 5 %), sanitaire adapté au rez-de-chaussée, boucle à induction magnétique au comptoir, place de stationnement adaptée à 40 m sur voirie.",
      modalitesMaintenance:
        "Vérification mensuelle de la rampe et de la boucle magnétique par le gérant, consignée au registre de sécurité. Contrat d'entretien annuel de la porte automatique du sas.",
      dernierControleMaintenance: jours(-24),
      publie: true,
      publieLe: jours(-24),
    },
  });
  console.log("  registre d'accessibilité renseigné et publié");

  // -------------------------------------------------------------------------
  // 9. Prescription particulière de source assureur (ADR-032).
  //
  // Une demande d'assureur entre comme prescription particulière — même
  // mécanisme, même génération d'échéance — et porte partout où elle s'affiche
  // le marquage « engagement d'assurance, pas une obligation légale ». Aucune
  // référence réglementaire n'y est attachée, et c'est délibéré : une
  // prescription contractuelle ne cite pas d'article.
  // -------------------------------------------------------------------------
  const installationElectrique = equipementParLibelle.get(
    "Installation électrique du restaurant",
  );
  if (!installationElectrique) throw new Error("Installation électrique introuvable.");

  const prescription = await prisma.prescriptionParticuliere.create({
    data: {
      etablissementId: etablissement.id,
      source: "demande_assureur",
      effet: "obligation_sur_mesure",
      reference: "Avenant multirisque professionnelle n° MRP-2026-4417, art. 7",
      autorite: "Assureur de l'établissement",
      dateDocument: jours(-52),
      actif: true,
      libelle: "Thermographie infrarouge du tableau général basse tension",
      description:
        "L'assureur conditionne la garantie incendie à un contrôle thermographique annuel du tableau général, réalisé par un opérateur certifié, rapport à lui transmettre.",
      periodicite: "annuelle",
      realisateurRequis: ["bureau_controle"],
      equipementId: installationElectrique,
    },
  });
  console.log("  1 prescription d'assureur (ADR-032) sur l'installation électrique");

  // -------------------------------------------------------------------------
  // 10. Calendrier de vérifications.
  //
  // Le moteur et le générateur sont appelés ICI parce qu'ils sont purs ;
  // `regenererSansInvalider` ne l'est pas — elle commence par
  // `assertEtablissementOwnership`, qui lit la session Supabase. Sur une base
  // vierge il n'y a rien à réconcilier : l'ensemble des couples applicables EST
  // le plan de création.
  //
  // La régénération au chargement de `/calendrier` (ADR-012) reprendra ces
  // lignes par leur clé `(obligationId, equipementId, salarieId)` et les
  // laissera en l'état — un cycle ouvert conserve sa `datePrevue`.
  // -------------------------------------------------------------------------
  const pourMatching = await prisma.etablissement.findUniqueOrThrow({
    where: { id: etablissement.id },
    include: {
      equipements: { where: { actif: true } },
      prescriptionsParticulieres: { where: { actif: true } },
    },
  });

  const equipementsMatching = pourMatching.equipements.map((eq) => ({
    id: eq.id,
    libelle: eq.libelle,
    categorie: eq.categorie,
    caracteristiques: (eq.caracteristiques ?? null) as Record<string, unknown> | null,
  }));

  const { applicables: obligations, surMesure } = appliquerPrescriptions(
    determineObligationsApplicables(
      projeterEtablissement(pourMatching),
      equipementsMatching,
    ),
    pourMatching.prescriptionsParticulieres,
    equipementsMatching,
    MAINTENANT,
  );

  const misesEnService = new Map<string, Date>();
  for (const eq of pourMatching.equipements) {
    if (eq.dateMiseEnService) misesEnService.set(eq.id, eq.dateMiseEnService);
  }

  const titresBruts = await prisma.titreSalarie.findMany({
    where: { salarie: { etablissementId: etablissement.id, actif: true } },
    select: {
      obligationId: true,
      salarieId: true,
      delivreLe: true,
      echeanceLe: true,
      salarie: { select: { nom: true, prenom: true } },
    },
  });
  const titresSalaries = new Map<string, TitreDeclare[]>();
  for (const t of titresBruts) {
    const liste = titresSalaries.get(t.obligationId) ?? [];
    liste.push({
      salarieId: t.salarieId,
      libelle: `${t.salarie.prenom} ${t.salarie.nom}`.trim(),
      delivreLe: t.delivreLe,
      echeanceLe: t.echeanceLe,
    });
    titresSalaries.set(t.obligationId, liste);
  }

  const aGenerer = [
    ...genererProchainesVerifications(obligations, new Map(), {
      now: MAINTENANT,
      misesEnService,
    }),
    ...genererVerificationsDepuisTitres(titresSalaries, obligationParId, {
      now: MAINTENANT,
    }),
    ...genererVerificationsSurMesure(surMesure, { now: MAINTENANT }),
  ];

  // Les lignes issues d'un titre portent une date qui vient de la pièce
  // détenue par le salarié : elle fait foi et n'est jamais réétalée.
  const surTitre = aGenerer.filter((v) => v.salarieId !== null);
  const aEtaler = aGenerer.filter(
    (v) => v.salarieId === null && v.prescriptionId === null,
  );
  const surPrescription = aGenerer.filter((v) => v.prescriptionId !== null);

  // Étalement. Sans lui, tout ce qui n'a pas de mise en service exploitable
  // atterrit à « à planifier » aujourd'hui : le calendrier montre une colonne
  // et rien d'autre, et un contrôle visuel n'y lit rien. On simule donc la
  // programmation qu'un dirigeant aurait faite — quelques retards échelonnés,
  // une poignée dans les trente jours, le reste sur la fenêtre consultable —
  // EN SAUTANT la bande réservée à l'échéance d'assureur.
  const lignes = repartir(aEtaler.length);

  const operations: Prisma.PrismaPromise<unknown>[] = [];
  for (const [i, v] of aEtaler.entries()) {
    const decalage = lignes[i];
    operations.push(
      prisma.verification.create({
        data: {
          etablissementId: etablissement.id,
          equipementId: v.equipementId,
          salarieId: null,
          obligationId: v.obligationId,
          libelleObligation: v.libelleObligation,
          periodicite: v.periodicite as Periodicite,
          realisateurRequis: v.realisateurRequis as Realisateur[],
          datePrevue: jours(decalage),
          statut: (decalage < 0 ? "depassee" : "planifiee") as StatutVerification,
          prescriptionId: null,
        },
      }),
    );
  }
  for (const v of surTitre) {
    operations.push(
      prisma.verification.create({
        data: {
          etablissementId: etablissement.id,
          equipementId: null,
          salarieId: v.salarieId,
          obligationId: v.obligationId,
          libelleObligation: v.libelleObligation,
          periodicite: v.periodicite as Periodicite,
          realisateurRequis: v.realisateurRequis as Realisateur[],
          datePrevue: v.datePrevue,
          statut: v.statut as StatutVerification,
          prescriptionId: null,
        },
      }),
    );
  }
  // L'échéance d'assureur, SEULE dans sa bande. Le générateur la pose à
  // « aujourd'hui, à planifier » (cf. `genererVerificationsSurMesure`) : elle
  // se retrouverait alors dans la grappe du jour, et sa pastille contractuelle
  // n'aurait plus de carte à elle dans la frise. On lui donne donc un rendez-vous
  // arrêté, à J+160, à 48 jours de toute autre ligne.
  for (const v of surPrescription) {
    operations.push(
      prisma.verification.create({
        data: {
          etablissementId: etablissement.id,
          equipementId: v.equipementId,
          salarieId: null,
          obligationId: v.obligationId,
          libelleObligation: v.libelleObligation,
          periodicite: v.periodicite as Periodicite,
          realisateurRequis: v.realisateurRequis as Realisateur[],
          datePrevue: jours(ASSUREUR_JOUR),
          statut: "planifiee",
          prescriptionId: prescription.id,
        },
      }),
    );
  }

  await prisma.$transaction(operations);
  console.log(
    `  calendrier : ${aEtaler.length} échéances d'équipement et d'établissement, ` +
      `${surTitre.length} de titre, ${surPrescription.length} d'assureur`,
  );

  // -------------------------------------------------------------------------
  // 11. Deux actions issues d'un écart de vérification (ADR-002, branche
  //     `verificationId` du XOR — l'autre branche est déjà servie par le DUERP).
  // -------------------------------------------------------------------------
  const enRetard = await prisma.verification.findMany({
    where: { etablissementId: etablissement.id, statut: "depassee" },
    orderBy: { datePrevue: "asc" },
    select: { id: true, libelleObligation: true },
    take: 2,
  });
  const ECARTS = [
    {
      libelle: "Lever les observations du dernier rapport de vérification",
      description:
        "Deux observations mineures relevées au précédent contrôle, à solder avant la prochaine visite.",
      type: "organisationnelle" as TypeAction,
      echeanceJours: -4,
      criticite: 3,
    },
    {
      libelle: "Reprendre les liaisons équipotentielles signalées en écart",
      description: "Écart relevé sur le tableau divisionnaire de la cuisine.",
      type: "protection_collective" as TypeAction,
      echeanceJours: 27,
      criticite: 4,
    },
  ];
  for (const [i, v] of enRetard.entries()) {
    const g = ECARTS[i];
    if (!g) break;
    await prisma.action.create({
      data: {
        etablissementId: etablissement.id,
        verificationId: v.id,
        libelle: g.libelle,
        description: g.description,
        type: g.type,
        statut: "ouverte",
        criticite: g.criticite,
        echeance: jours(g.echeanceJours),
        responsable: "Gérant",
      },
    });
  }
  console.log(`  ${Math.min(enRetard.length, ECARTS.length)} actions issues d'une vérification`);

  // -------------------------------------------------------------------------
  // Ce qu'il faut savoir en sortant.
  // -------------------------------------------------------------------------
  const totalActions = await prisma.action.count({
    where: { etablissementId: etablissement.id },
  });
  const totalVerifs = await prisma.verification.count({
    where: { etablissementId: etablissement.id },
  });

  console.log(`\nDossier créé — ${totalVerifs} échéances, ${totalActions} actions.`);
  console.log(`  établissement : ${etablissement.id}`);
  console.log(`  ouvrez        : /etablissements/${etablissement.id}`);

  console.log(`  compte        : ${userId} — connectez-vous avec lui, c'est tout.`);
}

/**
 * Répartit `n` échéances sur la fenêtre consultable en SAUTANT la bande
 * réservée à l'échéance d'assureur.
 *
 * Trois familles, parce qu'un calendrier d'une seule couleur ne montre rien :
 * quelques retards échelonnés (la frise défile aussi vers le passé), une
 * poignée dans les trente jours (le seuil « proche » du produit), le reste
 * étalé jusqu'à l'horizon de deux ans.
 */
function repartir(n: number): number[] {
  const RETARDS = [-96, -68, -41, -19, -5];
  const PROCHES = [3, 11, 19, 26];
  const out: number[] = [];

  for (let i = 0; i < n; i += 1) {
    if (i < RETARDS.length) {
      out.push(RETARDS[i]);
      continue;
    }
    if (i < RETARDS.length + PROCHES.length) {
      out.push(PROCHES[i - RETARDS.length]);
      continue;
    }
    const rang = i - RETARDS.length - PROCHES.length;
    const restants = Math.max(1, n - RETARDS.length - PROCHES.length);
    // Fenêtre lointaine amputée de la bande réservée : 34 → 112, puis 208 → 700.
    const AVANT = BANDE_RESERVEE_DEBUT - 34; // 78 jours utiles
    const APRES = 700 - BANDE_RESERVEE_FIN; // 492 jours utiles
    const t = rang / restants; // ∈ [0, 1)
    const position = t * (AVANT + APRES);
    out.push(
      position < AVANT
        ? Math.round(34 + position)
        : Math.round(BANDE_RESERVEE_FIN + (position - AVANT)),
    );
  }
  return out;
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

// Lectures du serveur MCP — **portée explicite, jamais implicite**.
//
// Les queries de l'application (`src/lib/*/queries.ts`) déterminent leur
// portée en appelant `requireUser()`, qui lit la session Supabase dans les
// cookies de la requête Next. Hors du runtime Next — ce qu'est un serveur
// stdio — il n'y a ni requête ni cookies : ces fonctions ne sont pas
// réutilisables telles quelles.
//
// Ce module reprend donc les mêmes clauses `where`, à une substitution près :
// la chaîne remontante `{ etablissement: { entreprise: { userId } } }` est
// remplacée par l'`etablissementId` que le serveur a reçu au démarrage. D'où
// la règle qui traverse le fichier — **chaque fonction prend
// `etablissementId` en premier paramètre, et chaque `where` le porte** : une
// lecture sans portée n'existe pas ici, y compris sur les relations (les
// unités passent par `duerp.etablissementId`, les risques par leur unité).
//
// Cette forme est aussi ce qui rend le passage au serveur distant possible
// sans réécriture : le jour où la portée viendra d'un jeton OAuth plutôt
// que d'une variable d'environnement, seul l'appelant change.
//
// Lecture seule : aucune fonction d'écriture n'a sa place dans ce fichier.

import { trierParCategorie } from "@/lib/equipements/labels";
import type { CategorieEquipement, StatutAction } from "@prisma/client";
import { evaluerEtatDuerp, type EtatDuerp } from "@/lib/dashboard/duerp";
import {
  estActionEnRetard,
  estVerificationAPlanifier,
  estVerificationArchivee,
  estVerificationAVenir,
  estVerificationEnRetard,
  type VerificationDatee,
  joursDeRetard,
  STATUTS_ACTION_OUVERTE,
} from "@/lib/dates/retard";
import { JOURS_HORIZON_PROCHE } from "@/lib/dates";
import { prismaMcp } from "./prisma";
import { estEcheanceContractuelle } from "@/lib/prescriptions/sources";
import { libellePorteurSansNom } from "@/lib/calendrier/labels";

// ---------------------------------------------------------------------
// Fiche établissement
// ---------------------------------------------------------------------

export type FicheEtablissement = NonNullable<
  Awaited<ReturnType<typeof getFicheEtablissement>>
>;

/**
 * Identité de l'établissement et de son entreprise, plus les compteurs qui
 * situent le dossier. `null` si l'identifiant ne correspond à rien — le
 * serveur refuse alors de démarrer plutôt que de servir un dossier vide.
 */
export async function getFicheEtablissement(etablissementId: string) {
  return prismaMcp.etablissement.findUnique({
    where: { id: etablissementId },
    select: {
      raisonDisplay: true,
      adresse: true,
      codeNaf: true,
      effectifSurSite: true,
      estEtablissementTravail: true,
      estERP: true,
      estIGH: true,
      estHabitation: true,
      typeErp: true,
      categorieErp: true,
      entreprise: {
        select: {
          raisonSociale: true,
          siret: true,
          codeNaf: true,
          effectif: true,
          adresse: true,
        },
      },
      _count: {
        select: { equipements: true, verifications: true, actions: true },
      },
    },
  });
}

// ---------------------------------------------------------------------
// État du DUERP
// ---------------------------------------------------------------------

export type RisqueLu = {
  libelle: string;
  criticite: number;
  gravite: number;
  probabilite: number;
  maitrise: number;
  exposeCMR: boolean;
  nbActions: number;
};

export type UniteLue = {
  nom: string;
  estTransverse: boolean;
  risques: RisqueLu[];
};

export type EtatDuerpLu = {
  existe: boolean;
  /** État d'ancienneté calculé par la règle unique du produit. */
  etat: EtatDuerp | null;
  derniereVersionNumero: number | null;
  derniereVersionAu: Date | null;
  effectifEntreprise: number;
  unites: UniteLue[];
};

/**
 * DUERP de l'établissement : unités de travail, risques cotés, et état
 * d'ancienneté.
 *
 * L'ancienneté n'est pas recalculée ici : elle passe par `evaluerEtatDuerp`
 * (`@/lib/dashboard/duerp`), seule lecture de la règle dans le produit — un
 * serveur MCP qui redéfinirait « à jour » dans son coin finirait par
 * contredire le tableau de bord.
 */
export async function getEtatDuerp(
  etablissementId: string,
  now: Date,
): Promise<EtatDuerpLu> {
  const duerp = await prismaMcp.duerp.findFirst({
    where: { etablissementId },
    // `select` de bout en bout, et jamais `include`. `include` rend TOUS les
    // scalaires du modèle qu'il ouvre : ici il ramenait la colonne
    // `DuerpVersion.snapshot`, un JSON qui porte le `responsable` de chaque
    // mesure (`versions/snapshot-builder.ts`). Le formateur n'en lisait que
    // `numero` et `createdAt`, donc rien ne partait vers l'assistant — mais la
    // règle de ce module est que la retenue vit dans la REQUÊTE, pas dans le
    // formateur, et elle vivait dans le formateur.
    //
    // Un blob JSON ne porte aucun jeton `.responsable` dans le source : la
    // garde de `frontiere-medicale.test.ts` ne pouvait pas le voir. C'est
    // pourquoi elle interdit désormais `include` tout court dans `lib/mcp/` —
    // une règle sur la FORME de la requête attrape ce qu'une règle sur les
    // noms de champs ne peut pas atteindre.
    select: {
      versions: {
        orderBy: { numero: "desc" },
        take: 1,
        select: { numero: true, createdAt: true },
      },
      etablissement: {
        select: { entreprise: { select: { effectif: true } } },
      },
      unites: {
        orderBy: { nom: "asc" },
        select: {
          nom: true,
          estTransverse: true,
          risques: {
            orderBy: { criticite: "desc" },
            select: {
              libelle: true,
              criticite: true,
              gravite: true,
              probabilite: true,
              maitrise: true,
              exposeCMR: true,
              _count: { select: { actions: true } },
            },
          },
        },
      },
    },
  });

  const effectifEntreprise = duerp?.etablissement.entreprise.effectif ?? 0;

  if (!duerp) {
    return {
      existe: false,
      etat: null,
      derniereVersionNumero: null,
      derniereVersionAu: null,
      effectifEntreprise,
      unites: [],
    };
  }

  const derniereVersion = duerp.versions[0] ?? null;
  const etat = evaluerEtatDuerp(
    {
      ouvert: true,
      dateDerniereVersion: derniereVersion?.createdAt ?? null,
      effectif: effectifEntreprise,
    },
    now,
  );

  return {
    existe: true,
    etat,
    derniereVersionNumero: derniereVersion?.numero ?? null,
    derniereVersionAu: derniereVersion?.createdAt ?? null,
    effectifEntreprise,
    unites: duerp.unites.map((u) => ({
      nom: u.nom,
      estTransverse: u.estTransverse,
      risques: u.risques.map((r) => ({
        libelle: r.libelle,
        criticite: r.criticite,
        gravite: r.gravite,
        probabilite: r.probabilite,
        maitrise: r.maitrise,
        exposeCMR: r.exposeCMR,
        nbActions: r._count.actions,
      })),
    })),
  };
}

// ---------------------------------------------------------------------
// Plan d'actions
// ---------------------------------------------------------------------

export type OrigineActionLue = "duerp" | "verification" | "libre";

export type ActionLue = {
  libelle: string;
  statut: StatutAction;
  type: string;
  criticite: number | null;
  echeance: Date | null;
  origine: OrigineActionLue;
  /** Ce qui a motivé l'action : libellé du risque ou de la vérification. */
  origineLibelle: string | null;
  enRetard: boolean;
};

export type FiltresActionsMcp = {
  statut?: StatutAction;
  /** Ne garder que les actions encore à traiter (ouverte / en_cours). */
  enCoursSeulement?: boolean;
  /** Ne garder que les actions dont l'échéance est dépassée. */
  enRetardSeulement?: boolean;
  criticiteMin?: number;
};

/**
 * Plan d'actions de l'établissement.
 *
 * `Action.responsable` n'est PAS sélectionné, et c'est délibéré. C'est un
 * champ de texte libre où l'employeur écrit le nom de la personne qui pilote
 * l'action. Le MCP alimente l'assistant que l'utilisateur branche : un nom
 * lu ici part vers un LLM tiers par défaut, sans que personne l'ait demandé —
 * contre le principe fondateur « zéro IA sur le contenu utilisateur ».
 *
 * La retenue est posée dans la REQUÊTE, pas dans le formateur : ce qui n'est
 * pas lu ne peut pas fuir par une sortie qu'on ajouterait plus tard. Aucun
 * texte n'impose ce nom ; `D. 4711-2`, qui exige l'identité du vérificateur,
 * ne vise que les rapports de vérification (docs/rgpd.md § 2.4). Le champ
 * reste rendu dans les documents que l'employeur remet lui-même — PDF du plan
 * d'actions, dossier de conformité, DUERP — où il est l'information.
 *
 * Le retard n'est pas retranscrit en SQL : il est évalué par
 * `estActionEnRetard` (`@/lib/dates/retard`), le prédicat partagé du produit
 * — une échéance du jour même n'est pas en retard, et cette règle-là ne se
 * duplique pas.
 */
export async function listerActions(
  etablissementId: string,
  filtres: FiltresActionsMcp,
  now: Date,
): Promise<ActionLue[]> {
  const actions = await prismaMcp.action.findMany({
    where: {
      etablissementId,
      ...(filtres.statut ? { statut: filtres.statut } : {}),
      ...(!filtres.statut && (filtres.enCoursSeulement || filtres.enRetardSeulement)
        ? { statut: { in: [...STATUTS_ACTION_OUVERTE] as StatutAction[] } }
        : {}),
      ...(filtres.criticiteMin !== undefined
        ? { criticite: { gte: filtres.criticiteMin } }
        : {}),
    },
    select: {
      libelle: true,
      statut: true,
      type: true,
      criticite: true,
      echeance: true,
      risqueId: true,
      verificationId: true,
      risque: { select: { libelle: true } },
      verification: { select: { libelleObligation: true } },
    },
    orderBy: [{ statut: "asc" }, { echeance: "asc" }, { criticite: "desc" }],
  });

  const lues: ActionLue[] = actions.map((a) => ({
    libelle: a.libelle,
    statut: a.statut,
    type: a.type,
    criticite: a.criticite,
    echeance: a.echeance,
    origine: a.risqueId ? "duerp" : a.verificationId ? "verification" : "libre",
    origineLibelle:
      a.risque?.libelle ?? a.verification?.libelleObligation ?? null,
    enRetard: estActionEnRetard(a, now),
  }));

  return filtres.enRetardSeulement ? lues.filter((a) => a.enRetard) : lues;
}

// ---------------------------------------------------------------------
// Équipements et calendrier des vérifications
// ---------------------------------------------------------------------

/**
 * État d'une occurrence, tel que le produit le définit.
 *
 * Les trois prédicats viennent de `@/lib/dates/retard` et sont **disjoints
 * par construction** : une occurrence `a_planifier` dont la date est passée
 * compte comme un retard, jamais comme les deux. Les redéfinir ici ferait
 * diverger le serveur du calendrier et du tableau de bord — c'est
 * exactement le défaut que ce module partagé a supprimé.
 */
export type EtatVerification =
  | "en_retard"
  | "a_planifier"
  | "a_venir"
  | "realisee"
  | "planifiee"
  /**
   * L'obligation ne s'applique plus ; la ligne n'est conservée que pour la
   * preuve qu'elle porte (ADR-012). C'est un FAIT de l'application, pas une
   * qualification juridique — les instructions du serveur l'interdisent — et
   * il fallait le rendre : sans lui, une ligne archivée gelée sur `depassee`
   * était restituée « en retard » à un assistant, qui le répétait au
   * dirigeant sur une obligation éteinte.
   */
  | "ne_s_applique_plus";

function etatDe(v: VerificationDatee, now: Date): EtatVerification {
  // EN PREMIER, avant même le réalisé : une ligne archivée peut porter une
  // réalisation, et « réalisée » laisserait croire qu'elle compte encore.
  if (estVerificationArchivee(v)) return "ne_s_applique_plus";
  if (v.dateRealisee !== null) return "realisee";
  if (estVerificationEnRetard(v, now)) return "en_retard";
  if (estVerificationAPlanifier(v, now)) return "a_planifier";
  if (estVerificationAVenir(v, now, JOURS_HORIZON_PROCHE)) return "a_venir";
  return "planifiee";
}

export type EquipementLu = {
  libelle: string;
  categorie: CategorieEquipement;
  localisation: string | null;
  dateMiseEnService: Date | null;
  actif: boolean;
  verifications: { total: number; enRetard: number; aPlanifier: number };
};

/**
 * Équipements déclarés, avec l'état de leurs vérifications.
 *
 * Les occurrences sont chargées puis comptées en mémoire plutôt qu'agrégées
 * en base : le retard n'est pas une colonne, c'est un prédicat qui compare
 * une date au début du jour civil (ADR-011). Le calculer en SQL demanderait
 * de le réécrire, donc de le dupliquer.
 */
export async function listerEquipements(
  etablissementId: string,
  now: Date,
): Promise<EquipementLu[]> {
  const equipements = trierParCategorie(
    await prismaMcp.equipement.findMany({
    where: { etablissementId },
    // Voir `equipements/labels.ts` : l'ordre des catégories n'est pas celui de
    // l'enum PostgreSQL, il se pose après la lecture.
    orderBy: [{ libelle: "asc" }],
    select: {
      libelle: true,
      categorie: true,
      localisation: true,
      dateMiseEnService: true,
      actif: true,
      verifications: {
        // `libelleObligation` sert le marqueur d'archivage, pas l'affichage :
        // sans lui, `etatDe` lit une ligne éteinte comme une ligne vivante.
        select: {
          statut: true,
          datePrevue: true,
          dateRealisee: true,
          libelleObligation: true,
        },
      },
    },
    }),
  );

  return equipements.map((e) => {
    const etats = e.verifications.map((v) => etatDe(v, now));
    return {
      libelle: e.libelle,
      categorie: e.categorie,
      localisation: e.localisation,
      dateMiseEnService: e.dateMiseEnService,
      actif: e.actif,
      verifications: {
        total: e.verifications.length,
        enRetard: etats.filter((s) => s === "en_retard").length,
        aPlanifier: etats.filter((s) => s === "a_planifier").length,
      },
    };
  });
}

export type VerificationLue = {
  libelleObligation: string;
  /** L'appareil, ou « Tout l'établissement » quand l'échéance est portée par
   *  l'établissement lui-même (ADR-022). */
  equipement: string;
  /** `null` quand l'échéance n'est portée par aucun appareil (ADR-022). */
  categorie: CategorieEquipement | null;
  periodicite: string;
  datePrevue: Date;
  dateRealisee: Date | null;
  statut: string;
  etat: EtatVerification;
  joursRetard: number;
  /**
   * `true` quand la ligne naît d'un engagement contractuel — une demande
   * d'assureur — et non d'un texte (ADR-032).
   *
   * Elle sort du produit vers un assistant, qui ne peut pas deviner la
   * différence : sans ce drapeau, une vérification imposée par un contrat se
   * présente exactement comme une obligation réglementaire, et l'assistant la
   * restituerait comme telle. Le serveur a pour consigne de ne jamais
   * qualifier juridiquement un état ; encore faut-il qu'il lui donne de quoi
   * distinguer.
   *
   * Ce n'est pas une donnée personnelle : c'est la nature d'une échéance.
   * Elle n'élargit pas le `select` minimal au sens RGPD.
   */
  contractuelle: boolean;
};

export type FiltresVerificationsMcp = {
  /** Ne garder que les occurrences en retard. */
  enRetardSeulement?: boolean;
  /** Ne garder que les occurrences dont l'échéance tombe dans N jours. */
  horizonJours?: number;
  /** Filtre texte sur l'équipement ou l'obligation (« extincteur »…). */
  recherche?: string;
};

/**
 * Calendrier réglementaire de l'établissement.
 *
 * Le filtre texte s'applique en mémoire, sur le libellé de l'obligation, le
 * libellé de l'équipement et sa catégorie : c'est ce qui permet de répondre
 * à « où en sont mes extincteurs ? » sans que le client ait à connaître la
 * nomenclature interne des catégories.
 */
export async function listerVerifications(
  etablissementId: string,
  filtres: FiltresVerificationsMcp,
  now: Date,
): Promise<VerificationLue[]> {
  const brutes = await prismaMcp.verification.findMany({
    where: { etablissementId },
    orderBy: { datePrevue: "asc" },
    select: {
      libelleObligation: true,
      periodicite: true,
      datePrevue: true,
      dateRealisee: true,
      statut: true,
      equipement: { select: { libelle: true, categorie: true } },
      // La source de la prescription, et rien d'autre d'elle : de quoi dire
      // qu'une ligne est contractuelle sans faire sortir l'acte lui-même.
      prescription: { select: { source: true } },
      // `salarieId` seul, jamais le nom : cette requête alimente un
      // assistant hors du produit (cf. `libellePorteurSansNom`).
      salarieId: true,
    },
  });

  let lues: VerificationLue[] = brutes.map((v) => ({
    libelleObligation: v.libelleObligation,
    // Une échéance portée par l'établissement (ADR-022) n'a pas d'appareil :
    // l'assistant doit lire « tout l'établissement », pas une chaîne vide qui
    // se lirait comme une donnée manquante. Et une échéance portée par une
    // personne lit « Un salarié » : le nom ne sort pas du produit.
    equipement: libellePorteurSansNom(v),
    categorie: v.equipement?.categorie ?? null,
    periodicite: v.periodicite,
    datePrevue: v.datePrevue,
    dateRealisee: v.dateRealisee,
    statut: v.statut,
    etat: etatDe(v, now),
    joursRetard: v.dateRealisee ? 0 : joursDeRetard(v.datePrevue, now),
    contractuelle: estEcheanceContractuelle(v),
  }));

  if (filtres.recherche) {
    const q = filtres.recherche.toLowerCase();
    lues = lues.filter(
      (v) =>
        v.libelleObligation.toLowerCase().includes(q) ||
        v.equipement.toLowerCase().includes(q) ||
        (v.categorie?.toLowerCase().includes(q.replace(/\s+/g, "_")) ?? false),
    );
  }

  if (filtres.enRetardSeulement) {
    lues = lues.filter((v) => v.etat === "en_retard");
  }

  if (filtres.horizonJours !== undefined) {
    const borne = new Date(now);
    borne.setDate(borne.getDate() + filtres.horizonJours);
    lues = lues.filter((v) => v.dateRealisee === null && v.datePrevue <= borne);
  }

  return lues;
}

/**
 * Nom d'affichage de l'établissement servi.
 *
 * Sert à préfixer chaque réponse d'outil : un client peut avoir plusieurs
 * connecteurs Rojer branchés sur des dossiers différents, avec les mêmes
 * outils et les mêmes noms. Sans ce rappel, rien dans une réponse ne dit
 * quel dossier a répondu — et une réponse juste sur le mauvais dossier se
 * lit comme une réponse fausse.
 */
export async function getNomEtablissement(
  etablissementId: string,
): Promise<string | null> {
  const e = await prismaMcp.etablissement.findUnique({
    where: { id: etablissementId },
    select: { raisonDisplay: true, adresse: true },
  });
  if (!e) return null;
  // La ville suffit à lever l'ambiguïté entre deux établissements
  // homonymes, sans étaler l'adresse complète en tête de chaque réponse.
  const ville = e.adresse.split(",").pop()?.trim().replace(/^\d{5}\s*/, "");
  return ville ? `${e.raisonDisplay} (${ville})` : e.raisonDisplay;
}

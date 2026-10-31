import { requireCompte, type Db } from "@/lib/auth/compte";
import { cache } from "react";
import { prestatairesDuRendu } from "@/lib/prestataires/queries";
import { duerpDuRenduDuCompte } from "@/lib/duerps/queries";
import { carnetDuRendu } from "@/lib/etablissements/modules";
import { STATUTS_PERMIS_FEU_CLOS, STATUTS_PLAN_PREVENTION_CLOS } from "./statuts-operations";
import { JOURS_APRES } from "@/lib/dashboard/frise";
import {
  MOIS_PERIODE_ANNUELLE,
  ajouterJours,
  ajouterMois,
  debutDuJour,
} from "@/lib/dates";
import { estEnRetard } from "@/lib/dates/retard";
import { etatAutreEcheance } from "./etats";
import { eauChaudeSuivieParLeCalendrier } from "@/lib/carnet-sanitaire/suivi-calendrier";
import {
  REGISTRE_DU_STATUT,
  finDuRepliDepot,
  vigilanceUrssaf,
  type ChampsAttestationUrssaf,
  type StatutPiece,
} from "@/lib/prestataires/vigilance";

/**
 * Registre des sources d'échéances du calendrier — cf. ADR-010.
 *
 * Toute échéance datée du produit (hors vérifications périodiques, qui
 * ont leur flux historique dédié) passe par ici : une **source** par
 * module, un format unique `EcheanceCalendrier`, un agrégateur qui ne
 * connaît aucun module. Brancher un futur module (visites médicales,
 * formations…) = écrire sa source + l'ajouter à `SOURCES_ECHEANCES` —
 * le calendrier, les filtres, la légende et la liste suivent seuls,
 * puisqu'ils sont pilotés par la donnée.
 *
 * Les grandes familles, pensées pour un dirigeant non-expert :
 *   - `controle`   — faire vérifier (vérifs périodiques, légionelles) ;
 *   - `travaux`    — « Corrections & réparations » : un écart constaté à
 *     reprendre (actions du DUERP, actions de vérification) ;
 *   - `operations` — « Opérations encadrées » : un chantier daté dont le
 *     préalable est obligatoire (permis de feu, plan de prévention) ;
 *   - `papiers`    — « Documents à renouveler » (DUERP, attestations) ;
 *   - `personnel`  — « Titres du personnel » : l'échéance d'un titre que
 *     détient une personne (ADR-023). Une seule obligation la porte
 *     aujourd'hui — l'attestation médicale quinquennale de
 *     `R. 4544-11-1` — et le libellé de la famille ne promet pas plus.
 *
 * Chaque ligne dit d'où elle sort en toutes lettres (`origine`) —
 * jamais de jargon interne en interface. Les classements par date sont
 * des fonctions pures, testées, à horloge injectée.
 */

export type FamilleEcheance =
  | "controle"
  | "travaux"
  | "operations"
  | "papiers"
  | "personnel";

/**
 * Ce qu'une échéance **est** (ADR-016).
 *
 * La famille regroupe pour filtrer ; le type nomme. `travaux` réunit deux
 * origines d'action — le DUERP et un rapport de vérification — et un
 * dirigeant qui lit « Corrections » ne sait pas laquelle il a sous les yeux.
 * (L'ADR-017 en a sorti les deux qui n'y étaient pas des corrections.)
 */
export type TypeEcheance =
  | "verification"
  | "titre-salarie"
  | "action-duerp"
  | "action-verification"
  | "permis-feu"
  | "plan-prevention"
  | "duerp-maj"
  | "attestation"
  | "legionelles";

/**
 * La famille se **déduit** du type : une source ne la pose plus à la main,
 * donc ne peut plus s'en tromper, ni deux sources se contredire. Ajouter un
 * type sans le rattacher ici ne compile pas.
 */
export const FAMILLE_DE_TYPE: Record<TypeEcheance, FamilleEcheance> = {
  verification: "controle",
  legionelles: "controle",
  // La ligne d'un titre de salarié n'est pas un contrôle d'appareil.
  // Elle vivait pourtant dans `controle` jusqu'ici, faute de type : une
  // attestation médicale se rangeait sous « Vérifications », se filtrait
  // avec les contrôles d'équipement et se comptait avec eux. C'est le
  // rattachement que l'ADR-023 § 7 avait consigné à la dette.
  "titre-salarie": "personnel",
  "action-duerp": "travaux",
  "action-verification": "travaux",
  // Ni des corrections ni des registres : des opérations ponctuelles.
  // Un permis de feu ne répare rien, il autorise un travail par point
  // chaud et impose une surveillance après ; un plan de prévention
  // encadre la venue d'un tiers et impose une inspection commune avant
  // (ADR-017).
  "permis-feu": "operations",
  "plan-prevention": "operations",
  "duerp-maj": "papiers",
  attestation: "papiers",
};

/**
 * Les familles que la rangée de pilules du calendrier propose de filtrer.
 *
 * **Invariant** : toute famille qu'un type peut produire est ici. La liste
 * vit à côté de `FAMILLE_DE_TYPE` — et non dans la page — pour être
 * testable : les deux se sont contredites sans que rien ne le dise.
 * `personnel` n'était rattachée à aucun type, donc exclue du filtre ; les
 * deux manques se compensaient, et corriger l'un sans l'autre aurait rendu
 * des lignes visibles sous « Tout » et introuvables sous toute pilule.
 */
export const FAMILLES_FILTRABLES: FamilleEcheance[] = [
  "controle",
  "travaux",
  "operations",
  "papiers",
  "personnel",
];

/**
 * Les deux natures que porte une ligne de `Verification`.
 *
 * Le modèle en a fondu deux depuis l'ADR-023 : la vérification périodique
 * d'un équipement (ou de l'établissement), et l'échéance d'un titre détenu
 * par une personne. Rien en base ne les distingue sinon le porteur.
 */
export type TypeVerification = Extract<
  TypeEcheance,
  "verification" | "titre-salarie"
>;

/** Les deux, pour ventiler — et pour qu'une troisième ne s'oublie pas. */
export const TYPES_VERIFICATION: readonly TypeVerification[] = [
  "verification",
  "titre-salarie",
];

/**
 * La nature d'une ligne de `Verification`, déduite de son porteur.
 *
 * **`salarieId` et non le porteur de l'obligation** : c'est le fait écrit sur
 * la ligne, et la contrainte `porteur_xor` garantit qu'il n'y en a qu'un
 * (ADR-023 § 3). Passer par le référentiel ferait dépendre l'affichage d'une
 * table que la ligne ne connaît pas — et une obligation retirée rendrait la
 * nature indéterminable sur une ligne pourtant bien là.
 *
 * Le paramètre est REQUIS et nullable, jamais optionnel : un appelant qui
 * oublie `salarieId` dans son `select` doit avoir une erreur de compilation,
 * pas un repli silencieux (même précaution que `libellePorteur`).
 */
export function typeDeVerification(v: {
  salarieId: string | null;
}): TypeVerification {
  // Le test est POSITIF : il faut un identifiant pour conclure au titre. Écrit
  // `=== null ? "verification" : "titre-salarie"`, un `salarieId` absent
  // (`undefined` — un objet de test, un `select` incomplet) rangeait une
  // vérification d'équipement en « Personnel », soit le sens inverse.
  return v.salarieId ? "titre-salarie" : "verification";
}

/**
 * Les familles à proposer en pilules : celles qui portent réellement quelque
 * chose dans le périmètre affiché.
 *
 * Deux sources, parce que les familles viennent de deux flux — les lignes de
 * `Verification`, ventilées par nature, et le registre. Une famille vide
 * n'encombre pas la rangée, et surtout ne mène pas à « Rien ne correspond à
 * ces filtres ».
 *
 * **Aucun cas particulier.** La page portait un `f === "controle" ||` en tête,
 * hérité du temps où le flux des vérifications n'avait pas de ventilation :
 * une fois `parType` disponible, il ne servait plus que le cas où AUCUNE ligne
 * de contrôle n'existe — c'est-à-dire le seul où la pilule ne doit pas
 * s'afficher. Un établissement sans équipement, non-ERP, avec un titre
 * déclaré, se voyait donc proposer « Vérifications » pour tomber sur un écran
 * vide.
 *
 * Extraite de la page pour être testable, comme `FAMILLES_FILTRABLES` :
 * l'assemblage d'un composant serveur n'est couvert par rien dans ce dépôt, et
 * c'est là que les deux défauts de ce lot se sont logés.
 */
export function famillesAvecEcheances(
  parType: Record<TypeVerification, number>,
  autres: readonly { famille: FamilleEcheance }[],
): FamilleEcheance[] {
  const desVerifs = new Set(
    TYPES_VERIFICATION.filter((t) => parType[t] > 0).map(
      (t) => FAMILLE_DE_TYPE[t],
    ),
  );
  return FAMILLES_FILTRABLES.filter(
    (f) => desVerifs.has(f) || autres.some((e) => e.famille === f),
  );
}

export type EcheanceCalendrier = {
  /** Unique inter-modules : préfixé par le module (`action-…`). */
  id: string;
  /** Ce que c'est. La famille en dérive — cf. `FAMILLE_DE_TYPE`. */
  type: TypeEcheance;
  famille: FamilleEcheance;
  libelle: string;
  /** Le **complément** que le type ne dit pas : le libellé de la
   *  vérification dont sort une action, la date d'ouverture d'un permis. Le
   *  mot standard, lui, vient du type (ADR-016). */
  origine: string;
  date: Date;
  /**
   * La fin d'une OPÉRATION (permis de feu, plan de prévention), dont `date`
   * est le début. Une fois l'opération démarrée sans alerte, c'est elle qui
   * reste à tenir : `dateEnJeuAutre` la lit à la place d'un début passé, qui
   * n'est pas un retard (contrôle visuel en production, 2026-09-14). Absente
   * pour les autres sources, dont la date est l'échéance elle-même.
   */
  dateFin?: Date;
  /** Mêmes tons que la grille : dépassé = alerte, sinon ok. */
  tone: "alerte" | "ok";
  /**
   * Rojer ne sait pas dater cette échéance : une date de la pièce n'est pas
   * renseignée (attestation URSSAF « à dater »). Le ton reste `alerte` — un
   * geste est dû, jamais « ok » —, mais UNE DATE ABSENTE N'EST PAS UN RETARD
   * (même règle que `pdf/fait-retards.ts` : « Rojer ne sait pas » n'est pas
   * « pas fait »). Aucun compteur ni libellé « en retard » ne la compte
   * (`repartirRetards`, `repartirSous30j`, la règle annuelle, le pli d'un
   * mois, le filtre « en retard seulement »), et aucune grille ni frise ne la
   * pose sur un jour (`fusionnerEvenements`) : elle reste dans la liste du
   * calendrier, sans date. Même traitement que les vérifications
   * `sansEcheance`.
   */
  sansEcheance?: true;
  href: string;
  /** Où ça se passe (ADR-019). `null` = l'établissement entier : mise à
   *  jour du DUERP, attestation d'un prestataire, action née d'un risque.
   *  Sous un filtre par bâtiment, ces lignes **restent visibles** — les
   *  masquer ferait mentir le calendrier par omission (ADR-010). */
  batiment: BatimentEcheance | null;
};

export type BatimentEcheance = { id: string; nom: string };

/**
 * Applique un filtre par bâtiment à une liste d'échéances. Une échéance
 * sans bâtiment concerne tout l'établissement, donc aussi celui-ci : elle
 * passe. Fonction pure, partagée par le calendrier et le tableau de bord.
 */
export function filtrerParBatiment<T extends { batiment: BatimentEcheance | null }>(
  echeances: T[],
  batimentId: string | undefined,
): T[] {
  if (!batimentId) return echeances;
  return echeances.filter(
    (e) => e.batiment === null || e.batiment.id === batimentId,
  );
}

/** Ce qu'une source reçoit : le périmètre déjà vérifié (ownership), le
 *  client borné au compte (ADR-051) et l'horloge du jour — elle n'a rien
 *  d'autre à savoir. */
type ContexteSource = {
  db: Db;
  etablissementId: string;
  scope: { etablissementId: string };
  /** Pour les seuls modules encore au client brut, qui portent le prédicat
   *  eux-mêmes (`eauChaudeSuivieParLeCalendrier`), et le prédicat que
   *  `duerpDuRenduDuCompte` garde encore. */
  userId: string;
  aujourdhui: Date;
};

type SourceEcheances = (ctx: ContexteSource) => Promise<EcheanceCalendrier[]>;

/** Un an — la mise à jour du DUERP est au moins annuelle (R. 4121-2 CT).
 *  Exprimé en **mois calendaires** : `+ 365 jours` dérive d'un jour à
 *  chaque bissextile traversée et d'une heure à chaque changement
 *  d'heure, ce qui suffit à faire changer de jour une date stockée à
 *  minuit (ADR-011). */
export const MOIS_MAJ_DUERP = MOIS_PERIODE_ANNUELLE;
/** Un an — analyses légionelles ECS (arrêté du 1er février 2010, cité
 *  par le module carnet sanitaire). Même arithmétique calendaire. */
export const MOIS_ANALYSE_LEGIONELLES = MOIS_PERIODE_ANNUELLE;

// ~~`STATUTS_PERMIS_FEU_CLOS` et `STATUTS_PLAN_PREVENTION_CLOS` vivaient ici,
// « miroir exact des `permisOuverts` du tableau de bord ».~~ [2026-10-27, plan
// performance, lot 1 : déplacés dans `statuts-operations.ts`, que les comptages
// de modules lisent aussi — le tableau de bord n'a plus de liste « ouverts » à
// tenir en miroir, il compte le complément.]

/** Le statut lu depuis une donnée non typée (test, snapshot) est une
 *  chaîne : on compare sans forcer l'enum. */
function estClos(statuts: readonly string[], statut: string): boolean {
  return statuts.includes(statut);
}

/** Dépassé au lendemain, pas à la minute : une échéance datée
 *  d'aujourd'hui n'est pas « en retard ». Simple habillage du prédicat
 *  canonique (`estEnRetard`) dans le vocabulaire de tons de la grille —
 *  la règle de retard, elle, n'existe qu'à un seul endroit (ADR-011). */
export function tonPourDate(
  date: Date,
  aujourdhui: Date,
): "alerte" | "ok" {
  return estEnRetard(date, aujourdhui) ? "alerte" : "ok";
}

/* ─── Classements purs (testés) ─────────────────────────────── */

/**
 * Ce qu'une action est, et le complément qui la situe (ADR-002, ADR-016).
 *
 * Le XOR du modèle tranche le type sans colonne nouvelle, et il ne laisse
 * que **deux** cas : une action se rattache à exactement un risque du DUERP
 * ou une vérification, jamais aux deux, jamais à aucun. Une troisième
 * branche « action sans origine » a existé ici ; elle décrivait un état que
 * la contrainte `Action_origine_xor` et `assertOrigineActionValide`
 * interdisent tous deux, et n'a donc jamais pu s'afficher.
 *
 * `libelleObligation` étant non nul en base, son absence signifie
 * exactement « pas de vérification » — donc « rattachée à un risque ». Un
 * second paramètre `duerp` doublait cette information et pouvait la
 * contredire.
 *
 * `origine` ne répète pas le mot porté par le type : elle ne dit que ce
 * qu'il ignore — de quelle vérification l'écart provient. Écrire « Suite au
 * contrôle "X" » dupliquait le marqueur de nature posé juste à côté, et
 * employait « contrôle » au sens réservé à la visite d'un tiers (ADR-015).
 */
export function origineAction(a: {
  verificationLibelle: string | null;
}): { type: TypeEcheance; origine: string } {
  if (a.verificationLibelle) {
    return {
      type: "action-verification",
      // « suite à » et non « suite à la vérification » : les libellés
      // d'obligation commencent presque tous par le mot « Vérification »,
      // et la phrase bégayait.
      origine: `suite à « ${a.verificationLibelle} »`,
    };
  }
  return { type: "action-duerp", origine: "prévue au DUERP" };
}

/** Échéance de mise à jour annuelle du DUERP : dernière version + 1 an.
 *  Sans version validée, il n'y a pas de date — le dossier DUERP a ses
 *  propres invitations, le calendrier ne montre que du daté. */
export function echeanceDuerp({
  etablissementId,
  dateDerniereVersion,
  aujourdhui,
}: {
  etablissementId: string;
  dateDerniereVersion: Date | null;
  aujourdhui: Date;
}): EcheanceCalendrier | null {
  if (!dateDerniereVersion) return null;
  const date = ajouterMois(dateDerniereVersion, MOIS_MAJ_DUERP);
  return {
    id: "duerp-maj",
    type: "duerp-maj",
    famille: FAMILLE_DE_TYPE["duerp-maj"],
    libelle: "Mise à jour annuelle du DUERP",
    origine: "à refaire chaque année",
    date,
    tone: tonPourDate(date, aujourdhui),
    href: `/etablissements/${etablissementId}/duerp`,
    batiment: null,
  };
}

/** Le ton du calendrier pour un statut de pièce : « ok » seulement là où la
 *  fiche ne demande rien ou prévient (registre nul ou « proche »). */
export function tonDuStatutPiece(statut: StatutPiece): "alerte" | "ok" {
  const registre = REGISTRE_DU_STATUT[statut];
  return registre === null || registre === "proche" ? "ok" : "alerte";
}

/** L'entrée de calendrier de l'attestation URSSAF, depuis le statut de la
 *  fiche. `null` : aucune attestation au dossier. */
export function echeanceCalendrierUrssaf(
  p: ChampsAttestationUrssaf,
  aujourdhui: Date,
): { date: Date; tone: "alerte" | "ok"; origine: string; statut: StatutPiece } | null {
  const u = vigilanceUrssaf(p, aujourdhui);
  const tone = tonDuStatutPiece(u.statut);
  switch (u.statut) {
    case "manquante":
      return null;
    case "a_jour":
    case "expire_bientot":
    case "expiree":
      // Ces trois statuts portent toujours une échéance datée.
      return {
        date: u.aRedemanderLe ?? aujourdhui,
        tone,
        origine: "à redemander au prestataire",
        statut: u.statut,
      };
    case "emission_hors_delai":
      return {
        date: p.attestationUrssafRemiseLe ?? aujourdhui,
        tone,
        origine: "à redemander : émise six mois ou plus avant sa remise",
        statut: u.statut,
      };
    case "a_dater_depot_ancien":
      return {
        date: finDuRepliDepot(p),
        tone,
        origine:
          "à redemander : date de remise non renseignée, rien déposé depuis plus de six mois",
        statut: u.statut,
      };
    case "a_dater":
      return {
        date: aujourdhui,
        tone,
        origine:
          u.datesNonRenseignees.length === 2
            ? "dates de remise et d'émission non renseignées"
            : u.datesNonRenseignees[0] === "remise"
              ? "date de remise non renseignée"
              : "date d'émission non renseignée",
        statut: u.statut,
      };
  }
}

/** Échéances des pièces de vigilance d'un prestataire — URSSAF et RC Pro.
 *  Une pièce absente (manquante) n'a pas de place sur un calendrier : c'est
 *  l'alerte vigilance qui la porte.
 *
 *  L'ATTESTATION URSSAF SUIT LE STATUT DE LA FICHE, LU À LA MÊME FONCTION
 *  (`vigilanceUrssaf`) — aucune règle réécrite ici (contre-lecture du
 *  2026-09-27 : le calendrier datait l'attestation par la seule échéance, et
 *  disait « ok » au 1er mars 2027 d'une pièce que la fiche disait « À
 *  redemander »). Le ton suit le registre du statut (`REGISTRE_DU_STATUT`) :
 *  « ok » pour « à jour » et « expire bientôt », « alerte » pour tout le
 *  reste. Le calendrier n'a que ces deux tons : une attestation « à dater »,
 *  ardoise sur la fiche, y est en alerte — jamais « ok ». La date posée :
 *   - échéance datée (à jour, bientôt, expirée) : la remise suivante ou la
 *     validité, la plus proche ;
 *   - émission hors délai : le jour de la remise concernée ;
 *   - rien déposé depuis plus de six mois : la fin de ce repli (au plus tard) ;
 *   - date non renseignée : aujourd'hui, faute de date à poser. */
export function echeancesPrestataire(
  p: ChampsAttestationUrssaf & {
    id: string;
    raisonSociale: string;
    assuranceRcProValableJusquA: Date | null;
  },
  aujourdhui: Date,
  etablissementId: string,
): EcheanceCalendrier[] {
  const href = `/etablissements/${etablissementId}/prestataires/${p.id}`;
  const out: EcheanceCalendrier[] = [];
  const urssaf = echeanceCalendrierUrssaf(p, aujourdhui);
  if (urssaf) {
    out.push({
      id: `prestataire-${p.id}-urssaf`,
      type: "attestation",
      famille: FAMILLE_DE_TYPE.attestation,
      libelle: `Attestation URSSAF — ${p.raisonSociale}`,
      origine: urssaf.origine,
      date: urssaf.date,
      tone: urssaf.tone,
      ...(urssaf.statut === "a_dater" ? { sansEcheance: true as const } : {}),
      href,
      batiment: null,
    });
  }
  if (p.assuranceRcProValableJusquA) {
    out.push({
      id: `prestataire-${p.id}-rcpro`,
      type: "attestation",
      famille: FAMILLE_DE_TYPE.attestation,
      libelle: `Assurance RC Pro — ${p.raisonSociale}`,
      origine: "à redemander au prestataire",
      date: p.assuranceRcProValableJusquA,
      tone: tonPourDate(p.assuranceRcProValableJusquA, aujourdhui),
      href,
      batiment: null,
    });
  }
  return out;
}

/** Un permis de feu non soldé est un travail planifié : il apparaît à sa
 *  date de début. Deux motifs d'alerte, et un seul motif de silence :
 *
 *   - la date de début est passée sans que les travaux soient en cours —
 *     permis resté en brouillon ou en attente de signatures, c'est lui
 *     qu'il faut solder ou annuler ;
 *   - la date de fin est passée et le permis n'est toujours pas soldé —
 *     exactement ce que la matrice « Vos documents » du tableau de bord
 *     compte en « échus non clos ». Sans cette branche, la pastille du
 *     board renvoyait vers un calendrier qui ne montrait rien.
 *
 *  Un permis terminé ou annulé n'alerte jamais, quelles que soient ses
 *  dates. */
export function echeancePermisFeu(
  p: {
    id: string;
    numero: number;
    lieu: string;
    statut: string;
    dateDebut: Date;
    dateFin: Date;
    batiment?: BatimentEcheance | null;
  },
  aujourdhui: Date,
  etablissementId: string,
): EcheanceCalendrier {
  const clos = estClos(STATUTS_PERMIS_FEU_CLOS, p.statut);
  const demarre = p.statut === "en_cours";
  const debutManque = !demarre && estEnRetard(p.dateDebut, aujourdhui);
  const finDepassee = estEnRetard(p.dateFin, aujourdhui);
  return {
    id: `permis-feu-${p.id}`,
    type: "permis-feu",
    famille: FAMILLE_DE_TYPE["permis-feu"],
    libelle: `Permis de feu n°${p.numero} — ${p.lieu}`,
    origine: "travaux par point chaud",
    date: p.dateDebut,
    dateFin: p.dateFin,
    tone: !clos && (debutManque || finDepassee) ? "alerte" : "ok",
    href: `/etablissements/${etablissementId}/permis-feu/${p.id}`,
    batiment: p.batiment ?? null,
  };
}

/** Une opération avec entreprise extérieure apparaît à sa date de début.
 *  Mêmes deux motifs d'alerte que le permis de feu, son module jumeau :
 *
 *   - elle a commencé sans inspection commune préalable — exigence de
 *     l'art. R. 4512-2 ;
 *   - sa date de fin est passée et l'opération n'est ni close ni annulée
 *     (« échue non close » du tableau de bord).
 *
 *  Une opération close ou annulée n'alerte jamais. */
export function echeancePlanPrevention(
  p: {
    id: string;
    numero: number;
    entrepriseExterieureRaison: string;
    statut: string;
    dateDebut: Date;
    dateFin: Date;
    inspectionDate: Date | null;
    batiment?: BatimentEcheance | null;
  },
  aujourdhui: Date,
  etablissementId: string,
): EcheanceCalendrier {
  const clos = estClos(STATUTS_PLAN_PREVENTION_CLOS, p.statut);
  const commenceSansInspection =
    p.inspectionDate === null && estEnRetard(p.dateDebut, aujourdhui);
  const finDepassee = estEnRetard(p.dateFin, aujourdhui);
  return {
    id: `plan-prevention-${p.id}`,
    type: "plan-prevention",
    famille: FAMILLE_DE_TYPE["plan-prevention"],
    libelle: `Plan de prévention n°${p.numero} — ${p.entrepriseExterieureRaison}`,
    origine: "opération avec entreprise extérieure",
    date: p.dateDebut,
    dateFin: p.dateFin,
    tone: !clos && (commenceSansInspection || finDepassee) ? "alerte" : "ok",
    href: `/etablissements/${etablissementId}/plan-prevention/${p.id}`,
    batiment: p.batiment ?? null,
  };
}

/**
 * L'état d'une opération sur les écrans de SON module (liste, carte, fiche),
 * par la même règle que le calendrier : le ton de sa source, puis sa date en
 * jeu (`etatAutreEcheance`). Ces écrans classaient la date de DÉBUT : un permis
 * `en_cours` démarré le 12 y était rose « dépassé » pendant que le calendrier
 * ne le comptait plus en retard (relecture, 2026-09-14). Le lien importe peu
 * ici — seul l'état sert.
 */
export function etatPermisFeu(
  p: Parameters<typeof echeancePermisFeu>[0],
  now: Date,
): ReturnType<typeof etatAutreEcheance> {
  return etatAutreEcheance(echeancePermisFeu(p, now, ""), now);
}

/** Même règle pour un plan de prévention (voir `etatPermisFeu`). */
export function etatPlanPrevention(
  p: Parameters<typeof echeancePlanPrevention>[0],
  now: Date,
): ReturnType<typeof etatAutreEcheance> {
  return etatAutreEcheance(echeancePlanPrevention(p, now, ""), now);
}

/** Prochaine analyse légionelles : dernière analyse + 1 an. Sans
 *  première analyse, pas de date dérivable — la matrice d'obligations
 *  porte l'invitation.
 *
 *  [2026-10-17, sous-lot F] RIEN quand l'établissement a déclaré une
 *  installation `EAU_CHAUDE_COLLECTIVE_DOUCHES_PUBLIC` : le référentiel
 *  porte alors l'analyse annuelle (`ecs-legionelles-analyse-annuelle`), une
 *  ligne par installation, et un second rappel de la même analyse ferait
 *  deux dates pour un acte. Dette : une analyse saisie au carnet ne fait
 *  pas rouler la ligne du référentiel (`docs/dette-chantier-porteur-echeance.md`). */
export function echeanceLegionelles({
  etablissementId,
  dateDerniereAnalyse,
  aujourdhui,
  suivieParLeCalendrier,
}: {
  etablissementId: string;
  dateDerniereAnalyse: Date | null;
  aujourdhui: Date;
  /** Une installation de la catégorie est déclarée (`eauChaudeSuivieParLeCalendrier`). */
  suivieParLeCalendrier: boolean;
}): EcheanceCalendrier | null {
  if (suivieParLeCalendrier) return null;
  if (!dateDerniereAnalyse) return null;
  const date = ajouterMois(dateDerniereAnalyse, MOIS_ANALYSE_LEGIONELLES);
  return {
    id: "legionelles-analyse",
    type: "legionelles",
    famille: FAMILLE_DE_TYPE.legionelles,
    libelle: "Analyse légionelles (eau chaude sanitaire)",
    origine: "carnet sanitaire · rythme annuel",
    date,
    tone: tonPourDate(date, aujourdhui),
    href: `/etablissements/${etablissementId}/carnet-sanitaire`,
    // L'analyse porte sur le réseau, et le carnet est un par établissement
    // (dette assumée, ADR-019).
    batiment: null,
  };
}

/* ─── Les sources (une par module) ──────────────────────────── */

/**
 * Actions correctives ouvertes.
 *
 * **Angle mort assumé** : une action sans échéance n'a pas de jour où se
 * poser — le calendrier ne montre que du daté, et inventer une date
 * serait un mensonge d'affichage. Elle n'est pas perdue pour autant :
 * `compterActions().sansEcheance` (`src/lib/actions/queries.ts`) la
 * dénombre pour que l'interface puisse inviter à la dater, sur le modèle
 * du `nbSansDate` déjà affiché par la grille pour les vérifications à
 * planifier.
 */
const sourceActions: SourceEcheances = async ({
  db,
  scope,
  aujourdhui,
  etablissementId,
}) => {
  const actions = await db.action.findMany({
    where: {
      ...scope,
      statut: { in: ["ouverte", "en_cours"] },
      echeance: { not: null },
    },
    select: {
      id: true,
      libelle: true,
      echeance: true,
      verification: {
        select: {
          libelleObligation: true,
          equipement: {
            select: { batiment: { select: { id: true, nom: true } } },
          },
        },
      },
    },
  });
  return actions.flatMap((a) =>
    a.echeance
      ? [
          {
            id: `action-${a.id}`,
            ...origineAction({
              verificationLibelle: a.verification?.libelleObligation ?? null,
            }),
            famille: "travaux" as const,
            libelle: a.libelle,
            date: a.echeance,
            tone: tonPourDate(a.echeance, aujourdhui),
            href: `/etablissements/${etablissementId}/actions/${a.id}`,
            // Une action de vérification est là où est l'équipement ; une
            // action du DUERP relève d'une unité de travail, qui peut
            // traverser les bâtiments.
            // `?? null` couvre aussi le cas d'une action née d'une
            // vérification portée par l'établissement (ADR-022) : pas
            // d'équipement, donc pas de bâtiment — et une échéance sans
            // bâtiment reste visible sous tous les filtres.
            batiment: a.verification?.equipement?.batiment ?? null,
          },
        ]
      : [],
  );
};

const sourceDuerp: SourceEcheances = async ({
  db,
  userId,
  aujourdhui,
  etablissementId,
}) => {
  // Le DUERP du rendu, le même que celui du tableau de bord : l'échéance
  // « mise à jour annuelle » et l'âge affiché au board portent sur le même
  // document par construction. La sélection déterministe (tri, version par
  // `numero`) vit dans le chargeur ; le propriétaire est celui du périmètre.
  const duerp = await duerpDuRenduDuCompte(db, etablissementId, userId);
  const e = echeanceDuerp({
    etablissementId,
    dateDerniereVersion: duerp?.versions[0]?.createdAt ?? null,
    aujourdhui,
  });
  return e ? [e] : [];
};

const sourcePrestataires: SourceEcheances = async ({
  aujourdhui,
  etablissementId,
}) => {
  // L'annuaire du rendu, partagé (plan performance, lot 1) ; il porte la
  // portée au compte dans sa requête.
  const prestataires = await prestatairesDuRendu(etablissementId);
  return prestataires.flatMap((p) =>
    echeancesPrestataire(p, aujourdhui, etablissementId),
  );
};

const sourcePermisFeu: SourceEcheances = async ({
  db,
  scope,
  aujourdhui,
  etablissementId,
}) => {
  const permis = await db.permisFeu.findMany({
    where: {
      ...scope,
      // Seul le cycle de vie décide de la sortie du calendrier — jamais la
      // date : un permis échu mais non soldé doit rester visible, c'est
      // précisément l'anomalie à traiter.
      statut: { notIn: [...STATUTS_PERMIS_FEU_CLOS] },
    },
    select: {
      id: true,
      numero: true,
      lieu: true,
      statut: true,
      dateDebut: true,
      dateFin: true,
      batiment: { select: { id: true, nom: true } },
    },
  });
  return permis.map((p) => echeancePermisFeu(p, aujourdhui, etablissementId));
};

const sourcePlansPrevention: SourceEcheances = async ({
  db,
  scope,
  aujourdhui,
  etablissementId,
}) => {
  const plans = await db.planPrevention.findMany({
    where: {
      ...scope,
      // Le cycle de vie décide, pas la date — symétriquement au module
      // jumeau (permis de feu). L'ancien filtre `dateFin >= aujourd'hui`
      // faisait disparaître du calendrier les opérations échues et non
      // closes, celles-là mêmes que le tableau de bord compte en « échues
      // non closes » : l'utilisateur cliquait sur la pastille et ne
      // trouvait rien. Il laissait à l'inverse une opération soldée mais
      // datée du mois prochain s'afficher comme travaux à venir.
      statut: { notIn: [...STATUTS_PLAN_PREVENTION_CLOS] },
    },
    select: {
      id: true,
      numero: true,
      entrepriseExterieureRaison: true,
      statut: true,
      dateDebut: true,
      dateFin: true,
      inspectionDate: true,
      batiment: { select: { id: true, nom: true } },
    },
  });
  return plans.map((p) =>
    echeancePlanPrevention(p, aujourdhui, etablissementId),
  );
};

const sourceLegionelles: SourceEcheances = async ({
  userId,
  aujourdhui,
  etablissementId,
}) => {
  // `CarnetSanitaire.etablissementId` est unique : la ligne est
  // déterminée. Le départage des analyses, lui, ne l'est pas — deux
  // analyses peuvent porter la même `dateAnalyse` (deux points de relevé
  // le même jour) : on tranche par ordre d'enregistrement.
  // Le carnet et sa dernière analyse : la lecture que la barre latérale et la
  // matrice partagent (`carnetDuRendu`, plan performance, lot 1).
  const [carnet, suivieParLeCalendrier] = await Promise.all([
    carnetDuRendu(etablissementId),
    eauChaudeSuivieParLeCalendrier({
      etablissementId,
      etablissement: { entreprise: { userId } },
    }),
  ]);
  const e = echeanceLegionelles({
    etablissementId,
    dateDerniereAnalyse: carnet?.analyses[0]?.dateAnalyse ?? null,
    aujourdhui,
    suivieParLeCalendrier,
  });
  return e ? [e] : [];
};

/**
 * Le registre — ADR-010. Un module qui crée des échéances datées DOIT
 * figurer ici (ou dans les exclusions documentées de l'ADR) ; c'est la
 * garantie que le calendrier ne ment pas par omission.
 */
const SOURCES_ECHEANCES: SourceEcheances[] = [
  sourceActions,
  sourceDuerp,
  sourcePrestataires,
  sourcePermisFeu,
  sourcePlansPrevention,
  sourceLegionelles,
];

/**
 * Toutes les échéances datées hors vérifications périodiques, triées par
 * date — l'agrégation du registre, rien d'autre.
 *
 * **Fenêtre** : la même que le flux des vérifications
 * (`listerEvenementsFenetre`, bornée à `JOURS_APRES`). Pas de borne
 * basse — un retard remonte quelle que soit son ancienneté ; borne haute
 * à deux ans, sans quoi une attestation valable jusqu'en 2031 se posait
 * seule sur la frise, dans une période où aucune vérification n'était
 * chargée : l'utilisateur y lisait « rien d'autre à faire » alors que
 * seule la moitié des sources y était représentée.
 */
export async function listerAutresEcheances(
  etablissementId: string,
  aujourdhui: Date = new Date(),
): Promise<EcheanceCalendrier[]> {
  return autresEcheancesDuRendu(etablissementId, aujourdhui.getTime());
}

/**
 * Le corps de `listerAutresEcheances`, mémoïsé par `cache()` sur le rendu
 * (audit Next.js du 2026-10-14, H2) : le tableau de bord le demandait trois
 * fois — barre latérale, état des échéances, frise —, six lectures chaque fois.
 *
 * LA CLÉ EST L'INSTANT EN MILLISECONDES : l'horloge entre dans le résultat (les
 * tons, et des dates — une attestation à redemander « aujourd'hui »), donc deux
 * instants différents ne partagent rien. Les appelants qui veulent partager
 * passent le même, `instantDuRendu()`. Un `Date` ne serait jamais deux fois la
 * même clé : `cache()` compare par identité.
 *
 * Ce registre ne lit AUCUNE ligne du calendrier — actions, DUERP,
 * prestataires, permis, plans, légionelles — et la réparation que font le
 * tableau de bord et le calendrier (`regeneration-sure.ts`) n'écrit que des
 * lignes : le partager avec le layout, rendu en parallèle, ne lit rien de
 * périmé. Le tableau rendu est partagé : un appelant ne le modifie pas.
 */
const autresEcheancesDuRendu = cache(async function autresEcheancesDuRendu(
  etablissementId: string,
  instant: number,
): Promise<EcheanceCalendrier[]> {
  const aujourdhui = new Date(instant);
  const { user, db } = await requireCompte();
  const ctx: ContexteSource = {
    db,
    etablissementId,
    scope: { etablissementId },
    userId: user.id,
    aujourdhui,
  };

  const finFenetre = ajouterJours(debutDuJour(aujourdhui), JOURS_APRES);
  const listes = await Promise.all(SOURCES_ECHEANCES.map((s) => s(ctx)));
  return listes
    .flat()
    .filter((e) => e.date.getTime() <= finFenetre.getTime())
    .sort((a, b) => a.date.getTime() - b.date.getTime());
});

import type { TypeMesure } from "@/lib/referentiels/types";

export type MesureSnapshot = {
  id: string;
  libelle: string;
  type: TypeMesure;
  statut: "existante" | "prevue";
  echeance: string | null; // ISO
  responsable: string | null;
};

export type RisqueSnapshot = {
  id: string;
  referentielId: string | null;
  libelle: string;
  description: string | null;
  gravite: number;
  probabilite: number;
  maitrise: number;
  criticite: number;
  cotationSaisie: boolean;
  /** Nombre de salariés exposés — critère d'appréciation INRS ED 840. */
  nombreSalariesExposes: number | null;
  /** Date des dernières mesures physiques (ISO) — bruit, éclairement, etc. */
  dateMesuresPhysiques: string | null;
  /** Exposition à un agent CMR (R. 4412-59+). */
  exposeCMR: boolean;
  mesures: MesureSnapshot[];
};

export type UniteSnapshot = {
  id: string;
  nom: string;
  description: string | null;
  estTransverse: boolean;
  /**
   * Unité type du référentiel sectoriel dont cette unité est issue, `null`
   * quand aucune ne lui correspond (ajout manuel, import d'un DUERP existant).
   * Le PDF s'en sert pour dire d'où vient l'inventaire d'une unité.
   *
   * Optionnel, et ça n'est pas une facilité : les versions validées avant
   * l'introduction du champ sont conservées 40 ans et relues telles quelles.
   * Chez elles la valeur est absente, pas nulle — et `absent` veut dire « on
   * ne sait pas », surtout pas « hors référentiel ». Cf. `estHorsReferentiel`.
   */
  referentielUniteId?: string | null;
  /**
   * Justification libre saisie par l'employeur lorsqu'une unité a été évaluée
   * et déclarée sans risque significatif (cf. INRS ED 840 — l'évaluation peut
   * légitimement conclure à l'absence de risque significatif si elle est
   * documentée).
   */
  aucunRisqueJustif: string | null;
  risques: RisqueSnapshot[];
};

/**
 * Une activité hors couverture du référentiel sectoriel, et la réponse qui lui
 * a été donnée au moment où la version a été figée (ADR-020).
 *
 * Le libellé et le « ce qui manque » sont **recopiés** dans le snapshot, pas
 * référencés par identifiant : le référentiel est du TypeScript versionné
 * (ADR-003), il sera réécrit, réordonné, complété. Une version relue dans
 * trente ans doit pouvoir citer l'activité déclarée sans dépendre de ce que le
 * code contient ce jour-là. Le snapshot est le document, pas une clé étrangère.
 */
export type ActiviteCouvertureSnapshot = {
  id: string;
  libelle: string;
  cequiManque: string;
  /**
   * D'où vient la limite du référentiel, recopié du référentiel au moment de
   * figer, comme `libelle` et `cequiManque`.
   *
   * **Optionnel, et pour la même raison que `DuerpSnapshot.couverture`** : les
   * versions validées entre l'introduction de la couverture et celle de cette
   * phrase portent bien des activités déclarées, mais pas leur explication.
   * Régénérées, elles doivent rendre exactement le document d'alors — la
   * mention citée sans son pourquoi, jamais un pourquoi reconstruit depuis le
   * référentiel courant, qui aurait changé.
   */
  pourquoi?: string;
  /**
   * `true` = activité déclarée exercée ; `false` = déclarée non exercée ;
   * `null` = question posée, restée sans réponse. Les trois se distinguent
   * jusque dans le document : un silence ne devient jamais un « non ».
   */
  exercee: boolean | null;
};

export type CouvertureSnapshot = {
  /** Le référentiel dont les questions ci-dessous sont issues. */
  referentielSecteurId: string | null;
  /**
   * Les questions telles qu'elles se posaient à la validation. Une liste vide
   * est une information : le secteur retenu ne déclarait alors aucune activité
   * hors couverture, donc rien n'a été demandé.
   */
  activites: ActiviteCouvertureSnapshot[];
};

export type EntrepriseSnapshot = {
  raisonSociale: string;
  siret: string | null;
  codeNaf: string;
  /** Les travailleurs du SITE (`effectifSurSite`), malgré le nom. */
  effectif: number;
  /**
   * L'effectif de l'ENTREPRISE (`Entreprise.effectif`), figé depuis le
   * 2026-09-26 (C37) : le seuil du programme annuel (L. 4121-3-1 III 1°) se
   * compte sur lui. Absent des versions antérieures — le document retombe
   * alors sur `effectif`, ce qu'il lisait déjà.
   */
  effectifEntreprise?: number;
  adresse: string;
};

export type DuerpSnapshot = {
  version: number;
  genereLe: string; // ISO 8601
  motif: string | null;
  /** Identifiant du référentiel sectoriel INRS utilisé pour initialiser le DUERP. */
  referentielSecteurId: string | null;
  entreprise: EntrepriseSnapshot;
  unites: UniteSnapshot[];
  /**
   * État de couverture du dossier au moment où la version a été figée : ce que
   * le dirigeant a déclaré exercer et que le référentiel sectoriel ne couvre
   * pas (ADR-020). Figé une fois pour toutes, jamais recalculé à la relecture
   * — le référentiel aura changé, la déclaration non.
   *
   * Optionnel, et pour la même raison que `UniteSnapshot.referentielUniteId` :
   * les versions validées avant l'introduction du champ sont conservées 40 ans
   * et régénérées telles quelles. Chez elles la valeur est **absente**, ce qui
   * veut dire « la question n'a pas été posée », surtout pas « le référentiel
   * couvrait tout ». Un snapshot muet ne produit donc aucune mention : c'est
   * le contrat, il est vérifié par `snapshot-compat.test.ts`.
   */
  couverture?: CouvertureSnapshot;
};

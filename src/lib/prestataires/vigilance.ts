import type { Prestataire } from "@prisma/client";
import {
  JOURS_ALERTE_EXPIRATION,
  ajouterMois,
  formaterDateLongueFr,
  joursCivilsEntre,
} from "@/lib/dates";
import { estEnRetard } from "@/lib/dates/retard";
import { D8222_5_ANCIENNETE } from "./d8222-5";

/**
 * Calcul de l'état de vigilance d'un prestataire au regard des obligations
 * du donneur d'ordre (art. L. 8222-1 et D. 8222-5 CT).
 *
 * Jalons réglementaires :
 * - Attestation URSSAF : D. 8222-5 (relu sur Légifrance le 2026-09-27, en
 *   vigueur depuis le 01/01/2023) la fait remettre « lors de la conclusion
 *   et tous les six mois jusqu'à la fin de son exécution », et exige au 1°
 *   une attestation « datant de moins de six mois ». Le texte cale le rythme
 *   sur la conclusion du contrat (date absente du modèle) et ne dit pas à
 *   quel instant mesurer l'ancienneté. LECTURE RETENUE par Rojer, pas phrase
 *   du texte : la REMISE, d'où il fait partir la suivante, et l'ÉMISSION,
 *   qu'il compare à la remise (cf.
 *   `echeanceAttestationUrssaf`, `emiseMoinsDeSixMoisAvantRemise`). Elles
 *   sont au modèle depuis le 2026-09-27 (`attestationUrssafRemiseLe`,
 *   `attestationUrssafEmiseLe`).
 * - RC Pro : pas de périodicité légale — la police est contractuelle et
 *   porte sa propre date de fin. Seule cette date est utilisée.
 * - Extrait Kbis : le texte n'assortit pas la pièce d'une périodicité
 *   citable. On expose donc son **âge**, sans en tirer de statut : le
 *   produit informe, il ne décrète pas une non-conformité qu'aucune source
 *   ne fonde (règle n°6 et n°8 du projet).
 *
 * Deux règles de dates, conformes à l'ADR-011 :
 *  1. Les dates de validité sont des **dates civiles** (saisies en
 *     « AAAA-MM-JJ », stockées à minuit UTC). Elles se comparent au jour
 *     civil de Paris, jamais à `Date.now()` brut — sans quoi une
 *     attestation valable « jusqu'au 10/08 » passait « Expirée il y a 1 j »
 *     dès 02:00 le 10 août, et « Expire aujourd'hui » ne s'affichait
 *     jamais le bon jour mais le lendemain.
 *  2. L'horloge est injectée. Le paramètre `now` garde une valeur par
 *     défaut parce que les appelants actuels (annuaire, matrice du
 *     tableau de bord) n'en passent pas encore ; c'est un point de bord à
 *     reprendre, pas une autorisation de lire l'horloge plus bas.
 */

/** Fenêtre d'alerte avant expiration — l'horizon partagé du produit. */
export const SEUIL_ALERTE_JOURS = JOURS_ALERTE_EXPIRATION;

/** « tous les six mois » et « datant de moins de six mois » (art. D. 8222-5). */
export const MOIS_RENOUVELLEMENT_URSSAF = 6;

export { D8222_5_ANCIENNETE, D8222_5_RYTHME } from "./d8222-5";

/**
 * - `a_dater` : une date du texte (remise, émission) n'est pas renseignée,
 *   et rien d'autre ne presse. Jamais « à jour » : sans la remise, rien ne
 *   dit d'où partent les six mois ; sans l'émission, rien ne dit que la
 *   pièce datait de moins de six mois.
 * - `a_dater_depot_ancien` : la remise n'est pas renseignée ET rien n'a été
 *   déposé sur la fiche depuis plus de six mois (cf. `depotAncien`).
 * - `emission_hors_delai` : émise six mois ou plus avant sa remise.
 */
export type StatutPiece =
  | "a_jour"
  | "expire_bientot"
  | "expiree"
  | "manquante"
  | "a_dater"
  | "a_dater_depot_ancien"
  | "emission_hors_delai";

/**
 * Le registre de chaque statut — SOURCE UNIQUE de la couleur d'une pièce et
 * de `etatLePlusGrave`. `null` : rien à faire.
 */
export const REGISTRE_DU_STATUT: Record<
  StatutPiece,
  "enRetard" | "proche" | "aPlanifier" | null
> = {
  a_jour: null,
  expire_bientot: "proche",
  expiree: "enRetard",
  // Une pièce jamais fournie n'est pas en retard : rien n'a d'échéance tant
  // qu'il n'y a pas de document. L'ardoise, comme « à planifier ».
  manquante: "aPlanifier",
  a_dater: "aPlanifier",
  a_dater_depot_ancien: "enRetard",
  emission_hors_delai: "enRetard",
};

export type DateAttestation = "remise" | "emission";

export type VigilanceSnapshot = {
  /** Pièces au registre « en retard » — expirée, ou attestation à
   *  redemander (`a_dater_depot_ancien`, `emission_hors_delai`). Le seul cas
   *  qui justifie le rose. */
  piecesExpirees: number;
  /** Pièces qui expirent dans moins de 30 jours. */
  piecesProches: number;
  /**
   * Pièces jamais fournies, ou attestation dont une date du texte n'est pas
   * renseignée. **Ce n'est pas un retard** : elles portent l'ardoise, comme
   * « à planifier » au calendrier.
   */
  piecesManquantes: number;
  /**
   * L'état à peindre : le plus grave réellement présent, `null` si tout est à
   * jour. **Les écrans lisent celui-ci**, jamais `alertesOuvertes` — qui
   * compte un volume et ne dit rien de la gravité.
   */
  etatLePlusGrave: "enRetard" | "proche" | "aPlanifier" | null;
  urssaf: StatutPiece;
  /** Jours civils jusqu'à `urssafARedemanderLe` — négatif une fois passée. */
  urssafExpireDans: number | null;
  /**
   * La plus proche entre la validité saisie et la remise suivante (remise
   * + six mois). `null` si aucune des deux n'est connue. Ne dépend JAMAIS de
   * `updatedAt`.
   */
  urssafARedemanderLe: Date | null;
  urssafRemiseLe: Date | null;
  urssafEmiseLe: Date | null;
  /** Remise + six mois : « tous les six mois », `null` sans remise. */
  urssafRemiseSuivante: Date | null;
  /** Les dates du texte que la fiche ne porte pas (pièce présente). */
  urssafDatesNonRenseignees: DateAttestation[];
  rcPro: StatutPiece;
  rcProExpireDans: number | null;
  kbis: "present" | "absent";
  /** Date d'émission déclarée de l'extrait, si elle est renseignée. */
  kbisEmisLe: Date | null;
  /** Âge de l'extrait en jours civils — informatif, sans seuil. */
  kbisAgeJours: number | null;
  /** Pièces à durée de validité qui ne sont pas à jour (Kbis exclu). */
  alertesOuvertes: number;
};

/**
 * Statut d'une pièce à partir de sa date de fin de validité.
 *
 * Le décompte est en **jours civils** : « 0 » veut dire « expire
 * aujourd'hui » toute la journée, et le passage à « expirée » se fait au
 * minuit suivant, comme partout ailleurs dans le produit. La division en
 * millisecondes qui servait ici décalait toute l'échelle d'un jour dès que
 * l'heure de Paris était en avance sur UTC, c'est-à-dire toute l'année.
 */
function statutParDate(
  date: Date | null,
  now: Date,
  seuilJours: number,
): { statut: StatutPiece; joursRestants: number | null } {
  if (!date) return { statut: "manquante", joursRestants: null };
  const jours = joursCivilsEntre(now, date);
  if (estEnRetard(date, now)) return { statut: "expiree", joursRestants: jours };
  if (jours <= seuilJours) {
    return { statut: "expire_bientot", joursRestants: jours };
  }
  return { statut: "a_jour", joursRestants: jours };
}

/**
 * La date à laquelle l'attestation est à redemander : la plus proche entre
 * la validité saisie et la remise suivante, « tous les six mois » depuis la
 * dernière remise (D. 8222-5).
 *
 * ~~Comptée depuis `updatedAt`~~ jusqu'au 2026-09-27 (décision B2) : toute
 * écriture sur la fiche — un téléphone, une note — repoussait la limite de
 * six mois sans qu'aucune attestation ait été remise, et l'alerte n'arrivait
 * jamais. La remise est désormais une date saisie ; `updatedAt` n'entre plus
 * dans cette borne, et un test rougit s'il y revient.
 *
 * Lue par `vigilanceUrssaf`, que la fiche et le calendrier partagent.
 *
 * UNE LECTURE, PAS LE TEXTE. D. 8222-5 dit « lors de la conclusion et tous
 * les six mois jusqu'à la fin de son exécution » : la grille qu'il décrit
 * part de la CONCLUSION du contrat, dont la date n'est pas au modèle. Rojer
 * compte six mois depuis la dernière remise saisie. C'est aussi prudent que
 * la grille tant que les remises arrivent à l'heure ou en avance (remise en
 * avance : Rojer redemande plus tôt que la grille) ; ce ne l'est PLUS pour
 * une remise tardive — remise à conclusion + 7 mois, Rojer attend
 * conclusion + 13 mois là où la grille dit + 12 : la grille se décale d'un
 * mois. Signalé à la propriétaire (contre-lecture du 2026-09-27), modèle
 * inchangé.
 */
export function echeanceAttestationUrssaf(p: {
  attestationUrssafValableJusquA: Date | null;
  attestationUrssafRemiseLe: Date | null;
}): Date | null {
  const suivante = p.attestationUrssafRemiseLe
    ? ajouterMois(p.attestationUrssafRemiseLe, MOIS_RENOUVELLEMENT_URSSAF)
    : null;
  const saisie = p.attestationUrssafValableJusquA;
  if (!suivante) return saisie;
  if (!saisie) return suivante;
  return suivante.getTime() < saisie.getTime() ? suivante : saisie;
}

/**
 * L'attestation était-elle « datant de moins de six mois » à sa remise ?
 * `false` si elle a été émise six mois pile ou plus avant la remise — six
 * mois pile n'est pas « moins de six mois ». Comparé en jours civils.
 *
 * UNE LECTURE, PAS LE TEXTE. D. 8222-5 écrit « datant de moins de six mois »
 * sans nommer l'instant où l'on mesure. Rojer mesure à la remise, moment où
 * le donneur d'ordre se la fait remettre. Une lecture plus stricte — moins de
 * six mois à tout instant — ferait redemander à émission + six mois, avant
 * remise + six mois : Rojer ne l'applique pas, et ce n'est donc pas la
 * lecture la plus prudente.
 */
export function emiseMoinsDeSixMoisAvantRemise(
  emiseLe: Date,
  remiseLe: Date,
): boolean {
  return (
    joursCivilsEntre(
      remiseLe,
      ajouterMois(emiseLe, MOIS_RENOUVELLEMENT_URSSAF),
    ) > 0
  );
}

/**
 * LE SEUL EMPLOI QUI RESTE À `updatedAt`, ET IL NE PEUT QU'AGGRAVER.
 *
 * Sans date de remise, le statut est « à dater » (ardoise). Mais `updatedAt`
 * est postérieur à tout dépôt de pièce sur la fiche : s'il date de plus de
 * six mois, la pièce en dossier a été remise il y a plus de six mois, et la
 * remise suivante est passée. Dans ce sens-là la déduction tient, et elle est
 * plus prudente que le vide ; dans l'autre (fiche récente), elle ne prouve
 * rien et n'est pas lue. Une retouche de la fiche peut donc faire repasser
 * du rose à l'ardoise — jamais à « à jour ».
 */
/** Les champs de la fiche que lit le statut de l'attestation — la fiche
 *  et le calendrier passent par la même fonction (`vigilanceUrssaf`). */
export type ChampsAttestationUrssaf = Pick<
  Prestataire,
  | "attestationUrssafCle"
  | "attestationUrssafValableJusquA"
  | "attestationUrssafRemiseLe"
  | "attestationUrssafEmiseLe"
  | "updatedAt"
>;

/** Une attestation est au dossier dès qu'une trace en existe : la pièce,
 *  ou l'une de ses dates. */
export function attestationUrssafPresente(
  p: Omit<ChampsAttestationUrssaf, "updatedAt">,
): boolean {
  return Boolean(
    p.attestationUrssafCle ||
      p.attestationUrssafValableJusquA ||
      p.attestationUrssafRemiseLe ||
      p.attestationUrssafEmiseLe,
  );
}

/** Remise vide : le jour à partir duquel rien n'a été déposé depuis plus de
 *  six mois (lendemain de `updatedAt` + six mois). Au plus tard : la remise
 *  réelle, antérieure à tout dépôt, appelait la suivante plus tôt. */
export function finDuRepliDepot(p: Pick<Prestataire, "updatedAt">): Date {
  return ajouterMois(p.updatedAt, MOIS_RENOUVELLEMENT_URSSAF);
}

function depotAncien(p: Pick<Prestataire, "updatedAt">, now: Date): boolean {
  // Même bascule que l'échéance datée : le lendemain des six mois, pas le jour.
  return estEnRetard(finDuRepliDepot(p), now);
}

/**
 * LE statut de l'attestation URSSAF. La fiche (`computeVigilance`) et le
 * calendrier (`echeancesPrestataire`) le lisent ici tous les deux : aucune
 * des deux surfaces ne réécrit la règle.
 */
export function vigilanceUrssaf(
  p: ChampsAttestationUrssaf,
  now: Date,
): {
  statut: StatutPiece;
  joursRestants: number | null;
  aRedemanderLe: Date | null;
  datesNonRenseignees: DateAttestation[];
} {
  const remise = p.attestationUrssafRemiseLe;
  const emise = p.attestationUrssafEmiseLe;
  const presente = attestationUrssafPresente(p);
  if (!presente) {
    return {
      statut: "manquante",
      joursRestants: null,
      aRedemanderLe: null,
      datesNonRenseignees: [],
    };
  }
  const datesNonRenseignees: DateAttestation[] = [
    ...(remise ? [] : (["remise"] as const)),
    ...(emise ? [] : (["emission"] as const)),
  ];
  const aRedemanderLe = echeanceAttestationUrssaf(p);
  const parDate = aRedemanderLe
    ? statutParDate(aRedemanderLe, now, SEUIL_ALERTE_JOURS)
    : { statut: "a_jour" as StatutPiece, joursRestants: null };
  const base = { joursRestants: parDate.joursRestants, aRedemanderLe, datesNonRenseignees };

  // Du plus grave au moins grave. Une échéance datée passée l'emporte : elle
  // est un fait saisi.
  if (parDate.statut === "expiree") return { statut: "expiree", ...base };
  if (remise && emise && !emiseMoinsDeSixMoisAvantRemise(emise, remise)) {
    return { statut: "emission_hors_delai", ...base };
  }
  if (!remise && depotAncien(p, now)) {
    return { statut: "a_dater_depot_ancien", ...base };
  }
  if (parDate.statut === "expire_bientot") {
    return { statut: "expire_bientot", ...base };
  }
  // Jamais « à jour » tant qu'une date du texte manque.
  if (datesNonRenseignees.length > 0) return { statut: "a_dater", ...base };
  return { statut: "a_jour", ...base };
}

export function computeVigilance(
  prestataire: Prestataire,
  now: Date = new Date(),
): VigilanceSnapshot {
  const u = vigilanceUrssaf(prestataire, now);
  const r = statutParDate(
    prestataire.assuranceRcProValableJusquA,
    now,
    SEUIL_ALERTE_JOURS,
  );
  const kbis: "present" | "absent" = prestataire.kbisCle ? "present" : "absent";

  // Trois comptes, pas un, lus sur le registre de chaque statut. Rien n'a
  // d'échéance tant qu'il n'y a pas de document : une pièce absente n'est
  // pas en retard (charte, interdits 3 et 4).
  const registres = [u.statut, r.statut].map((s) => REGISTRE_DU_STATUT[s]);
  const piecesExpirees = registres.filter((s) => s === "enRetard").length;
  const piecesProches = registres.filter((s) => s === "proche").length;
  const piecesManquantes = registres.filter((s) => s === "aPlanifier").length;

  /** Tout ce qui n'est pas à jour, pour un compteur de volume. Ne sert JAMAIS
   *  à choisir une couleur : c'est `etatLePlusGrave` qui le fait. */
  const alertesOuvertes = piecesExpirees + piecesProches + piecesManquantes;

  const etatLePlusGrave: "enRetard" | "proche" | "aPlanifier" | null =
    piecesExpirees > 0
      ? "enRetard"
      : piecesProches > 0
        ? "proche"
        : piecesManquantes > 0
          ? "aPlanifier"
          : null;

  const remise = prestataire.attestationUrssafRemiseLe;
  return {
    piecesExpirees,
    piecesProches,
    piecesManquantes,
    etatLePlusGrave,
    urssaf: u.statut,
    urssafExpireDans: u.joursRestants,
    urssafARedemanderLe: u.aRedemanderLe,
    urssafRemiseLe: remise,
    urssafEmiseLe: prestataire.attestationUrssafEmiseLe,
    urssafRemiseSuivante: remise
      ? ajouterMois(remise, MOIS_RENOUVELLEMENT_URSSAF)
      : null,
    urssafDatesNonRenseignees: u.datesNonRenseignees,
    rcPro: r.statut,
    rcProExpireDans: r.joursRestants,
    kbis,
    kbisEmisLe: prestataire.kbisDateEmission,
    kbisAgeJours: prestataire.kbisDateEmission
      ? Math.max(0, joursCivilsEntre(prestataire.kbisDateEmission, now))
      : null,
    alertesOuvertes,
  };
}

/**
 * Ce que la pastille URSSAF dit sous son statut : les dates du texte, ou ce
 * qui manque. Une seule rédaction, ici, parce que deux surfaces l'affichent
 * — la carte de l'annuaire et la fiche. Aucune qualification : des dates, et
 * les mots de D. 8222-5 entre guillemets.
 */
export function mentionUrssaf(v: VigilanceSnapshot): string | undefined {
  if (v.urssaf === "manquante") return undefined;
  const d = formaterDateLongueFr;
  const phrases: string[] = [];
  if (v.urssaf === "emission_hors_delai" && v.urssafEmiseLe && v.urssafRemiseLe) {
    phrases.push(
      `Émise le ${d(v.urssafEmiseLe)}, six mois ou plus avant sa remise le ${d(v.urssafRemiseLe)}. L'art. D. 8222-5 veut une attestation « ${D8222_5_ANCIENNETE} » ; Rojer la mesure à la remise.`,
    );
  } else if (v.urssafRemiseLe) {
    phrases.push(
      `Remise le ${d(v.urssafRemiseLe)}${v.urssafEmiseLe ? `, émise le ${d(v.urssafEmiseLe)}` : ""}.`,
    );
  }
  if (v.urssafRemiseSuivante) {
    phrases.push(
      `Remise suivante le ${d(v.urssafRemiseSuivante)} : Rojer compte six mois depuis la dernière remise (art. D. 8222-5 : « tous les six mois »).`,
    );
  }
  const manque = v.urssafDatesNonRenseignees;
  if (manque.length === 2) {
    phrases.push("Dates de remise et d'émission non renseignées.");
  } else if (manque[0] === "remise") {
    phrases.push("Date de remise non renseignée.");
  } else if (manque[0] === "emission") {
    phrases.push("Date d'émission non renseignée.");
  }
  if (v.urssaf === "a_dater_depot_ancien") {
    phrases.push("Rien n'a été déposé sur cette fiche depuis plus de six mois.");
  }
  if (manque.length > 0) {
    phrases.push("À saisir sur la fiche du prestataire.");
  }
  return phrases.join(" ");
}

export function messageExpiration(jours: number | null): string {
  if (jours === null) return "Non renseignée";
  if (jours < 0) return `Expirée il y a ${Math.abs(jours)} j`;
  if (jours === 0) return "Expire aujourd'hui";
  if (jours === 1) return "Expire demain";
  if (jours <= SEUIL_ALERTE_JOURS) return `Expire dans ${jours} j`;
  return `Valide ${jours} j de plus`;
}

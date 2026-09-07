// Le vocabulaire d'état d'une échéance, et les champs qui le portent.
//
// Trois écrans le disent : la règle annuelle (barres), la ligne de la
// liste mensuelle (tuile-date) et la vue par équipement (cases de mois).
// Chacun l'avait redéclaré avec sa propre table de couleurs — trois
// copies d'une même règle, qui dérivent au premier ajustement. Un mois
// « à venir » rendu rose dans un seul des trois suffit à faire lire un
// futur comme un retard.
//
// La règle, tenue ici une fois : la couleur dit l'ÉTAT, jamais le volume.
//
// Le classement lui-même vit ici aussi, bâti sur les prédicats de
// `lib/dates/retard` — la page calendrier le redérivait à la main, et
// c'est le genre de doublon qui a déjà produit deux compteurs
// contradictoires sur le même écran.

import {
  estDansLesProchainsJours,
  estEnRetard,
  estVerificationEnRetard,
} from "@/lib/dates/retard";
import { JOURS_HORIZON_PROCHE } from "@/lib/dates";
import { estMarqueeNonApplicable } from "./marqueur";
import { PERIODICITE_EN_JOURS } from "@/lib/referentiels/types-communs";

/**
 * Les quatre états qu'une occurrence datée peut prendre. Exclusifs entre
 * eux, et ordonnés par urgence décroissante dans `PRIORITE_ETAT`.
 *
 * `lointain` — planifié au-delà de l'horizon proche — et non « aVenir » :
 * `estVerificationAVenir` (lib/dates) désigne déjà l'inverse, une
 * échéance **dans** les 30 jours, et c'est elle qui nourrit la pilule
 * « sous 30 jours » de l'en-tête. Deux `aVenir` aux fenêtres opposées,
 * c'est le bug de la prochaine personne qui branche l'un sur l'autre.
 */
export type EtatEcheance = "enRetard" | "proche" | "lointain" | "faite";

/**
 * Ce que porte une ligne de liste : les quatre états, plus « à planifier ».
 *
 * `aPlanifier` n'est pas un cinquième état de la même famille — c'est
 * l'absence de date convenue. Il n'entre donc dans aucun graphique
 * (la date qu'il porte est une date de génération, pas un rendez-vous),
 * mais une ligne de liste doit bien l'afficher.
 */
export type RegistreLigne = EtatEcheance | "aPlanifier";

/**
 * Urgence relative, pour trancher quand une case ne peut porter qu'un
 * état — un mois qui mêle du retard et du lointain se lit rouge.
 */
export const PRIORITE_ETAT: Record<EtatEcheance, number> = {
  enRetard: 3,
  proche: 2,
  lointain: 1,
  faite: 0,
};

/**
 * Passerelle vers le vocabulaire de la fenêtre du board (`tone` des
 * `EvenementFenetre`) : trois tons là où le registre a cinq états. La
 * correspondance vivait en dur dans `listerEvenementsFenetre` — la tenir
 * ici, à côté du classement, empêche les deux vocabulaires de dériver.
 */
export const TON_REGISTRE: Record<RegistreLigne, "alerte" | "warn" | "ok"> = {
  enRetard: "alerte",
  aPlanifier: "warn",
  proche: "ok",
  lointain: "ok",
  faite: "ok",
};

/** Champ (fond) de chaque état, en jetons du board. */
export const CHAMP_ETAT: Record<RegistreLigne, string> = {
  enRetard: "var(--board-signal)",
  proche: "var(--board-amber)",
  lointain: "var(--board-blue-soft)",
  faite: "var(--board-green)",
  aPlanifier: "var(--board-slate-pale)",
};

/** Encre lisible sur le champ correspondant. Jamais de blanc sur le rose. */
export const ENCRE_ETAT: Record<RegistreLigne, string> = {
  enRetard: "var(--board-signal-ink)",
  proche: "var(--board-amber-ink)",
  lointain: "var(--board-blue-ink)",
  faite: "var(--board-green-ink)",
  aPlanifier: "var(--board-slate-mid)",
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * LE MOT DE CHAQUE ÉTAT — UN SEUL, ET IL VIT ICI
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Le 2026-09-04, à un clic d'écart, le MÊME état s'écrivait de quatre façons :
 * « DÉPASSÉES » sur le relevé du hero, « à traiter » sur la pastille d'une
 * zone, « EN RETARD » sur le bandeau du parc, « 5 dépassées » sur la carte d'un
 * appareil. Aucune n'était fausse ; ensemble elles faisaient croire à quatre
 * mesures. Ce module tenait déjà la COULEUR de chaque état pour cette raison
 * exacte — « trois copies d'une même règle, qui dérivent au premier
 * ajustement ». Il ne tenait pas le MOT, et le mot a dérivé quatre fois.
 *
 * POURQUOI « DÉPASSÉE » ET PAS « À TRAITER » NI « EN RETARD ». « Dépassée » dit
 * un fait sur une date : elle est passée, et c'est vérifiable. « À traiter » est
 * une consigne, et elle vise plus large que l'état — une occurrence à planifier
 * est elle aussi à traiter, sans avoir dépassé quoi que ce soit ; le mot ne
 * pouvait donc pas nommer CET état-là sans en recouvrir un autre. « En retard »
 * se rapproche du jugement sur celui qui lit, quand le produit ne dit que des
 * faits datés. Le reste du produit disait d'ailleurs déjà « dépassée » dans la
 * moitié des cas — la vue par équipement, le brief, la page de vente.
 *
 * DEUX FORMES DU MÊME MOT, JAMAIS DEUX MOTS. Une pastille de zone n'a pas la
 * largeur d'un bandeau pleine page : c'est la forme COURTE qui l'y remplace,
 * pas un synonyme. `LIBELLE_ETAT_COURT` n'est donc pas un second vocabulaire —
 * c'est le même, abrégé, et la garde vérifie qu'aucun mot n'y nomme deux états.
 *
 * CE QUE CETTE TABLE NE COUVRE PAS, ET IL FAUT LE SAVOIR : un compteur qui
 * agrège DEUX états n'a pas de mot ici, et ne doit pas en emprunter un. La
 * carte d'un appareil comptait « N à venir » sur `proche` + `lointain` réunis
 * pendant que le bandeau du parc comptait « N sous 30 j » sur `proche` seul :
 * les deux mots se ressemblaient parce que les deux nombres ne comptaient pas
 * la même chose. Le remède est de séparer le compte, pas d'unifier le mot.
 *
 * SÉPARER LE COMPTE N'A PAS SUFFI, ET LE MOT RESTANT DISAIT ENCORE LE CONTRAIRE
 * (2026-09-04, seconde passe). Les comptes séparés, la carte d'un appareil
 * affichait « 2 sous 30 jours » et « 1 à venir » côte à côte — deux nombres
 * justes, et pourtant illisibles ensemble : « à venir » est le terme générique
 * qui CONTIENT « sous 30 jours », et rien ne disait au lecteur si le 1
 * s'ajoutait aux 2 ou les incluait. La table venait de se donner la règle « un
 * mot par état » ; elle l'avait respectée à la lettre — deux mots distincts —
 * en manquant ce qu'elle protégeait, car deux mots distincts dont l'un englobe
 * l'autre nomment toujours mal deux ensembles disjoints.
 *
 * `proche` et `lointain` PARTAGENT UNE BORNE : ils partitionnent l'avenir en
 * deux, de part et d'autre de `JOURS_HORIZON_PROCHE`. Leurs deux mots la
 * nomment donc tous les deux — « sous 30 jours » / « au-delà de 30 jours » —
 * et l'un ne peut plus se lire comme contenant l'autre : la disjonction est
 * dans les mots, pas seulement dans le calcul. C'est aussi pourquoi le nombre
 * n'y est plus écrit à la main : la borne affichée EST la constante, et
 * l'ancien « sous 30 jours » littéral serait devenu faux le jour où quelqu'un
 * aurait porté l'horizon à 45.
 *
 * Le type, lui, refusait déjà « aVenir » comme IDENTIFIANT de `lointain` (voir
 * `EtatEcheance`, qui explique pourquoi) — et l'affichait quand même comme
 * MOT. Les deux moitiés disent enfin la même chose.
 */
export const LIBELLE_ETAT: Record<
  RegistreLigne,
  { readonly un: string; readonly plusieurs: string }
> = {
  enRetard: { un: "dépassée", plusieurs: "dépassées" },
  proche: {
    un: `sous ${JOURS_HORIZON_PROCHE} jours`,
    plusieurs: `sous ${JOURS_HORIZON_PROCHE} jours`,
  },
  lointain: {
    un: `au-delà de ${JOURS_HORIZON_PROCHE} jours`,
    plusieurs: `au-delà de ${JOURS_HORIZON_PROCHE} jours`,
  },
  faite: { un: "faite", plusieurs: "faites" },
  aPlanifier: { un: "à planifier", plusieurs: "à planifier" },
};

/**
 * Le même mot, dans la largeur d'une pastille.
 *
 * Identique au pluriel long partout où celui-ci tient déjà : n'abrège que ce
 * qui déborde. Une entrée qui s'écarterait du mot long sans l'abréger serait un
 * second vocabulaire, et la garde la refuse.
 */
export const LIBELLE_ETAT_COURT: Record<RegistreLigne, string> = {
  enRetard: "dépassées",
  proche: `sous ${JOURS_HORIZON_PROCHE} j`,
  lointain: "au-delà",
  faite: "faites",
  aPlanifier: "à planif.",
};

/** « 1 dépassée », « 5 dépassées » — le compte et son mot, accordés. */
export function compteEtat(n: number, etat: RegistreLigne): string {
  const { un, plusieurs } = LIBELLE_ETAT[etat];
  return `${n} ${n > 1 ? plusieurs : un}`;
}

/**
 * Le mot court avec sa capitale — pour un relevé, ou pour une phrase qui cite
 * un relevé entre guillemets.
 *
 * Une fonction et non une sixième table : une variante capitalisée écrite à la
 * main serait exactement le second dictionnaire que ce module existe pour
 * empêcher, et elle survivrait au changement du mot d'origine.
 */
export function libelleEtatCourtCapitale(etat: RegistreLigne): string {
  const mot = LIBELLE_ETAT_COURT[etat];
  return mot.charAt(0).toUpperCase() + mot.slice(1);
}

/**
 * Classe une date nue — une échéance qui n'a ni statut ni réalisation,
 * comme les attestations ou les travaux du plan d'actions.
 */
export function classerDate(
  date: Date,
  now: Date,
): Extract<EtatEcheance, "enRetard" | "proche" | "lointain"> {
  if (estEnRetard(date, now)) return "enRetard";
  return estDansLesProchainsJours(date, now, JOURS_HORIZON_PROCHE)
    ? "proche"
    : "lointain";
}

/**
 * Classe une vérification périodique. Même forme structurelle que les
 * prédicats de `lib/dates/retard` : utilisable côté client et en test,
 * sans `@prisma/client`.
 *
 * L'ordre des tests est celui de `retard.ts`, et il n'est pas négociable :
 * le réalisé d'abord (une vérification faite n'est jamais en retard — la
 * preuve prime sur l'état), puis le retard, puis seulement « à
 * planifier ». Une `a_planifier` dont la date est passée est donc **en
 * retard**, pas « à planifier » : le contrôle n'a pas été fait dans les
 * temps, rendez-vous pris ou non, et prétendre le contraire minorerait la
 * non-conformité. C'est la convention de `estVerificationEnRetard`, de
 * l'en-tête, du PDF et du serveur MCP — une première version de ce
 * classifieur court-circuitait `a_planifier` avant le retard, et la page
 * calendrier contredisait les trois autres surfaces.
 */
export function classerVerification(
  v: { statut: string; datePrevue: Date; dateRealisee: Date | null },
  now: Date,
): RegistreLigne {
  if (v.dateRealisee !== null || v.statut.startsWith("realisee")) {
    return "faite";
  }
  if (estVerificationEnRetard(v, now)) return "enRetard";
  if (v.statut === "a_planifier") return "aPlanifier";
  return classerDate(v.datePrevue, now);
}

/**
 * La ligne a-t-elle une date ARRÊTÉE, ou seulement une date de génération ?
 *
 * `datePrevue` est non nulle en base pour toute ligne, y compris celles que
 * personne n'a encore datées : le générateur y écrit alors le jour où il l'a
 * produite. Lue comme un rendez-vous, cette date fait dire n'importe quoi —
 * « échéance aujourd'hui » le jour de la génération du calendrier, sur un
 * contrôle que personne n'a programmé.
 *
 * Le prédicat vit ici, avec le classement dont il se déduit, parce que deux
 * écrans se sont déjà contredits dessus : le calendrier comptait la ligne
 * « à planifier » et la marquait « à dater », pendant que sa fiche annonçait
 * « prochaine échéance » à la date de génération et « échéance aujourd'hui ».
 * Chacun avait sa propre lecture de `datePrevue` ; ils n'en ont plus qu'une.
 */
export function aUnRendezVous(
  v: { statut: string; datePrevue: Date; dateRealisee: Date | null },
  now: Date,
): boolean {
  return classerVerification(v, now) !== "aPlanifier";
}

/**
 * Une lecture calendrier d'une ligne de suivi : un événement posable sur
 * un mois, avec son état.
 */
export type LectureCalendrier = {
  date: Date;
  registre: RegistreLigne;
  /**
   * `courante` — le cycle n'est pas soldé, la ligne se lit telle quelle ;
   * `realisation` — le contrôle fait, posé au jour où il l'a été ;
   * `prochaine` — le rendez-vous suivant d'un cycle soldé.
   */
  lecture: "courante" | "realisation" | "prochaine";
};

/**
 * Déplie une ligne de suivi en événements de calendrier.
 *
 * Une `Verification` n'est pas une occurrence : c'est la ligne de suivi
 * d'une obligation sur un équipement (cf. generateur.ts). Quand un cycle
 * est soldé, la réconciliation avance `datePrevue` au rendez-vous
 * suivant (`dateRealisee + périodicité`) en gardant le statut réalisé —
 * la même ligne dit donc DEUX choses : « fait le 22/01/2026 » et
 * « prochaine échéance le 22/01/2027 ». La poser une seule fois à
 * `datePrevue` peignait la prochaine échéance en vert « faite », un an
 * trop tôt.
 *
 * Ici : le fait au jour du fait, le rendez-vous au jour du rendez-vous —
 * classé comme n'importe quelle date future. Un contrôle sans périodicité
 * (mise en service, « autre ») n'a pas de rendez-vous suivant : sa
 * `datePrevue` est l'ancienne échéance, pas un engagement.
 */
export function lecturesCalendrier(
  v: {
    statut: string;
    datePrevue: Date;
    dateRealisee: Date | null;
    periodicite: string;
    /** Le libellé porte le marqueur d'archivage (ADR-012) quand
     *  l'obligation ne s'applique plus. Facultatif : les appelants qui ne
     *  l'ont pas sous la main lisent la ligne comme active. */
    libelleObligation?: string;
  },
  now: Date,
): LectureCalendrier[] {
  // Une ligne archivée n'annonce plus rien. Son statut est **gelé** dans son
  // dernier état connu (ADR-012 : l'enum Prisma n'a pas de valeur
  // `archivee`), donc un cycle soldé continuait d'en tirer un « prochain
  // rendez-vous » : l'appareil dont le désenfumage ne s'applique plus —
  // l'établissement a cessé d'être ERP — affichait « une vérification est
  // attendue dans 120 jours », et la ligne « Ne s'applique plus — » se
  // rangeait sous « À faire ». Le fait passé, lui, reste : c'est une preuve.
  const archivee = v.libelleObligation
    ? estMarqueeNonApplicable(v.libelleObligation)
    : false;

  const classe = classerVerification(v, now);
  if (classe !== "faite") {
    if (archivee) return [];
    return [{ date: v.datePrevue, registre: classe, lecture: "courante" }];
  }

  const lectures: LectureCalendrier[] = [
    {
      date: v.dateRealisee ?? v.datePrevue,
      registre: "faite",
      lecture: "realisation",
    },
  ];

  const cyclique =
    (PERIODICITE_EN_JOURS as Record<string, number | null>)[v.periodicite] !=
    null;
  if (
    !archivee &&
    cyclique &&
    v.dateRealisee !== null &&
    v.datePrevue.getTime() > v.dateRealisee.getTime()
  ) {
    lectures.push({
      date: v.datePrevue,
      registre: classerDate(v.datePrevue, now),
      lecture: "prochaine",
    });
  }
  return lectures;
}

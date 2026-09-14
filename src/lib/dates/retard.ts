// Prédicats de retard — **source de vérité unique** du produit.
//
// Avant ce module, « en retard » existait en six variantes divergentes
// (calendrier, trois endroits du dashboard, recommandations, frise, PDF).
// Deux écarts d'affichage étaient déjà visibles à l'écran : le calendrier
// affichait « 3 en retard » là où le tableau de bord en annonçait 5, et une
// vérification `a_planifier` dont la date était passée était tantôt une
// urgence, tantôt un simple « à faire ». Un outil de conformité n'a pas le
// droit d'être approximatif là-dessus (règle n°8 : on n'affirme rien qu'on
// ne sache démontrer).
//
// Règle de produit fondatrice : **une échéance datée d'aujourd'hui n'est
// jamais en retard.** Le retard commence à minuit, heure de Paris, du jour
// qui suit l'échéance. L'utilisateur a toute sa journée.
//
// Comme dans `./index`, l'horloge est toujours injectée : aucun appel à
// `new Date()` ici. Cf. ADR-011.

import { debutDuJour, joursCivilsEntre } from "./index";
// LA SEULE DÉPENDANCE DE CE MODULE HORS DE `lib/dates`, et elle est voulue.
// `index.ts` reste une feuille sans import ; ce fichier-ci, lui, doit savoir
// si une obligation a un rendez-vous suivant — c'est une propriété de son
// rythme, et une seule fonction du dépôt y répond. La recopier ici ferait un
// second `estCyclique`, et c'est le genre de doublon qui a coûté le marqueur
// texte (ADR-034 § 1). `periodicite.ts` n'importe que `lib/dates/index` et
// le référentiel : aucun cycle, et rien de Prisma — ce module reste utilisable
// côté client.
import { PERIODICITES_SANS_SUITE } from "@/lib/calendrier/periodicite";
import type { Periodicite } from "@/lib/referentiels/types-communs";

// ---------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------

/**
 * `date` est-elle strictement antérieure au début du jour civil courant ?
 *
 * C'est la définition canonique du retard. Comparer à `now` brut (ce que
 * faisait la moitié du code) fait basculer en retard une date civile
 * stockée à minuit UTC dès 02:00 à Paris en été — l'utilisateur ouvrait
 * son tableau de bord le matin et découvrait « en retard » une échéance du
 * jour même.
 */
export function estEnRetard(date: Date, now: Date): boolean {
  return date.getTime() < debutDuJour(now).getTime();
}

/**
 * `date` tombe-t-elle dans la fenêtre « aujourd'hui → dans `jours` jours » ?
 *
 * Bornes en **jours civils**, toutes deux incluses : aujourd'hui compte
 * (sinon une échéance du jour tombe dans un trou — ni en retard, ni à
 * venir), et le dernier jour de la fenêtre compte en entier.
 */
export function estDansLesProchainsJours(
  date: Date,
  now: Date,
  jours: number,
): boolean {
  const ecart = joursCivilsEntre(now, date);
  return ecart >= 0 && ecart <= jours;
}

/**
 * Ancienneté du retard, en jours civils. `0` si la date n'est pas en
 * retard (aujourd'hui et le futur donnent donc `0`, jamais un négatif).
 * La veille vaut `1`.
 */
export function joursDeRetard(date: Date, now: Date): number {
  if (!estEnRetard(date, now)) return 0;
  return joursCivilsEntre(date, now);
}

// ---------------------------------------------------------------------
// Vérifications périodiques
// ---------------------------------------------------------------------

/** Forme minimale attendue d'une vérification. Volontairement structurelle
 *  (et non le type Prisma) pour que le module reste utilisable côté client
 *  et dans les tests, sans importer `@prisma/client`. */
export type VerificationDatee = {
  statut: string;
  datePrevue: Date;
  /**
   * **Requis depuis les corrections du N4 (2026-09-13).** Le rythme de
   * l'obligation, en chaîne comme il sort de la base. C'est lui qui dit si un
   * statut réalisé purge l'échéance (`estVerificationRealisee`) : sans lui,
   * une ligne périodique d'avant l'ADR-034 se lisait « faite » sur une
   * échéance passée. Requis et non optionnel pour la raison habituelle de ce
   * type : un lecteur qui l'omettrait ne compile pas, au lieu de compter faux
   * en silence.
   */
  periodicite: string;
  /**
   * (Le champ `dateRealisee` qui suivait est parti au lot N5 de l'ADR-034 : le
   * fait d'un contrôle se lit sur le dernier rapport réalisé, jamais sur la
   * ligne.)
   *
   */
  /**
   * **Requis, et c'est tout l'objet du champ.** La date à laquelle
   * l'obligation a cessé de s'appliquer à cette ligne (ADR-034) ; `null` =
   * ligne ouverte. Une ligne archivée ne réclame plus rien, et son statut
   * reste GELÉ dans son dernier état connu — faute de valeur `archivee` dans
   * l'enum Prisma —, si bien qu'une ligne gelée sur `depassee` se lit « en
   * retard » à perpétuité quand personne ne regarde ce champ.
   *
   * Il remplace le préfixe « Ne s'applique plus — » que ces prédicats lisaient
   * dans le libellé : un fait daté qui se lisait par `startsWith`, et que sept
   * surfaces oubliaient — la fiche de vérification, le serveur MCP, deux
   * widgets, le bandeau de recommandations, le registre de sécurité en PDF.
   * Chacune annonçait un retard sur une obligation éteinte, et le PDF
   * l'imprimait dans un document remis en contrôle. Requis, l'oubli ne
   * compile pas.
   */
  archiveLe: Date | null;
  /** Le libellé recopié du référentiel. Il ne porte plus aucun marqueur
   *  depuis le N3 : c'est du texte d'affichage, rien d'autre. */
  libelleObligation: string;
};

/**
 * La ligne est-elle ARCHIVÉE, c'est-à-dire conservée pour la preuve qu'elle
 * porte alors que son obligation ne s'applique plus ?
 *
 * Une ligne archivée ne réclame rien : ni retard, ni rendez-vous, ni
 * planification. Les trois prédicats ci-dessous s'arrêtent dessus, en
 * premier — avant même de regarder les dates.
 */
export function estVerificationArchivee(v: VerificationDatee): boolean {
  // `!=` ET NON `!==`, et c'est le sens de l'erreur qui décide. Un appelant qui
  // oublie `archiveLe: true` dans son `select` — ou une fixture fabriquée par
  // un cast — passe `undefined` : avec l'égalité stricte, TOUTE ligne se lisait
  // archivée, les trois compteurs tombaient à zéro et l'écran devenait vide
  // sans un mot. Deux relectures se sont fait prendre le même jour (2026-09-12).
  //
  // Avec `!=`, l'absence se lit « ligne ouverte » : la ligne s'affiche, elle
  // peut compter un retard de trop, et ça se voit. Une garde qui échoue doit
  // faire du bruit du côté visible, jamais du côté du silence.
  return v.archiveLe != null;
}

/** Statuts qui disent « ce contrôle a eu lieu ». Un FAIT sur la ligne — pas
 *  un état : voir `estVerificationRealisee` pour ce que ce fait purge.
 *
 *  LA liste, et la seule : la clause SQL des gardes de suppression
 *  (`portee.ts`, `calendrier/actions.ts`) et le réconciliateur la lisent ici.
 *  Elle vivait en trois exemplaires, dont un en `startsWith("realisee")` qui
 *  aurait adopté en silence toute valeur d'enum commençant ainsi (revue du
 *  2026-09-14). */
export const STATUTS_REALISES_PERSISTES = [
  "realisee_conforme",
  "realisee_observations",
  "realisee_ecart_majeur",
] as const;

/**
 * Un contrôle a-t-il eu lieu sur cette ligne ? Le FAIT, pas l'état.
 *
 * À NE PAS CONFONDRE avec `estVerificationRealisee`, qui dit si la ligne
 * n'attend plus rien : sur une obligation périodique, un contrôle a eu lieu ET
 * le suivant est dû. L'historique d'un appareil lit ce fait-ci ; le classement
 * lit l'autre.
 */
export function estStatutRealise(statut: string): boolean {
  return (STATUTS_REALISES_PERSISTES as readonly string[]).includes(statut);
}

/**
 * La ligne n'attend-elle plus rien ?
 *
 * **Un statut réalisé ne purge une échéance que sur une obligation SANS
 * rendez-vous suivant.** Sur une obligation périodique, la date décide, et
 * elle seule — « réalisé » y dit qu'un contrôle a eu lieu, jamais que le
 * suivant n'est pas dû. C'est la règle de fond du produit (« au minimum une
 * fois par an » : l'obligation est l'intervalle, pas le souvenir, ADR-034 § 1),
 * et c'est ce que GestBAT fait par construction — son modèle n'a aucun statut,
 * le retard y est `nextDeadline < now` et rien ne peut l'éteindre.
 *
 * POURQUOI CETTE GARDE, ALORS QUE LE DÉPÔT FAIT ROULER LA LIGNE. Depuis le
 * N2, une ligne périodique déposée repart « planifiée » : un statut réalisé
 * n'y subsiste plus. Mais TOUTES les lignes écrites avant l'ADR-034 en portent
 * un, avec la date du rendez-vous suivant dans `datePrevue` — et le
 * classement, en testant le statut avant la date, les lisait « faites » à
 * perpétuité : une échéance passée de six mois devenait verte sur quatre
 * surfaces au déploiement, tant que personne ne rouvrait le calendrier (seule
 * page qui régénère). Relevé par les deux relectures du N4, le 2026-09-13.
 * La règle écrite ici rend ces lignes lisibles JUSTE sans attendre qu'une
 * migration les remette au modèle — et reste vraie après, comme invariant :
 * une ligne périodique n'est jamais « faite », seulement « faite jusqu'au
 * prochain ».
 *
 * `periodicite` arrive en chaîne depuis la base, d'où le transtypage — le même
 * que chez les autres appelants d'`estCyclique`, qui tient l'inconnu pour
 * ponctuel.
 */
/**
 * Le statut sous lequel les prédicats LISENT la ligne.
 *
 * Un statut réalisé sur une obligation périodique — donc non purgé, voir
 * ci-dessous — se lit « planifiée » : c'est la rangée d'avant l'ADR-034, dont
 * `datePrevue` est le rendez-vous suivant, calculé et posé par l'ancien
 * modèle. Ce rendez-vous est ARRÊTÉ au même titre que celui d'une ligne
 * roulée ; il se compare donc à la date comme elle. Sans cette lecture, les
 * prédicats ne comparaient la date que sous `planifiee` et `a_planifier`, et
 * `estVerificationEnRetard` rendait `false` sur la rangée gelée — le
 * classement tombait juste par ricochet, les recommandations et le dossier
 * PDF non. Trouvé par la suite, pas par lecture (2026-09-13).
 */
function statutLu(v: VerificationDatee): string {
  return estStatutRealise(v.statut) && !estVerificationRealisee(v)
    ? "planifiee"
    : v.statut;
}

export function estVerificationRealisee(
  // Les deux seuls champs lus, et le type le dit : un appelant qui n'a pas de
  // date sous la main (une fiche de registre, dont `datePrevue` peut être
  // nulle) peut poser la question sans fabriquer une ligne complète.
  v: Pick<VerificationDatee, "statut" | "periodicite">,
): boolean {
  // LE SENS PRUDENT EST L'INVERSE DE CELUI D'`estCyclique`. Pour dater un
  // rendez-vous, un rythme inconnu se tient pour ponctuel : on n'invente pas
  // d'échéance. Pour PURGER une échéance, un rythme inconnu doit se tenir
  // pour cyclique : on n'efface pas un retard sur la foi d'un champ absent.
  // Un `select` qui oublierait `periodicite` — le type l'exige, mais un faux
  // client ou un `as` le laissent passer — lisait `undefined`, que
  // `estCyclique` tient pour « pas de suite », et chaque statut réalisé
  // purgeait : les retards des rangées gelées disparaissaient en silence.
  // C'est le piège `undefined !== null` de l'ADR-034 (N3), sur un autre
  // champ. Seuls les deux rythmes SANS SUITE, nommément, purgent.
  return (
    estStatutRealise(v.statut) &&
    PERIODICITES_SANS_SUITE.includes(v.periodicite as Periodicite)
  );
}

/**
 * Une vérification est **en retard** quand son échéance réglementaire est
 * passée sans qu'elle ait été réalisée :
 *
 *  - statut `depassee` — le passage au statut a déjà été acté ;
 *  - statut `planifiee` dont la `datePrevue` est en retard ;
 *  - statut `a_planifier` dont la `datePrevue` est en retard.
 *
 * **Arbitrage sur `a_planifier`** (les deux camps existaient dans le code) :
 * `src/lib/calendrier/queries.ts` le tenait pour non pénalisant, considérant
 * qu'une occurrence tout juste générée à la déclaration d'un équipement est
 * un simple « à faire » ; `src/lib/dashboard/recommandations.ts` faisait
 * l'inverse et le remontait en urgence. Décision retenue (ADR-011) : ce
 * n'est pas le statut qui crée l'obligation, c'est la date. Tant que la
 * `datePrevue` est à venir, `a_planifier` reste un « à faire » — c'est
 * `estVerificationAPlanifier` ci-dessous. Dès qu'elle est passée, le
 * contrôle réglementaire n'a pas été fait dans les temps : c'est un retard,
 * que l'utilisateur ait ou non pris rendez-vous. Prétendre le contraire
 * reviendrait à minorer la non-conformité, ce que le produit s'interdit.
 *
 * Une occurrence réalisée SANS rendez-vous suivant n'est jamais en retard.
 * Sur une obligation périodique, en revanche, un statut réalisé ne purge
 * rien : la date décide (`estVerificationRealisee`, et le pourquoi y est).
 */
export function estVerificationEnRetard(
  v: VerificationDatee,
  now: Date,
): boolean {
  if (estVerificationArchivee(v)) return false;
  // `dateRealisee` N'EST PLUS LUE (ADR-034, N3). Elle disait « cette ligne est
  // soldée », ce qui sortait des comptes une ligne roulée dont l'échéance
  // suivante était pourtant passée — le défaut du lot 3 bis. Depuis que la
  // ligne ne porte que l'échéance ouverte, seul un statut réalisé purge
  // l'échéance, et il n'en reste que sur une obligation sans rendez-vous
  // suivant, consommée.
  if (estVerificationRealisee(v)) return false;
  const statut = statutLu(v);
  if (statut === "depassee") return true;
  if (statut === "planifiee" || statut === "a_planifier") {
    return estEnRetard(v.datePrevue, now);
  }
  return false;
}

// `echeanceOuverte` A VÉCU ICI du 2026-09-13 au soir du même jour : elle
// calculait, pour une rangée d'avant l'ADR-034 encore gelée sur un statut
// réalisé, l'échéance que la régénération aurait écrite. La migration du lot
// N5 a remis ces rangées au modèle et retiré la colonne `dateRealisee` : une
// ligne porte UNE date, `datePrevue`, et c'est elle que tout lit. Une tolérance
// pour deux modèles en base était ce que trois relectures ont trouvé
// incomplète, trois fois ; il n'y a plus qu'un modèle.

/**
 * Une vérification est **à planifier** quand elle attend une date de
 * rendez-vous sans être encore en retard : statut `a_planifier`, échéance
 * aujourd'hui ou plus tard.
 *
 * Volontairement disjoint de `estVerificationEnRetard` : les deux prédicats
 * ne sont jamais vrais ensemble, un compteur « en retard » et un compteur
 * « à planifier » ne doublonnent donc jamais.
 */
export function estVerificationAPlanifier(
  v: VerificationDatee,
  now: Date,
): boolean {
  if (estVerificationArchivee(v)) return false;
  if (estVerificationRealisee(v)) return false;
  if (v.statut !== "a_planifier") return false;
  return !estEnRetard(v.datePrevue, now);
}

/**
 * Une vérification est **à venir** quand elle est planifiée et tombe dans
 * la fenêtre courante (par défaut l'horizon proche du produit, 30 jours).
 * Les occurrences `a_planifier` en sont exclues : sans date arrêtée avec le
 * prestataire, annoncer « prévue le 12 » serait un mensonge d'affichage.
 */
export function estVerificationAVenir(
  v: VerificationDatee,
  now: Date,
  jours: number,
): boolean {
  if (estVerificationArchivee(v)) return false;
  if (estVerificationRealisee(v)) return false;
  if (statutLu(v) !== "planifiee") return false;
  return estDansLesProchainsJours(v.datePrevue, now, jours);
}

// ---------------------------------------------------------------------
// Actions correctives
// ---------------------------------------------------------------------

/** Forme minimale attendue d'une action corrective (modèle unifié,
 *  ADR-002). L'échéance est facultative en base. */
export type ActionDatee = {
  statut: string;
  echeance: Date | null;
};

/** Statuts d'action encore à traiter — par opposition à `levee` et
 *  `abandonnee`, qui sortent du plan d'actions. */
export const STATUTS_ACTION_OUVERTE: readonly string[] = ["ouverte", "en_cours"];

/** L'action est-elle encore à traiter ? */
export function estActionOuverte(a: ActionDatee): boolean {
  return STATUTS_ACTION_OUVERTE.includes(a.statut);
}

/**
 * Une action est **en retard** quand elle est encore ouverte et que son
 * échéance est passée. Une action levée ou abandonnée ne l'est jamais, même
 * si elle a été traitée après la date visée : le plan d'actions rend compte
 * de ce qui reste à faire.
 */
export function estActionEnRetard(a: ActionDatee, now: Date): boolean {
  if (!estActionOuverte(a)) return false;
  if (a.echeance === null) return false;
  return estEnRetard(a.echeance, now);
}

/**
 * Une action ouverte **sans échéance** n'est pas en retard — on ne peut pas
 * dépasser une date qui n'existe pas — mais elle ne doit pas disparaître des
 * radars pour autant : sans date, elle n'apparaît ni au calendrier, ni dans
 * la frise, ni dans les « 30 prochains jours ». C'est un angle mort du plan
 * d'actions, que ce prédicat rend repérable pour inviter à dater.
 */
export function estActionSansEcheance(a: ActionDatee): boolean {
  return estActionOuverte(a) && a.echeance === null;
}

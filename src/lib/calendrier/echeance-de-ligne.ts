// L'échéance ouverte d'une ligne de suivi, calculée depuis des FAITS — ADR-036.
//
// ⚠ RIEN N'IMPORTE ENCORE CE MODULE, ET C'EST VOULU (lot 1, 2026-09-17). Il est
// posé à côté du moteur avec sa table de vérité ; le brancher est l'affaire des
// lots 2c (passage à blanc) et 4 (bascule) de l'ADR-036. Un test de
// `echeance-de-ligne.test.ts` échoue si un fichier de `src/` l'importe avant.
//
// CE QU'IL REMPLACERA. La date d'une ligne s'écrit aujourd'hui à quatre
// endroits — le `createMany` et l'`update` de la régénération, `rouler` au dépôt
// d'un rapport, le recul à sa suppression — et `reconcilierCalendrier` la
// redécide dans huit branches, dont chacune raconte la régression de la
// précédente. La branche générale, « cycle ouvert », impose que la date en base
// ne bouge JAMAIS : c'est le constat B. Tant qu'un appareil n'a pas été
// contrôlé, un rythme qui change, une mise en service ajoutée ou corrigée, un
// premier délai revu restent sans effet, et le calendrier dépend de l'ordre des
// saisies au lieu des faits déclarés.
//
// POURQUOI ON NE POUVAIT PAS « SIMPLEMENT ÉCRASER ». Le générateur répond
// « aujourd'hui » quand il n'a pas de source : une obligation en retard de
// 94 jours repasserait à 0, et sa date glisserait chaque jour. Geler la date ne
// servait qu'à préserver UNE information — le jour depuis lequel Rojer suit la
// ligne —, qui n'était stockée proprement nulle part. Elle entre ici comme un
// fait, `origine`, et la date n'a plus besoin d'être gelée.
//
// LE PRINCIPE. Une donnée dérivée est une fonction pure de faits stockés. Ce
// module ne lit AUCUNE HORLOGE — ni `new Date()`, ni `Date.now()` — et n'importe
// ni la base ni la session : les mêmes faits rendent la même échéance, quel que
// soit le jour du calcul et quel que soit l'ordre dans lequel ils ont été
// saisis. Le retard, lui, reste une lecture (`estVerificationEnRetard`,
// ADR-011) : il n'est pas calculé ici.
//
// AUCUNE RÈGLE N'EST RECOPIÉE. Tout se compose de fonctions que le dépôt porte
// déjà en un seul exemplaire : `prochaineEcheance` et `estCyclique`
// (`periodicite.ts`), `estEnRetard` et `debutDuJour` (`lib/dates`),
// `statutDepuisResultat` (`rapports/schema.ts`), `estPeriodicitePlusStricte`
// (`matching/prescriptions.ts`), `estSansRendezVous` (`etats-permanents`).
// `echeanceDuTitre` (`salaries/echeance.ts`) reste chez l'appelant, qui lui
// doit `dateDuTitre`.

import { debutDuJour } from "@/lib/dates";
import { estEnRetard } from "@/lib/dates/retard";
import { estSansRendezVous } from "@/lib/etats-permanents/regle";
import { estPeriodicitePlusStricte } from "@/lib/matching/prescriptions";
import {
  statutDepuisResultat,
  type ResultatRealise,
} from "@/lib/rapports/schema";
import type { Periodicite } from "@/lib/referentiels/types-communs";
import { estCyclique, prochaineEcheance } from "./periodicite";

/**
 * Les statuts qu'une ligne peut porter — miroir de l'enum Prisma
 * `StatutVerification`, en union locale pour que le module reste pur.
 *
 * Pas importé de `generateur.ts`, qui en tient le même miroir
 * (`StatutVerificationPersiste`) : à la bascule c'est `generateur.ts` qui
 * importera ce module, et l'inverse ferait un cycle. Le cliquet est le type de
 * retour de `statutDepuisResultat` : une valeur ajoutée à l'enum Prisma cesse
 * d'être assignable ici, et le module ne compile plus.
 */
export type StatutDeLigne =
  | "a_planifier"
  | "planifiee"
  | "realisee_conforme"
  | "realisee_observations"
  | "realisee_ecart_majeur";

/**
 * Ce qu'on sait d'une ligne. Des faits, tous stockés, et rien d'autre : ni la
 * date que la ligne porte aujourd'hui, ni son statut, ni l'heure qu'il est.
 */
export type FaitsDeLigne = {
  /** Le rythme EFFECTIF : celui du référentiel, sauf surcharge d'une
   *  prescription particulière (ADR-035). */
  periodicite: Periodicite;
  /** Le pas du PREMIER cycle, résolu par `premierPas(premierDelai, rythme du
   *  référentiel, surcharge)` — l'appelant tient les trois là où il calcule le
   *  rythme effectif (`generateur.ts`, `const surcharge`). Lu par la règle 4
   *  seule : un contrôle réalisé fait repartir le rythme, jamais le premier
   *  délai. */
  premierPas: Periodicite;
  /** Porteur salarié : l'échéance du titre, telle qu'`echeanceDuTitre` la
   *  rend. `null` pour tout autre porteur, et pour un titre sans terme. */
  dateDuTitre: Date | null;
  /**
   * Le dernier rapport RÉALISÉ que la ligne porte elle-même, ou `null`.
   *
   * « Réalisé » est l'affaire de l'appelant (`WHERE_RAPPORT_REALISE`,
   * `indexerDernieresRealisations`) : un rapport « non vérifiable » n'est pas
   * une réalisation — le contrôle n'a pas eu lieu — et un rapport antidaté
   * n'est pas le dernier. Dans les deux cas ce champ ne les voit pas.
   *
   * LE TYPE LE DIT, ET LA FONCTION NE S'Y FIE PAS (relecture du 2026-09-17).
   * `resultat` était typé `string` : le ponctuel s'en défendait, le cyclique
   * non, et un « non vérifiable » passé par erreur faisait rouler la ligne
   * d'une période entière — le mensonge même que `STATUT_DEPUIS_RESULTAT`
   * raconte avoir retiré. Le type ferme l'erreur à la compilation ; mais le
   * résultat arrive de la base en chaîne, par un `as`, donc les règles 2 et 3
   * ne tiennent pour réalisé que ce que `statutDepuisResultat` reconnaît.
   */
  realisation: { date: Date; resultat: ResultatRealise } | null;
  /** La réalisation léguée par les lignes qu'une succession fait absorber — la
   *  PLUS ANCIENNE (`reprendreLaRealisation`). Une réalisation propre prime
   *  toujours sur elle. */
  realisationHeritee: Date | null;
  /** `null` pour un porteur établissement ou salarié, pour une ligne sur mesure,
   *  et pour un appareil dont la date n'a pas été saisie. */
  miseEnService: Date | null;
  /**
   * Depuis quand Rojer suit la ligne : `Verification.suiviDepuis` (ADR-036,
   * D2), ou l'horloge de la passe pour une ligne à naître — qui la persiste.
   *
   * C'est le seul fait que le gel de la date protégeait. Il sert deux fois :
   * il date un « à planifier » (règle 5), à partir duquel l'ADR-011 § 5 compte
   * le retard ; et il borne la règle 4 — une première échéance antérieure au
   * suivi serait un retard inventé.
   */
  origine: Date;
};

/** D'où sort la date rendue. Pour le passage à blanc et pour les tests ;
 *  **jamais persistée**. */
export type SourceEcheance =
  | "titre"
  | "ponctuel_solde"
  | "ponctuel_ouvert"
  | "rapport"
  | "heritage"
  | "mise_en_service"
  | "origine";

export type EcheanceDeLigne = {
  datePrevue: Date;
  statut: StatutDeLigne;
  source: SourceEcheance;
};

/**
 * Le pas du PREMIER cycle d'une ligne jamais contrôlée (ADR-036, D1).
 *
 * Sans prescription, c'est le comportement d'avant : `premierDelai` quand le
 * texte fixe un plafond de premier cycle distinct du rythme (`esp-inspection-
 * periodique` : trois ans, puis quatre), le rythme sinon.
 *
 * Sous prescription, DEUX PLAFONDS pèsent sur le même premier cycle — celui du
 * texte et celui de la prescription — et c'est le plus bas qui lie. « Première
 * inspection à trois ans, puis chaque année » serait absurde ; c'est pourtant
 * ce que le générateur rendait (S7 de l'audit du 2026-09-17 : il lisait le
 * rythme du référentiel, et une ligne étiquetée « semestrielle » naissait avec
 * une première échéance à un an).
 *
 * LA SURCHARGE EST UN PARAMÈTRE, PAS UNE DÉDUCTION. Le minimum se prend entre
 * le premier délai et LA SURCHARGE, jamais entre le premier délai et le rythme
 * du référentiel : les deux viennent du même texte, qui a voulu les deux. Un
 * texte « première vérification à deux ans, puis annuelle » serait faussé d'un
 * an. La formule du plan prenait le rythme EFFECTIF en troisième argument ; or
 * sans prescription l'effectif EST le rythme du référentiel, et la comparaison
 * nue le faisait primer sur un premier délai plus long. Aucune obligation
 * livrée n'est dans ce cas aujourd'hui ; la première l'aurait été en silence.
 *
 * La première rédaction fermait le cas par une garde d'ÉGALITÉ — « effectif
 * égal au référentiel, donc pas de surcharge ». Elle déduisait ce fait d'une
 * règle d'un AUTRE module (`appliquerPrescriptions` écarte une surcharge qui
 * n'est pas strictement plus stricte), qu'aucun test ne gardait ici, alors que
 * l'appelant le SAIT : il tient la surcharge, ou son absence, à l'endroit même
 * où il calcule le rythme effectif. Et trois `Periodicite` voisins se
 * permutaient sans bruit. `null` dit « pas de prescription », et rien d'autre
 * ne le dit (relecture du 2026-09-17).
 */
export function premierPas(
  premierDelai: Periodicite | undefined,
  periodiciteReferentiel: Periodicite,
  surcharge: Periodicite | null,
): Periodicite {
  const base = premierDelai ?? periodiciteReferentiel;
  if (surcharge === null) return base;
  // `candidate` d'abord, `reference` ensuite : « la surcharge est-elle
  // strictement plus stricte que la base ? ». À égalité la base reste — même
  // valeur. Une surcharge ne DESSERRE jamais : moins stricte que la base, elle
  // est sans effet sur le premier cycle.
  return estPeriodicitePlusStricte(surcharge, base) ? surcharge : base;
}

/**
 * L'échéance ouverte et le statut d'une ligne, depuis ses faits.
 *
 * PRÉCONDITION : `dateDuTitre !== null || !estSansRendezVous(periodicite)`. Un
 * rythme `autre` n'a pas de rendez-vous : le générateur n'en produit aucune
 * ligne, sauf celle d'un titre dont l'employeur a saisi l'échéance — qui passe
 * par la règle 1. Hors de ce cas la fonction REFUSE, par une erreur, plutôt que
 * de dater une obligation qui n'a pas de date ; les lignes `autre` que la
 * génération saute restent l'affaire de la boucle NB4 du réconciliateur, qui ne
 * touche pas aux dates.
 *
 * LE CAS EXISTE, ET L'APPELANT LE TRAITE AVANT D'APPELER. Une ligne d'équipement
 * `autre` reste en base quand la prescription qui lui donnait un rythme est
 * levée et qu'elle porte une trace ; on peut encore y déposer un rapport, et
 * `rouler` le sert aujourd'hui — date gardée, statut du résultat.
 * `recalculerLigne` (lot 4) fera de même HORS de cette fonction, comme la boucle
 * NB4 : solde par `statutDepuisResultat`, date inchangée (ADR-036 § 4). Une
 * réalisation ne lève donc pas la précondition.
 *
 * L'ORDRE DES RÈGLES est la décision ; le changer change le produit.
 */
export function echeanceDeLigne(f: FaitsDeLigne): EcheanceDeLigne {
  // 1. LA DATE DU TITRE, EN PREMIER. Elle n'est pas un calcul : elle est écrite
  //    sur la pièce que l'employeur a en main. Placée après la réalisation, elle
  //    était perdue dès qu'un rapport avait été déposé sur la ligne — « le
  //    correctif du correctif » de `reconcilierCalendrier`. C'est la
  //    rectification que `docs/rgpd.md` § 5.2 promet (art. 16).
  if (f.dateDuTitre !== null) {
    return { datePrevue: f.dateDuTitre, statut: "planifiee", source: "titre" };
  }

  if (estSansRendezVous(f.periodicite)) {
    throw new Error(
      `echeanceDeLigne : le rythme « ${f.periodicite} » n'a pas de rendez-vous, ` +
        "et aucune date de titre n'est fournie. Une telle ligne n'a pas " +
        "d'échéance à calculer (ADR-036, précondition).",
    );
  }

  // CE QUI VAUT RÉALISATION, dit une fois pour les règles 2 et 3, par la seule
  // table qui le sache. Un résultat qu'elle ne reconnaît pas — « non
  // vérifiable », ou une valeur d'enum ajoutée sans elle — laisse la ligne
  // ouverte sur ses autres faits : l'incertitude ne réduit jamais la couverture.
  const solde = statutDepuisResultat(f.realisation?.resultat);
  const realisee =
    f.realisation !== null && solde !== null ? f.realisation.date : null;

  // 2. LE PONCTUEL — un contrôle unique, sans rendez-vous suivant. Daté de
  //    l'ÉVÉNEMENT quand on le connaît : datée de « maintenant », une chambre
  //    froide de 2015 était réputée due aujourd'hui, et le restait à perpétuité.
  if (!estCyclique(f.periodicite)) {
    const datePrevue = f.miseEnService ?? debutDuJour(f.origine);
    // Soldé : le seul cas où un statut réalisé reste sur la ligne. SA
    // réalisation, pas l'héritée — un legs ne solde pas un ponctuel.
    if (solde !== null) {
      return { datePrevue, statut: solde, source: "ponctuel_solde" };
    }
    // Règle civile (ADR-011), AU JOUR DE L'ORIGINE et non au jour du calcul :
    // c'est la dépendance à `now` que l'audit n'avait pas vue, et qui faisait
    // repasser une mise en service « planifiée » en « à planifier » le
    // lendemain — deux passes, deux états, pour une donnée immobile.
    const aVenir =
      f.miseEnService !== null && !estEnRetard(f.miseEnService, f.origine);
    return {
      datePrevue,
      statut: aVenir ? "planifiee" : "a_planifier",
      source: "ponctuel_ouvert",
    };
  }

  // 3. LE DERNIER CONTRÔLE RÉALISÉ + LE RYTHME EFFECTIF. Propre, sinon hérité :
  //    une réalisation faite sous le nouvel identifiant prime toujours, et
  //    l'ordre suffit à rendre l'héritage non répétable — la garde
  //    `!porteUnePreuve` et son récit (« une ligne au 2029-02-01 repartait au
  //    2024-01-10 ») étaient l'artefact d'un calcul à état. Le RYTHME, jamais le
  //    premier délai : sans quoi le premier cycle se rejouerait à chaque dépôt.
  //    « Planifiée », passée ou non : le retard se lit sur la date.
  const dernier = realisee ?? f.realisationHeritee;
  if (dernier !== null) {
    const prochaine = prochaineEcheance(dernier, f.periodicite);
    // `null` est inatteignable ici — le rythme est cyclique —, et retomber sur
    // les règles suivantes est le sens prudent si la table venait à mentir.
    if (prochaine !== null) {
      return {
        datePrevue: prochaine,
        statut: "planifiee",
        source: realisee !== null ? "rapport" : "heritage",
      };
    }
  }

  // 4. LA MISE EN SERVICE + LE PREMIER PAS — si cette première échéance tombe À
  //    L'ORIGINE OU APRÈS. C'est la règle 4 bis, évaluée au jour de l'origine :
  //    une échéance née pendant que Rojer suivait la ligne est réelle, passée ou
  //    non (S2 : 108 jours de retard gardés) ; une échéance antérieure au suivi
  //    appartient à un passé que le dossier ne connaît pas, et annoncer sept ans
  //    de retard sur un appareil de 2018 serait inventer.
  if (f.miseEnService !== null) {
    const premiere = prochaineEcheance(f.miseEnService, f.premierPas);
    if (premiere !== null && !estEnRetard(premiere, f.origine)) {
      return {
        datePrevue: premiere,
        statut: "planifiee",
        source: "mise_en_service",
      };
    }
  }

  // 5. RIEN N'EST CONNU : « à planifier », daté du jour où le suivi commence —
  //    le début du jour CIVIL de Paris (ADR-011), pas l'instant. L'ADR-011 § 5
  //    compte le retard dès le lendemain ; daté de l'origine et non de
  //    l'horloge, il ne glisse plus.
  return {
    datePrevue: debutDuJour(f.origine),
    statut: "a_planifier",
    source: "origine",
  };
}

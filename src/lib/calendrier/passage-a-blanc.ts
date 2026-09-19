// Le passage à blanc de l'ADR-036 : l'état EN BASE comparé au plan du moteur
// courant, ligne à ligne, et le classement de chaque écart. Sans rien écrire.
//
// CE QU'IL ÉTAIT (lot 2c, 2026-09-18) : deux plans sur une même lecture — la
// stratégie en ligne, `deciderParConservation`, et la candidate,
// `deciderParFaits` —, leur différence, et le classement de chaque écart.
// C'était la méthode « Scientist » : le nouveau calcul tournait À CÔTÉ de
// l'ancien, on journalisait les écarts sans rien écrire, puis on basculait.
//
// CE QU'IL EST DEPUIS LA BASCULE (lot 4, 2026-09-19) : il n'y a plus qu'une
// stratégie. L'outil compare donc ce que la base PORTE à ce que le moteur
// ÉCRIRAIT à la prochaine régénération. C'est un CONTRÔLE DE SANTÉ :
//  · juste après la fusion, avant que chaque dossier ait été régénéré sous le
//    moteur 3, il montre ce que la première régénération réécrira — les mêmes
//    catégories que le passage à blanc du 2026-09-18, lues cette fois sur
//    l'état en base au lieu du plan de l'ancien moteur ;
//  · une fois un dossier régénéré, tout doit y être `identique` : un écart
//    dit qu'un chemin a écrit une date que le moteur ne reconnaît pas — le
//    défaut même que l'ADR-036 ferme.
// Ce module est la partie pure de l'outil ; `scripts/passage-a-blanc-echeances.ts`
// lui apporte la lecture, en transaction `READ ONLY`, et imprime.
//
// LES CATÉGORIES, dans l'ordre où elles sont essayées — le premier motif qui
// tient l'emporte :
//
//   ~~legs_statut_realise~~  retirée au lot 5 (2026-09-19) avec la garde
//                        qu'elle inventoriait : le contrôle de santé du même
//                        jour n'en comptait aucun en production. Une telle
//                        ligne se classe désormais par les motifs ordinaires ;
//   identique            même instant, même statut ;
//   meme_jour_civil      même statut, même jour civil de Paris, instant
//                        différent — la règle 5 réécrit chaque « à planifier »
//                        vers minuit de Paris (ADR-036 § 5, conséquence écrite) ;
//   statut_seul          même jour, statut différent — un titre `autre` au
//                        statut réalisé redevenant « planifiée », une échéance
//                        rendue par la suppression d'un rapport redevenant
//                        visible ;
//   rythme               la date en base est « l'ancre + un AUTRE rythme » :
//                        le rythme a changé et la date ne l'avait pas suivi
//                        (S3, D3, le rythme allongé) — y compris un rythme
//                        devenu PONCTUEL, qui laisse la ligne sans rendez-vous
//                        suivant et la ramène à son événement ou à son origine ;
//   mise_en_service      la date nouvelle sort de la mise en service, que la
//                        date en base ne connaissait pas ou connaissait
//                        autrement (S4, S5, un ponctuel ouvert daté de `now`,
//                        un ponctuel SOLDÉ dont la mise en service est saisie
//                        après coup) ;
//   retard_invente       la ligne passe « à planifier » à son origine alors que
//                        la date en base était ANTÉRIEURE au suivi : un retard
//                        compté sur des jours où Rojer ne suivait rien ;
//   date_arbitraire      la date en base n'est expliquée par AUCUN fait — ni
//                        l'origine, ni la mise en service, ni une ancre plus un
//                        rythme, ni la pièce. Les seeds de démonstration en
//                        ont posé (`etaler-echeances-demo.ts`, retiré au lot 3
//                        avec `seed --planifier`) : les dossiers existants les
//                        portent encore ;
//   inexplique           la date en base est expliquée par un fait, et pourtant
//                        aucun motif ci-dessus ne nomme l'écart. C'est le
//                        critère de sortie : ZÉRO `inexplique`.

import { cleJourCivil, debutDuJour } from "@/lib/dates";
import { PERIODICITE_CALENDAIRE, type Periodicite } from "@/lib/referentiels/types-communs";
import { faitsDeLigne } from "./decision-par-faits";
import type { FaitsDeLigne } from "./echeance-de-ligne";
import {
  cleDeLigne,
  heritageDesRetirees,
  reconcilierCalendrier,
  type OccurrenceExistante,
  type PlanReconciliation,
  type VerificationGenere,
} from "./generateur";
import { type LecturePasse, planifier, preparer } from "./passe";
import { estCyclique, prochaineEcheance } from "./periodicite";

export const CATEGORIES = [
  "identique",
  "meme_jour_civil",
  "statut_seul",
  "rythme",
  "mise_en_service",
  "retard_invente",
  "date_arbitraire",
  "inexplique",
] as const;

export type Categorie = (typeof CATEGORIES)[number];

/** Ce qu'une ligne porte comme date et statut, sous un plan. */
export type EtatLigne = { datePrevue: Date; statut: string };

export type EntreeClassement = {
  /** Ce que la ligne porte en base. */
  avant: EtatLigne;
  /** Ce que le moteur écrirait, et d'où sort sa date. */
  apres: EtatLigne & { source: string | null };
  /** Les faits que le moteur a lus. */
  faits: FaitsDeLigne;
};

const memeInstant = (a: Date, b: Date) => a.getTime() === b.getTime();

/** Tous les rythmes cycliques du référentiel — ceux qui ont un pas. */
const RYTHMES_CYCLIQUES = (
  Object.keys(PERIODICITE_CALENDAIRE) as Periodicite[]
).filter((p) => estCyclique(p));

/**
 * `date` vaut-elle `ancre + p` pour un rythme `p` autre que `saufRythme` ? Rend
 * ce rythme, ou `null`.
 */
function rythmeQuiExplique(
  date: Date,
  ancre: Date | null,
  saufRythme: Periodicite | null,
): Periodicite | null {
  if (ancre === null) return null;
  for (const p of RYTHMES_CYCLIQUES) {
    if (p === saufRythme) continue;
    const candidate = prochaineEcheance(ancre, p);
    if (candidate !== null && memeInstant(candidate, date)) return p;
  }
  return null;
}

/**
 * La date en base est-elle expliquée par un fait connu — l'origine (l'instant
 * ou son début de jour), la mise en service, la pièce, ou une ancre plus un
 * rythme quelconque ?
 */
export function dateExpliqueeParUnFait(date: Date, f: FaitsDeLigne): boolean {
  if (memeInstant(date, f.origine) || memeInstant(date, debutDuJour(f.origine))) {
    return true;
  }
  if (f.miseEnService !== null && memeInstant(date, f.miseEnService)) return true;
  if (f.dateDuTitre !== null && memeInstant(date, f.dateDuTitre)) return true;
  const ancres = [f.miseEnService, f.realisation?.date ?? null, f.realisationHeritee];
  return ancres.some((a) => rythmeQuiExplique(date, a, null) !== null);
}

/**
 * Le classement d'un écart — fonction pure, un motif après l'autre.
 */
export function classerEcart(e: EntreeClassement): Categorie {
  const { avant, apres, faits } = e;
  const memeStatut = avant.statut === apres.statut;
  const memeJour = cleJourCivil(avant.datePrevue) === cleJourCivil(apres.datePrevue);
  if (memeStatut && memeInstant(avant.datePrevue, apres.datePrevue)) return "identique";
  if (memeStatut && memeJour) return "meme_jour_civil";
  if (memeJour) return "statut_seul";

  // La date en base est « une ancre + un autre rythme » : le rythme a changé,
  // la date était restée. L'ancre est celle de la date nouvelle — la
  // réalisation pour la règle 3, la mise en service pour la règle 4 — et, si
  // la nouvelle date est l'origine (règle 5), la mise en service quand même :
  // c'est D3, où un rythme resserré fait tomber la première échéance avant le
  // suivi.
  switch (apres.source) {
    case "rapport":
      if (rythmeQuiExplique(avant.datePrevue, faits.realisation?.date ?? null, faits.periodicite)) {
        return "rythme";
      }
      break;
    case "heritage":
      if (rythmeQuiExplique(avant.datePrevue, faits.realisationHeritee, faits.periodicite)) {
        return "rythme";
      }
      break;
    case "mise_en_service":
    case "origine":
      if (rythmeQuiExplique(avant.datePrevue, faits.miseEnService, faits.premierPas)) {
        return "rythme";
      }
      break;
    // UN PONCTUEL, OUVERT OU SOLDÉ, dont la date en base vaut « une ancre + un
    // rythme » : c'est que la ligne était CYCLIQUE et que son rythme est devenu
    // ponctuel. La date roulée qu'elle portait n'attend plus rien — l'ADR-036
    // § 5 le nomme, « une périodicité devenue PONCTUELLE solde une ligne
    // roulée » —, et c'est bien un changement de rythme qui la déplace.
    //
    // Les trois ancres sont essayées, parce qu'on ne sait pas laquelle datait
    // la ligne du temps où elle était cyclique. `saufRythme` vaut `null` : le
    // rythme effectif est ici sans pas (`mise_en_service_uniquement`), donc il
    // n'y a aucun rythme à exclure de la recherche.
    case "ponctuel_solde":
    case "ponctuel_ouvert":
      if (
        rythmeQuiExplique(avant.datePrevue, faits.realisation?.date ?? null, null) !== null ||
        rythmeQuiExplique(avant.datePrevue, faits.realisationHeritee, null) !== null ||
        rythmeQuiExplique(avant.datePrevue, faits.miseEnService, null) !== null
      ) {
        return "rythme";
      }
      break;
    default:
      break;
  }

  // La date nouvelle sort de la mise en service, et la date en base ne
  // s'expliquait pas par elle : mise en service ajoutée ou corrigée après
  // coup (S4, S5), ponctuel daté de `now` au lieu de l'événement.
  //
  // `ponctuel_solde` EN FAIT PARTIE, et l'oublier était un trou (relecture
  // neutre du 2026-09-18) : un contrôle unique déjà fait dont la mise en
  // service est saisie APRÈS coup voit sa date passer de son origine à
  // l'événement — statut inchangé, date déplacée. La règle 2 le veut ainsi
  // (« le ponctuel soldé est daté de sa mise en service, à défaut de
  // l'origine ») ; sans ce motif l'écart tombait en `inexplique` et faisait
  // sortir le script en 1 sur un comportement que l'ADR a décidé. Quatorze
  // obligations `mise_en_service_uniquement` sont livrées : le cas est
  // atteignable sur un dossier réel.
  if (
    (apres.source === "mise_en_service" ||
      apres.source === "ponctuel_ouvert" ||
      apres.source === "ponctuel_solde") &&
    faits.miseEnService !== null
  ) {
    return "mise_en_service";
  }

  // « À planifier » à l'origine, alors que la date en base précédait le suivi :
  // le retard affiché comptait des jours où Rojer ne suivait pas la ligne.
  if (
    apres.source === "origine" &&
    avant.datePrevue.getTime() < debutDuJour(faits.origine).getTime()
  ) {
    return "retard_invente";
  }

  if (!dateExpliqueeParUnFait(avant.datePrevue, faits)) return "date_arbitraire";
  return "inexplique";
}

// ---------------------------------------------------------------------------
// L'état en base, le plan du moteur, et leur différence
// ---------------------------------------------------------------------------

export type Ecart = {
  /** L'identifiant de la ligne en base. */
  ligne: string;
  cleUnique: string;
  obligationId: string;
  equipementId: string | null;
  salarieId: string | null;
  avant: EtatLigne;
  apres: EtatLigne & { source: string | null };
  categorie: Categorie;
};

export type Comparaison = {
  /** Le plan que la prochaine régénération appliquerait. */
  plan: PlanReconciliation;
  ecarts: Ecart[];
  comptes: Record<Categorie, number>;
  /** Les lignes que la régénération CRÉERAIT : sans état en base, elles n'ont
   *  rien à comparer — comptées, pas classées. */
  aCreer: number;
};

function comptesVides(): Record<Categorie, number> {
  return Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Categorie, number>;
}

/**
 * Compare l'état EN BASE au plan du moteur courant, sur une même lecture.
 *
 * Seules les lignes que le plan garde ouvertes sont classées : celles qu'il
 * supprime ou archive sortent du calendrier, et leur date n'est plus lue. Pour
 * rassembler les faits d'une ligne, la ligne générée qui la rencontre est
 * retrouvée par sa clé — et, pour une ligne adoptée, par l'`obligationId` que
 * le plan lui écrit. Une ligne que la génération saute (rythme `autre`, boucle
 * NB4) n'a pas de faits de date : le réconciliateur ne touche pas sa date.
 */
export function comparerAuMoteur(lecture: LecturePasse, now: Date): Comparaison {
  const { existantes, aGenerer, options } = preparer(lecture, now);
  const plan = reconcilierCalendrier(existantes, aGenerer, options);
  const generees = new Map(aGenerer.map((g) => [g.cleUnique, g]));
  // Ce que les obligations retirées lèguent — la même table que le
  // réconciliateur consulte, pour que les faits rassemblés ici soient ceux
  // qu'il a lus.
  const heritage = heritageDesRetirees(existantes, options.successions);
  const herediteDe = (g: VerificationGenere): Date | null =>
    heritage.parCle.get(g.cleUnique) ??
    (g.equipementId === null && g.salarieId === null
      ? heritage.parObligation.get(g.obligationId)
      : undefined) ??
    null;

  const hors = new Set([...plan.aSupprimer, ...plan.aArchiver.map((a) => a.id)]);
  const misesAJour = new Map(plan.aMettreAJour.map((m) => [m.id, m]));
  const comptes = comptesVides();
  const ecarts: Ecart[] = [];

  for (const ex of existantes) {
    if (hors.has(ex.id)) continue;
    const m = misesAJour.get(ex.id);
    const avant: EtatLigne = { datePrevue: ex.datePrevue, statut: ex.statut };
    const apres = {
      datePrevue: m?.datePrevue ?? ex.datePrevue,
      statut: m?.statut ?? ex.statut,
      source: m?.source ?? null,
    };
    const cle = cleDeLigne(m?.obligationId ?? ex.obligationId, {
      equipementId: ex.equipementId,
      salarieId: ex.salarieId ?? null,
    });
    const g = generees.get(cle);
    const faits: FaitsDeLigne =
      g === undefined
        ? {
            periodicite: ex.periodicite,
            premierPas: ex.periodicite,
            dateDuTitre: null,
            realisation: null,
            realisationHeritee: null,
            miseEnService: null,
            origine: ex.suiviDepuis ?? now,
          }
        : faitsDeLigne(g, ex, herediteDe(g), now);
    const categorie = classerEcart({ avant, apres, faits });
    comptes[categorie] += 1;
    ecarts.push({
      ligne: ex.id,
      cleUnique: cle,
      obligationId: m?.obligationId ?? ex.obligationId,
      equipementId: ex.equipementId,
      salarieId: ex.salarieId ?? null,
      avant,
      apres,
      categorie,
    });
  }

  return { plan, ecarts, comptes, aCreer: plan.aCreer.length };
}

// ---------------------------------------------------------------------------
// L'export : des identifiants, jamais un libellé
// ---------------------------------------------------------------------------
//
// POURQUOI UNE PROJECTION, ET PAS `JSON.stringify(plan)` (relecture neutre du
// 2026-09-18). Sérialisés en entier, les plans portent des NOMS DE PERSONNES :
// une ligne de titre naît avec `raisons: ["titre détenu par Prénom Nom"]`
// (`generateur.ts`), et `libelleObligation` vaut, pour une ligne sur mesure, le
// libellé de la prescription — qui nomme couramment l'assureur ou l'autorité.
// La sortie console n'imprimait que des identifiants ; le fichier `--json`, lui,
// emportait tout, et le mode d'emploi affirmait le contraire.
//
// La règle est donc celle de la sortie console, appliquée au fichier : des
// identifiants, des dates, des statuts, des rythmes. Rien qui vienne d'une
// saisie d'utilisateur. La liste est EXPLICITE et non « tout sauf » : un champ
// ajouté à `VerificationGenere` ou à `OccurrenceExistante` reste dehors par
// défaut, au lieu d'entrer dans l'export sans que personne ne le décide.

/** Une ligne en base, réduite à ce qui s'exporte. */
export type LigneExportee = {
  id: string;
  obligationId: string;
  equipementId: string | null;
  salarieId: string | null;
  periodicite: Periodicite;
  datePrevue: Date;
  statut: string;
  archiveLe: Date | null;
  prescriptionId: string | null;
  suiviDepuis: Date | null;
  porteUnePreuve: boolean;
  derniereRealisation: Date | null;
  dernierResultat: string | null;
};

/** Un plan, réduit à ce qui s'exporte. */
export type PlanExporte = {
  aCreer: {
    cleUnique: string;
    obligationId: string;
    equipementId: string | null;
    salarieId: string | null;
    periodicite: Periodicite;
    datePrevue: Date;
    statut: string;
    prescriptionId: string | null;
    /** Les sources de calcul : des dates et un rythme, aucun libellé. */
    sources: VerificationGenere["sources"];
  }[];
  aMettreAJour: {
    id: string;
    obligationId: string;
    periodicite: Periodicite;
    datePrevue: Date;
    statut: string;
    prescriptionId: string | null;
    source: string | null;
  }[];
  aArchiver: string[];
  aDesarchiver: string[];
  aSupprimer: string[];
  inchangees: number;
};

export function projeterLigne(ex: OccurrenceExistante): LigneExportee {
  return {
    id: ex.id,
    obligationId: ex.obligationId,
    equipementId: ex.equipementId,
    salarieId: ex.salarieId ?? null,
    periodicite: ex.periodicite,
    statut: ex.statut,
    datePrevue: ex.datePrevue,
    archiveLe: ex.archiveLe ?? null,
    prescriptionId: ex.prescriptionId ?? null,
    suiviDepuis: ex.suiviDepuis ?? null,
    porteUnePreuve: ex.porteUnePreuve,
    derniereRealisation: ex.derniereRealisation ?? null,
    dernierResultat: ex.dernierResultat ?? null,
  };
}

export function projeterPlan(plan: PlanReconciliation): PlanExporte {
  return {
    aCreer: plan.aCreer.map((v) => ({
      cleUnique: v.cleUnique,
      obligationId: v.obligationId,
      equipementId: v.equipementId,
      salarieId: v.salarieId,
      periodicite: v.periodicite,
      datePrevue: v.datePrevue,
      statut: v.statut,
      prescriptionId: v.prescriptionId,
      sources: v.sources,
    })),
    aMettreAJour: plan.aMettreAJour.map((m) => ({
      id: m.id,
      obligationId: m.obligationId,
      periodicite: m.periodicite,
      datePrevue: m.datePrevue,
      statut: m.statut,
      prescriptionId: m.prescriptionId,
      source: m.source ?? null,
    })),
    aArchiver: plan.aArchiver.map((a) => a.id),
    aDesarchiver: plan.aDesarchiver.map((d) => d.id),
    aSupprimer: [...plan.aSupprimer],
    inchangees: plan.inchangees,
  };
}

// ---------------------------------------------------------------------------
// L'idempotence temporelle : appliquer le plan candidat en mémoire, replanifier
// ---------------------------------------------------------------------------

/**
 * L'état des lignes APRÈS application d'un plan, en mémoire — ce que la base
 * porterait si `actions.ts` l'avait écrit — y compris `suiviDepuis = now` sur
 * les lignes créées, comme `actions.ts` l'écrit. Les lignes créées naissent sans
 * preuve, sans réalisation, suivies depuis `now`.
 */
export function appliquerPlanEnMemoire(
  existantes: OccurrenceExistante[],
  plan: PlanReconciliation,
  now: Date,
): OccurrenceExistante[] {
  const supprimees = new Set(plan.aSupprimer);
  const misesAJour = new Map(plan.aMettreAJour.map((m) => [m.id, m]));
  const archivees = new Set(plan.aArchiver.map((a) => a.id));
  const desarchivees = new Set(plan.aDesarchiver.map((d) => d.id));

  const apres: OccurrenceExistante[] = [];
  for (const ex of existantes) {
    if (supprimees.has(ex.id)) continue;
    const m = misesAJour.get(ex.id);
    if (m !== undefined) {
      apres.push({
        ...ex,
        obligationId: m.obligationId,
        libelleObligation: m.libelleObligation,
        periodicite: m.periodicite,
        realisateurRequis: m.realisateurRequis,
        datePrevue: m.datePrevue,
        statut: m.statut,
        prescriptionId: m.prescriptionId,
        archiveLe: null,
      });
      continue;
    }
    if (archivees.has(ex.id)) {
      apres.push({ ...ex, archiveLe: now });
      continue;
    }
    if (desarchivees.has(ex.id)) {
      apres.push({ ...ex, archiveLe: null });
      continue;
    }
    apres.push(ex);
  }
  for (const v of plan.aCreer) {
    apres.push({
      id: `neuve:${v.cleUnique}`,
      obligationId: v.obligationId,
      equipementId: v.equipementId,
      salarieId: v.salarieId,
      libelleObligation: v.libelleObligation,
      periodicite: v.periodicite,
      realisateurRequis: v.realisateurRequis,
      datePrevue: v.datePrevue,
      statut: v.statut,
      porteUnePreuve: false,
      derniereRealisation: null,
      dernierResultat: null,
      archiveLe: null,
      prescriptionId: v.prescriptionId,
      suiviDepuis: now,
    });
  }
  return apres;
}

/** Un plan qui n'écrirait rien. */
export function planVide(plan: PlanReconciliation): boolean {
  return (
    plan.aCreer.length === 0 &&
    plan.aMettreAJour.length === 0 &&
    plan.aArchiver.length === 0 &&
    plan.aDesarchiver.length === 0 &&
    plan.aSupprimer.length === 0
  );
}

/**
 * Rejoue le plan : appliqué en mémoire, puis replanifié à `plusTard`. Rend le
 * second plan — qui doit être VIDE : une fonction sans horloge rend la même
 * date quel que soit le jour, donc rien à réécrire. Un second plan non vide
 * nomme les lignes fautives.
 *
 * Réserve, écrite : `appliquerPrescriptions` lit `plusTard` pour la `dateFin`
 * des prescriptions. Une prescription qui expire entre `now` et `plusTard`
 * change légitimement les lignes qu'elle portait ; ce n'est pas un défaut
 * d'idempotence, et le script le dit à côté du résultat.
 */
export function rejouerPlusTard(
  lecture: LecturePasse,
  plan: PlanReconciliation,
  now: Date,
  plusTard: Date,
): PlanReconciliation {
  const existantes = appliquerPlanEnMemoire(lecture.existantes, plan, now);
  return planifier({ ...lecture, existantes }, plusTard);
}

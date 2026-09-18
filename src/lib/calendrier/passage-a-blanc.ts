// Le passage à blanc de l'ADR-036 (lot 2c, 2026-09-18) : deux plans sur une
// même lecture, leur différence ligne à ligne, et le classement de chaque écart.
//
// C'est la méthode « Scientist » : le nouveau calcul tourne À CÔTÉ de l'ancien,
// on journalise les écarts SANS RIEN ÉCRIRE, puis on bascule. Ce module est la
// partie pure de l'outil ; `scripts/passage-a-blanc-echeances.ts` lui apporte
// la lecture, en transaction `READ ONLY`, et imprime.
//
// ⚠ RIEN EN PRODUCTION N'IMPORTE CE MODULE. Il importe `echeance-de-ligne.ts`
// (ses types) et `decision-par-faits.ts` ; la garde de
// `echeance-de-ligne.test.ts` l'autorise nommément.
//
// LES CATÉGORIES, dans l'ordre où elles sont essayées — le premier motif qui
// tient l'emporte :
//
//   legs_statut_realise  un ponctuel au statut réalisé sans rapport : la garde
//                        de `deciderParFaits` le conserve ; compté à part pour
//                        savoir combien la production en porte (lot 5 : retirer
//                        la garde s'il n'y en a aucun) ;
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
//                        (S3, D3, le rythme allongé) ;
//   mise_en_service      la date nouvelle sort de la mise en service, que la
//                        date en base ne connaissait pas ou connaissait
//                        autrement (S4, S5, un ponctuel daté de `now`) ;
//   retard_invente       la ligne passe « à planifier » à son origine alors que
//                        la date en base était ANTÉRIEURE au suivi : un retard
//                        compté sur des jours où Rojer ne suivait rien ;
//   date_arbitraire      la date en base n'est expliquée par AUCUN fait — ni
//                        l'origine, ni la mise en service, ni une ancre plus un
//                        rythme, ni la pièce. Les seeds de démonstration en
//                        posent (`etaler-echeances-demo.ts`) ;
//   inexplique           la date en base est expliquée par un fait, et pourtant
//                        aucun motif ci-dessus ne nomme l'écart. C'est le
//                        critère de sortie : ZÉRO `inexplique`.

import { cleJourCivil, debutDuJour } from "@/lib/dates";
import { PERIODICITE_CALENDAIRE, type Periodicite } from "@/lib/referentiels/types-communs";
import {
  STRATEGIE_FAITS,
  creerParFaits,
  estLegsStatutRealise,
  faitsDeLigne,
} from "./decision-par-faits";
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
  "legs_statut_realise",
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
  /** Ce que la stratégie en ligne écrirait (ou laisserait). */
  avant: EtatLigne;
  /** Ce que la stratégie candidate écrirait, et d'où sort sa date. */
  apres: EtatLigne & { source: string | null };
  /** Les faits que la candidate a lus. */
  faits: FaitsDeLigne;
  /** La ligne est-elle le legs protégé (`estLegsStatutRealise`) ? */
  legs: boolean;
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
  if (e.legs) return "legs_statut_realise";

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
    default:
      break;
  }

  // La date nouvelle sort de la mise en service, et la date en base ne
  // s'expliquait pas par elle : mise en service ajoutée ou corrigée après
  // coup (S4, S5), ponctuel daté de `now` au lieu de l'événement.
  if (
    (apres.source === "mise_en_service" || apres.source === "ponctuel_ouvert") &&
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
// Les deux plans, et leur différence
// ---------------------------------------------------------------------------

export type Ecart = {
  /** L'identifiant de la ligne en base, ou `à créer` pour une ligne neuve. */
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
  planConservation: PlanReconciliation;
  planFaits: PlanReconciliation;
  ecarts: Ecart[];
  comptes: Record<Categorie, number>;
};

function comptesVides(): Record<Categorie, number> {
  return Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Categorie, number>;
}

/** Ce que chaque ligne existante porte sous un plan : la mise à jour si le plan
 *  en a une, sinon la ligne telle qu'elle est. Les lignes supprimées ou
 *  archivées par le plan n'y figurent pas — ces décisions ne dépendent pas de
 *  la stratégie, les deux plans les partagent. */
function etatsSousLePlan(
  existantes: OccurrenceExistante[],
  plan: PlanReconciliation,
): Map<string, EtatLigne & { source: string | null }> {
  const hors = new Set([...plan.aSupprimer, ...plan.aArchiver.map((a) => a.id)]);
  const etats = new Map<string, EtatLigne & { source: string | null }>();
  for (const ex of existantes) {
    if (hors.has(ex.id)) continue;
    etats.set(ex.id, { datePrevue: ex.datePrevue, statut: ex.statut, source: null });
  }
  for (const m of plan.aMettreAJour) {
    if (hors.has(m.id)) continue;
    etats.set(m.id, { datePrevue: m.datePrevue, statut: m.statut, source: m.source ?? null });
  }
  return etats;
}

/**
 * La ligne générée qui rencontre une ligne existante — par sa clé, ou par
 * adoption (clé d'un prédécesseur). Sert à retrouver les `sources` d'une ligne
 * mise à jour, pour rassembler ses faits.
 */
function indexerGenerees(aGenerer: VerificationGenere[]): Map<string, VerificationGenere> {
  const index = new Map<string, VerificationGenere>();
  for (const g of aGenerer) index.set(g.cleUnique, g);
  return index;
}

/**
 * Compare les deux stratégies sur une même lecture. Les lignes générées sont
 * refaites ici par `planifier` ; pour rassembler les faits d'une ligne mise à
 * jour, la ligne générée qui la rencontre est retrouvée par sa clé — et, pour
 * une ligne adoptée, par l'`obligationId` que le plan lui écrit.
 */
export function comparerStrategies(lecture: LecturePasse, now: Date): Comparaison {
  const entrees = preparer(lecture, now);
  const { existantes, aGenerer, options } = entrees;
  const planConservation = reconcilierCalendrier(existantes, aGenerer, options);
  const planFaits = reconcilierCalendrier(existantes, aGenerer, options, STRATEGIE_FAITS);
  const generees = indexerGenerees(aGenerer);
  // Ce que les obligations retirées lèguent — la même table que le
  // réconciliateur consulte, pour que les faits rassemblés ici soient ceux
  // que la stratégie candidate a lus.
  const heritage = heritageDesRetirees(existantes, options.successions);

  const avantParId = etatsSousLePlan(existantes, planConservation);
  const apresParId = etatsSousLePlan(existantes, planFaits);
  const comptes = comptesVides();
  const ecarts: Ecart[] = [];

  const herediteDe = (g: VerificationGenere): Date | null =>
    heritage.parCle.get(g.cleUnique) ??
    (g.equipementId === null && g.salarieId === null
      ? heritage.parObligation.get(g.obligationId)
      : undefined) ??
    null;

  for (const ex of existantes) {
    const avant = avantParId.get(ex.id);
    const apres = apresParId.get(ex.id);
    if (avant === undefined || apres === undefined) continue;

    // La ligne générée : par la clé de la ligne, ou — ligne adoptée — par
    // l'identifiant d'obligation que le plan candidat lui écrit.
    const adoptee = planFaits.aMettreAJour.find((m) => m.id === ex.id);
    const cle = cleDeLigne(adoptee?.obligationId ?? ex.obligationId, {
      equipementId: ex.equipementId,
      salarieId: ex.salarieId ?? null,
    });
    const g = generees.get(cle);
    // Une ligne que la génération saute (rythme `autre`, boucle NB4) n'a pas de
    // faits à rassembler : les deux stratégies la laissent au réconciliateur,
    // qui ne touche pas sa date. Elle est identique par construction.
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
    const legs = g !== undefined && estLegsStatutRealise(ex, g.periodicite);
    const categorie = classerEcart({ avant, apres, faits, legs });
    comptes[categorie] += 1;
    ecarts.push({
      ligne: ex.id,
      cleUnique: cle,
      obligationId: adoptee?.obligationId ?? ex.obligationId,
      equipementId: ex.equipementId,
      salarieId: ex.salarieId ?? null,
      avant: { datePrevue: avant.datePrevue, statut: avant.statut },
      apres,
      categorie,
    });
  }

  // Les lignes À CRÉER : les deux plans en créent les mêmes, par clé.
  const creeesFaits = new Map(planFaits.aCreer.map((v) => [v.cleUnique, v]));
  for (const c of planConservation.aCreer) {
    const f = creeesFaits.get(c.cleUnique);
    if (f === undefined) continue;
    const g = generees.get(c.cleUnique) ?? c;
    const heritee = herediteDe(g);
    const faits = faitsDeLigne(g, null, heritee, now);
    // `aCreer` ne porte pas la source ; la décision est déterministe, on la
    // redemande à la stratégie pour la nommer dans l'écart.
    const source = creerParFaits({ g, heritee, now }).source ?? null;
    const apres = { datePrevue: f.datePrevue, statut: f.statut, source };
    const categorie = classerEcart({
      avant: { datePrevue: c.datePrevue, statut: c.statut },
      apres,
      faits,
      legs: false,
    });
    comptes[categorie] += 1;
    ecarts.push({
      ligne: "à créer",
      cleUnique: c.cleUnique,
      obligationId: c.obligationId,
      equipementId: c.equipementId,
      salarieId: c.salarieId,
      avant: { datePrevue: c.datePrevue, statut: c.statut },
      apres,
      categorie,
    });
  }

  return { planConservation, planFaits, ecarts, comptes };
}

// ---------------------------------------------------------------------------
// L'idempotence temporelle : appliquer le plan candidat en mémoire, replanifier
// ---------------------------------------------------------------------------

/**
 * L'état des lignes APRÈS application d'un plan, en mémoire — ce que la base
 * porterait si `actions.ts` l'avait écrit. Les lignes créées naissent sans
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
 * Rejoue le plan candidat : appliqué en mémoire, puis replanifié à `plusTard`
 * avec la même stratégie. Rend le second plan — qui doit être VIDE : une
 * fonction sans horloge rend la même date quel que soit le jour, donc rien à
 * réécrire. Un second plan non vide nomme les lignes fautives.
 *
 * Réserve, écrite : `appliquerPrescriptions` lit `plusTard` pour la `dateFin`
 * des prescriptions. Une prescription qui expire entre `now` et `plusTard`
 * change légitimement les lignes qu'elle portait ; ce n'est pas un défaut
 * d'idempotence, et le script le dit à côté du résultat.
 */
export function rejouerPlusTard(
  lecture: LecturePasse,
  planFaits: PlanReconciliation,
  now: Date,
  plusTard: Date,
): PlanReconciliation {
  const existantes = appliquerPlanEnMemoire(lecture.existantes, planFaits, now);
  return planifier({ ...lecture, existantes }, plusTard, STRATEGIE_FAITS);
}

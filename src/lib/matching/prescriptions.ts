import { cleJourCivil } from "@/lib/dates";
// Depuis le module feuille, pas depuis `prescriptions/schema.ts` : celui-ci
// importe `estPeriodicitePlusStricte` d'ici, et passer par lui refermerait le
// cycle que `sources.ts` a été créé pour ouvrir.
import {
  MARQUAGE_CONTRACTUEL,
  estSourceContractuelle,
  type SourcePrescription,
} from "@/lib/prescriptions/sources";
import {
  PERIODICITE_EN_JOURS,
  type Periodicite,
} from "@/lib/referentiels/types-communs";
import type {
  EquipementMatching,
  ObligationApplicable,
  ObligationSurMesureApplicable,
  PrescriptionIgnoree,
  PrescriptionMatching,
} from "./types";

/**
 * Prescriptions particulières propres à un établissement — ADR-035.
 *
 * Le matching du référentiel s'exécute d'abord, inchangé. Cette fonction
 * pure module ensuite son résultat pour UN établissement :
 *
 *   - `renforce_periodicite` : resserre, par équipement, la périodicité d'une
 *     obligation que le référentiel rend applicable ici. Jamais plus souple :
 *     les textes qui prévoient un allègement (C. env. L. 512-7-3, arrêté du
 *     25 juin 1980 art. GE 4 § 3) le subordonnent à une procédure que l'outil
 *     ne peut pas vérifier, et l'exploitant reste tenu de faire vérifier ses
 *     installations quoi qu'en dise l'administration (CCH R. 143-34).
 *   - `obligation_sur_mesure` : ajoute une obligation hors référentiel,
 *     déclenchée par une catégorie d'équipement ou un équipement précis.
 *
 * Tout ce qui n'est pas appliqué est rendu dans `ignorees` avec une raison
 * en français — mode explain, comme le moteur. Rien n'est appliqué ni écarté
 * en silence.
 */

/** Préfixe de `Verification.obligationId` pour les obligations sur mesure. */
export const PREFIXE_PRESCRIPTION = "prescription:";

export function estObligationSurMesure(obligationId: string): boolean {
  return obligationId.startsWith(PREFIXE_PRESCRIPTION);
}

/**
 * `candidate` est-elle strictement plus stricte que `reference` ?
 *
 * Une périodicité sans échéance (`mise_en_service_uniquement`, `autre`,
 * `null` en jours) est « infiniment longue » : n'importe quel rythme daté la
 * renforce. Deux périodicités sans échéance ne se renforcent pas.
 */
export function estPeriodicitePlusStricte(
  candidate: Periodicite,
  reference: Periodicite,
): boolean {
  const c = PERIODICITE_EN_JOURS[candidate];
  const r = PERIODICITE_EN_JOURS[reference];
  if (c === null) return false;
  if (r === null) return true;
  return c < r;
}

export type ResultatPrescriptions = {
  applicables: ObligationApplicable[];
  surMesure: ObligationSurMesureApplicable[];
  ignorees: PrescriptionIgnoree[];
};

/**
 * Libellés en milieu de phrase — minuscule initiale, d'où la table locale
 * plutôt que `LABEL_SOURCE_PRESCRIPTION`, qui est faite pour un sélecteur.
 *
 * `Record<SourcePrescription, …>` et non `Record<string, …>` : le `??
 * "prescription"` qui fermait la fonction transformait tout oubli en mot
 * générique plausible. Une demande d'assureur s'y serait fondue — c'est
 * précisément la ligne qui doit se distinguer (ADR-032). Le cliquet est le
 * type : une source ajoutée à l'enum sans entrée ici ne compile pas.
 */
const LIBELLE_SOURCE_EN_PHRASE: Record<SourcePrescription, string> = {
  arrete_prefectoral: "arrêté préfectoral",
  arrete_municipal: "arrêté municipal",
  pv_commission_securite: "PV de la commission de sécurité",
  arrete_icpe: "arrêté préfectoral ICPE",
  inspection_travail: "demande de l'inspection du travail",
  demande_assureur: "demande de votre assureur",
  autre: "prescription",
};

function libelleSource(p: PrescriptionMatching): string {
  // `cleJourCivil` et non `toISOString()` : les dates d'acte sont stockées à
  // minuit **Paris** (ADR-011), soit 22:00 ou 23:00 UTC la veille — un slice
  // de l'ISO affichait donc systématiquement le jour précédent.
  const date = cleJourCivil(p.dateDocument);
  return `${LIBELLE_SOURCE_EN_PHRASE[p.source]} ${p.reference} du ${date}`;
}

/**
 * Suffixe de marquage, ajouté aux raisons que le moteur rend en clair.
 *
 * Les `raisons` d'une obligation sur mesure et la `raison` d'une surcharge
 * voyagent jusqu'au calendrier, au registre et au dossier de contrôle : les
 * marquer à la source, c'est marquer d'un coup les surfaces qui les recopient,
 * sans dépendre du fait que chacune y ait pensé.
 */
function suffixeMarquage(p: PrescriptionMatching): string {
  return estSourceContractuelle(p.source) ? ` ${MARQUAGE_CONTRACTUEL}` : "";
}

/**
 * La prescription est-elle encore en vigueur à `now` ? Exporté pour que
 * l'affichage distingue « levée » (fin d'effet datée, atteinte) de « ignorée »
 * (recevable mais sans effet ici) sans avoir à reconnaître un message.
 */
export function prescriptionEnVigueur(
  // La seule date lue : la suppression d'une prescription pose aussi la
  // question, sur une lecture réduite.
  p: Pick<PrescriptionMatching, "dateFin">,
  now: Date,
): boolean {
  return p.dateFin === null || p.dateFin.getTime() >= now.getTime();
}

export function appliquerPrescriptions(
  applicables: ObligationApplicable[],
  prescriptions: PrescriptionMatching[],
  equipements: EquipementMatching[],
  now: Date,
): ResultatPrescriptions {
  const ignorees: PrescriptionIgnoree[] = [];
  const surMesure: ObligationSurMesureApplicable[] = [];

  // Copie superficielle : le résultat du moteur n'est jamais muté.
  const parObligation = new Map<string, ObligationApplicable>();
  for (const oa of applicables) {
    parObligation.set(oa.obligation.id, {
      ...oa,
      surcharges: oa.surcharges ? { ...oa.surcharges } : undefined,
    });
  }

  // Ordre stable : par date de document puis par id, pour que deux
  // exécutions produisent le même résultat quel que soit l'ordre de lecture.
  const triees = [...prescriptions].sort(
    (a, b) =>
      a.dateDocument.getTime() - b.dateDocument.getTime() ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );

  for (const p of triees) {
    if (!prescriptionEnVigueur(p, now)) {
      ignorees.push({
        prescription: p,
        raison: `Prescription levée le ${cleJourCivil(p.dateFin!)}.`,
      });
      continue;
    }

    if (p.effet === "renforce_periodicite") {
      if (!p.obligationId) {
        ignorees.push({ prescription: p, raison: "Aucune obligation ciblée." });
        continue;
      }
      const oa = parObligation.get(p.obligationId);
      if (!oa) {
        ignorees.push({
          prescription: p,
          raison:
            "L'obligation ciblée ne s'applique pas (ou plus) à votre établissement d'après le référentiel : la prescription n'a rien à renforcer.",
        });
        continue;
      }
      if (!estPeriodicitePlusStricte(p.periodicite, oa.obligation.periodicite)) {
        ignorees.push({
          prescription: p,
          raison: `Le référentiel impose déjà un rythme au moins aussi strict (${oa.obligation.periodicite}) : la prescription est rattrapée par le référentiel.`,
        });
        continue;
      }
      const cibles = p.equipementId
        ? oa.equipementsConcernes.filter((e) => e.id === p.equipementId)
        : oa.equipementsConcernes;
      if (cibles.length === 0) {
        ignorees.push({
          prescription: p,
          // Le motif générique parlerait d'un équipement que l'utilisateur
          // n'a jamais désigné. Une prescription qui renforce la périodicité
          // d'une obligation portée par l'établissement (ADR-022) n'a pas
          // d'équipement cible par construction : `equipementsConcernes` est
          // vide, et la boucle de surcharge, indexée par identifiant
          // d'équipement, n'a nulle part où écrire. C'est une limite du
          // modèle de surcharge, pas une erreur de saisie — et le dire est le
          // minimum tant qu'elle n'est pas levée.
          raison:
            oa.porteur === "etablissement"
              ? "Cette obligation porte sur l'établissement et non sur un appareil : le renforcement de périodicité ne sait pas encore s'y appliquer (ADR-022)."
              : "L'équipement visé n'est pas (ou plus) un déclencheur de cette obligation.",
        });
        continue;
      }
      const surcharges = { ...(oa.surcharges ?? {}) };
      let appliquee = false;
      for (const eq of cibles) {
        const existante = surcharges[eq.id];
        if (
          existante &&
          !estPeriodicitePlusStricte(p.periodicite, existante.periodicite)
        ) {
          continue; // une autre prescription est déjà au moins aussi stricte
        }
        surcharges[eq.id] = {
          periodicite: p.periodicite,
          prescriptionId: p.id,
          raison: `Périodicité portée à « ${p.periodicite} » par ${libelleSource(p)}.${suffixeMarquage(p)}`,
        };
        appliquee = true;
      }
      if (!appliquee) {
        ignorees.push({
          prescription: p,
          raison:
            "Une autre prescription impose déjà un rythme au moins aussi strict sur les mêmes équipements.",
        });
        continue;
      }
      parObligation.set(oa.obligation.id, { ...oa, surcharges });
      continue;
    }

    // obligation_sur_mesure
    const declencheurs = p.equipementId
      ? equipements.filter((e) => e.id === p.equipementId)
      : p.categorieEquipement
        ? equipements.filter((e) => e.categorie === p.categorieEquipement)
        : [];
    if (declencheurs.length === 0) {
      ignorees.push({
        prescription: p,
        raison: p.equipementId
          ? "L'équipement visé n'est plus déclaré (ou est désactivé)."
          : "Aucun équipement de cette catégorie n'est déclaré.",
      });
      continue;
    }
    surMesure.push({
      prescription: p,
      equipementsConcernes: declencheurs,
      raisons: [
        `Prescription propre à votre établissement : ${libelleSource(p)}.${suffixeMarquage(p)}`,
      ],
    });
  }

  return {
    applicables: applicables.map((oa) => parObligation.get(oa.obligation.id)!),
    surMesure,
    ignorees,
  };
}

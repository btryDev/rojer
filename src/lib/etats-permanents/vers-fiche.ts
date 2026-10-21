/**
 * D'une ligne d'état permanent à ce que la vignette et la fiche reçoivent
 * (`LigneCompacte`, `RevueEnPlace`). Partagé par l'écran « en place » et par
 * Équipe › « Évaluer les risques de vos salariés », où se déclarent les lignes
 * nées d'un fait d'activité (`par-les-risques.ts`) : une seule fiche, écrite
 * une fois — deux copies des mêmes props divergent à la première correction.
 *
 * Tout est sérialisé : dates en ISO.
 */

import type { FicheLigne } from "@/components/etats-permanents/RevueEnPlace";
import type { EtatCourt } from "@/components/etats-permanents/LigneCompacte";
import { PHRASE_SANS_REPONSE } from "@/lib/matching/sans-reponse";
import {
  GROUPE_REPLI,
  LIBELLE_GROUPE,
  LIBELLE_GROUPE_REPLI,
  LIBELLE_SOUS_CATEGORIE,
  type GroupeAffichage,
  type SousCategorie,
} from "./familles";
import { FOND_TEINTE, illustrationDe, teinteDe } from "./illustrations";
import { questionDe } from "./questions";
import type { LigneEtatPermanent } from "./queries";

/** Les phrases « à confirmer » des cinq faits d'activité (ADR-041). */
const PHRASES_FAITS_ACTIVITE = new Set<string>(
  (
    [
      "manutention_manuelle",
      "travail_ecran",
      "operations_electriques",
      "conduite_engins",
      "exposition_cmr",
    ] as const
  ).map((q) => PHRASE_SANS_REPONSE[q]),
);
const LIEN_RISQUES = "Répondre dans « Évaluer les risques de vos salariés »";
const LIEN_FICHE = "Répondre sur la fiche de l'établissement";

export function groupeDe(l: LigneEtatPermanent): GroupeAffichage {
  return l.obligation.usageEcran?.groupe ?? GROUPE_REPLI;
}

export function sousDe(l: LigneEtatPermanent): SousCategorie | null {
  return l.obligation.usageEcran?.sous ?? null;
}

/** Le mot court sous le libellé de la vignette. */
export function etatCourtDe(l: LigneEtatPermanent): EtatCourt {
  if (l.parLesTitres) return l.parLesTitres.enPlace ? "titres" : "titres-manquants";
  return l.declareLe ? "declare" : "a-declarer";
}

/** Le dessin et sa teinte de fond, pour la vignette comme pour la fiche. */
export function dessinDe(l: LigneEtatPermanent): { illustration: string; fond: string } {
  const groupe = groupeDe(l);
  const sous = sousDe(l);
  return {
    illustration: illustrationDe(l.obligation.id, groupe, sous),
    fond: FOND_TEINTE[teinteDe(groupe, sous)],
  };
}

export function versFiche(
  l: LigneEtatPermanent,
  contexte: {
    etablissementId: string;
    entrepriseId: string;
    /** Le sur-titre imposé par la page ; sinon famille · étape. */
    surTitre?: string;
  },
): FicheLigne {
  const { etablissementId: id } = contexte;
  const groupe = groupeDe(l);
  const sous = sousDe(l);
  // OÙ RÉPONDRE (2026-10-20, relevé par la propriétaire). Le lien menait
  // toujours à `/modifier`, qui ne pose pas les cinq questions d'activité :
  // elles vivent dans Équipe › « Évaluer les risques de vos salariés »
  // (ADR-041). Les autres questions (EPI, chambres, SSI…) restent sur la fiche.
  const ouRepondre = (phrases: string[]) =>
    phrases.every((p) => PHRASES_FAITS_ACTIVITE.has(p))
      ? { phrases, href: `/etablissements/${id}/equipe/risques`, lien: LIEN_RISQUES }
      : { phrases, href: `/etablissements/${id}/modifier`, lien: LIEN_FICHE };
  return {
    obligationId: l.obligation.id,
    libelle: l.obligation.libelle,
    question: questionDe(l.obligation.id, l.obligation.libelle),
    surTitre:
      contexte.surTitre ??
      (l.mode === "fait"
        ? "Ce qui revient"
        : [
            groupe === GROUPE_REPLI ? LIBELLE_GROUPE_REPLI : LIBELLE_GROUPE[groupe],
            sous ? LIBELLE_SOUS_CATEGORIE[sous] : null,
          ]
            .filter(Boolean)
            .join(" · ")),
    ...dessinDe(l),
    mode: l.mode,
    declareLe: l.declareLe ? l.declareLe.toISOString() : null,
    pieceAttendue: l.pieceAttendue,
    fondement: l.fondement,
    parLesTitres: l.parLesTitres
      ? {
          phrase: l.parLesTitres.phrase,
          hrefEquipe: `/etablissements/${id}/equipe`,
          enPlace: l.parLesTitres.enPlace,
        }
      : null,
    aConfirmer: l.aConfirmer
      ? { phrase: l.aConfirmer, entrepriseId: contexte.entrepriseId }
      : null,
    questionsSansReponse:
      l.questionsSansReponse.length > 0 ? ouRepondre(l.questionsSansReponse) : null,
  };
}

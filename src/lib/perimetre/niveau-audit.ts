// Les obligations au NIVEAU AUDIT qui peuvent concerner ce dossier (ADR-042).
//
// DÉCISION DE LA PROPRIÉTAIRE DU 2026-10-08, sur une remarque du préventeur :
// certaines obligations légales — les chiffons imprégnés en tête — sortent du
// quotidien de Rojer. Elles restent au référentiel, avec leur source, et le
// moteur ne les sert plus. La condition posée et acceptée : l'outil ne ment
// pas. Une obligation légale que Rojer ne suit plus au quotidien se NOMME, au
// dossier qu'elle peut concerner — c'est ce module.
//
// PAR ÉTABLISSEMENT, ET NON TOUTES À TOUS. Le calcul est celui du moteur, sans
// la porte du niveau (`determineObligationsNiveauAudit`) : même typologie,
// mêmes équipements déclencheurs, même règle du non-renseigné. Il ne coûte
// rien de plus qu'un appel au moteur, et il épargne au bureau sans masque
// respiratoire la vérification des masques. Le silence d'une réponse ne
// retire rien : une question sans réponse garde la ligne (« peut concerner »).
//
// Les obligations portées par un SALARIÉ font exception : le moteur ne sait
// pas qui détient un titre (ADR-023). Elles sont nommées à tout employeur.
//
// CE QUE CE MODULE NE FAIT JAMAIS. Aucun total, aucun score, aucune date,
// aucune qualification. Il dit ce que l'OUTIL ne suit pas, jamais ce que le
// dirigeant aurait omis.
//
// Module pur : l'établissement et son parc lui sont donnés.

import { determineObligationsNiveauAudit } from "@/lib/matching/engine";
import type {
  EquipementMatching,
  EtablissementMatching,
} from "@/lib/matching/types";
import { LABEL_CATEGORIE_EQUIPEMENT } from "@/lib/equipements/labels";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import { estNiveauAudit } from "@/lib/referentiels/conformite/niveau-audit";
import {
  estPorteeParSalarie,
  type Obligation,
} from "@/lib/referentiels/conformite/types";

/** Une obligation au niveau audit, telle que la page la nomme. */
export type LigneNiveauAudit = {
  id: string;
  libelle: string;
  /** Le texte fondateur, tel que le référentiel le cite (premier rang). */
  reference: string;
  /** Le lien vers le texte, quand le référentiel en porte un. */
  url: string | null;
  /**
   * Ce qui la ferait s'appliquer ici, en une phrase descriptive — ou `null`
   * quand elle n'apprendrait rien (2026-10-18).
   */
  porteePar: string | null;
};

/**
 * Le geste, sur chaque carte (2026-10-18). La rubrique disait « elle reste
 * due si le texte vous concerne », puis chaque carte répétait « Vise
 * l'établissement lui-même » : rien ne disait au dirigeant quoi faire. La
 * phrase nomme le geste et ce que l'outil ne fera pas, sans qualifier
 * personne.
 */
export const GESTE_HORS_QUOTIDIEN =
  "À tenir vous-même : Rojer ne vous le rappellera pas.";

function porteePar(
  o: Obligation,
  equipements: readonly Pick<EquipementMatching, "categorie">[],
): string | null {
  if (estPorteeParSalarie(o)) {
    return "Concerne chaque personne qui détiendrait ce titre.";
  }
  if (equipements.length > 0) {
    // Le LIBELLÉ de la catégorie, jamais le code de l'enum : « EPI_RESPIRATOIRE »
    // n'est pas un mot que le dirigeant a déclaré. Une catégorie nommée une
    // fois, même pour trois appareils.
    const categories = [
      ...new Set(equipements.map((e) => LABEL_CATEGORIE_EQUIPEMENT[e.categorie])),
    ];
    return `Vise ${equipements.length > 1 ? "les équipements déclarés" : "l'équipement déclaré"} : ${categories.join(", ")}.`;
  }
  // ~~« Vise l'établissement lui-même. »~~ — 2026-10-18 : répété sur chaque
  // carte, il n'apprenait rien. Le silence dit la même chose.
  return null;
}

/**
 * Les obligations au niveau audit qui peuvent concerner ce dossier, dans
 * l'ordre du référentiel.
 */
export function obligationsNiveauAuditDuDossier(
  etab: EtablissementMatching,
  equipements: EquipementMatching[],
  obligations: Obligation[] = obligationsConformite,
): LigneNiveauAudit[] {
  const parId = new Map(
    determineObligationsNiveauAudit(etab, equipements, { obligations }).map(
      (a) => [a.obligation.id, a],
    ),
  );
  const out: LigneNiveauAudit[] = [];
  for (const o of obligations) {
    if (!estNiveauAudit(o)) continue;
    const applicable = parId.get(o.id);
    const salarie = estPorteeParSalarie(o) && etab.estEtablissementTravail;
    if (!applicable && !salarie) continue;
    const [fondement] = o.referencesLegales;
    out.push({
      id: o.id,
      libelle: o.libelle,
      reference: fondement.reference,
      url: fondement.url ?? null,
      porteePar: porteePar(o, applicable?.equipementsConcernes ?? []),
    });
  }
  return out;
}

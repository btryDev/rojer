/**
 * « Quand ça arrive » — ce qu'un FAIT rend dû à l'établissement (ADR-037).
 *
 * Une obligation événementielle n'a ni date, ni état, ni retard : elle
 * redevient due au fait suivant. Le calendrier la saute, et l'écran « Ce qui
 * doit être en place » la refuse — une case cochée mentirait le lendemain.
 * La fiche d'un salarié et celle d'un appareil présentent déjà les leurs
 * (`salaries/obligations-evenementielles.ts`, `equipements/fiche.ts`). Le
 * troisième porteur n'a pas de fiche : l'établissement EST le dossier. Ce
 * module est sa fiche, pour cette nature-là.
 *
 * ## Ce qu'il ne fait pas, et c'est délibéré
 *
 * Il ne lit AUCUNE table et n'écrit rien. Il n'y a rien à déclarer : le
 * dirigeant ne « signale » pas qu'un salarié a été embauché ou qu'un camion
 * est arrivé. Consigner des faits datés et leur rattacher une suite, c'est le
 * module Interventions que l'ADR-018 a retiré. Ce module DIT la règle ; il ne
 * dit jamais que rien n'est dû en ce moment.
 *
 * Module pur : pas de session, pas de Prisma. La page lui passe ce que le
 * moteur a besoin de savoir, comme elle le fait pour les états permanents.
 */

import {
  determineObligationsApplicables,
  projeterEtablissement,
  type EquipementMatching,
  type EtablissementMatching,
} from "@/lib/matching";
import { LABEL_DOMAINE } from "@/lib/calendrier/labels";
import { estDeclencheeParUnFait } from "@/lib/etats-permanents/regle";
import {
  porteurDe,
  type DomaineObligation,
  type Obligation,
} from "@/lib/referentiels/conformite";

export type LigneQuandCaArrive = {
  obligation: Obligation;
  /** Le fait, dans les mots du texte. Jamais vide : voir `estPresentable`. */
  fait: string;
  /** L'écrit que le texte nomme, s'il en nomme un. */
  pieceAttendue: string | null;
  /** L'article fondateur, tel qu'il se cite. */
  article: string;
  /** Pourquoi le moteur la retient pour CE dossier. */
  raisons: string[];
};

export type GroupeQuandCaArrive = {
  domaine: DomaineObligation;
  libelle: string;
  lignes: LigneQuandCaArrive[];
};

/**
 * Cette obligation relève-t-elle de la page ?
 *
 * Trois conditions, et la règle de nature n'est pas redite : elle est APPELÉE.
 * `estDeclencheeParUnFait` est le prédicat dont les deux autres fiches se
 * servent ; une seconde lecture de « événementielle et sans rendez-vous »
 * finirait par diverger de celle-là.
 *
 * La périodicité lue est celle du RÉFÉRENTIEL. Une prescription particulière
 * (ADR-035) ne peut resserrer le rythme que d'un ÉQUIPEMENT — ses surcharges
 * sont indexées par identifiant d'appareil — : une obligation portée par
 * l'établissement n'en reçoit jamais.
 */
export function releveDeLaPage(
  o: Obligation,
  periodiciteEffective = o.periodicite,
): boolean {
  return (
    porteurDe(o) === "etablissement" &&
    estDeclencheeParUnFait(o, periodiciteEffective)
  );
}

/** Les lignes de la page pour ce dossier, groupées par domaine. */
export function listerQuandCaArrive(
  etablissement: EtablissementMatching,
  equipements: EquipementMatching[],
): GroupeQuandCaArrive[] {
  const parDomaine = new Map<DomaineObligation, LigneQuandCaArrive[]>();

  for (const app of determineObligationsApplicables(
    projeterEtablissement(etablissement),
    equipements,
  )) {
    const o = app.obligation;
    if (!releveDeLaPage(o)) continue;
    // Une ligne sans son fait n'aurait rien à dire. Le test du référentiel
    // interdit le cas ; on ne l'affiche pas à moitié s'il survenait.
    if (!o.faitGenerateur) continue;
    const lignes = parDomaine.get(o.domaine) ?? [];
    lignes.push({
      obligation: o,
      fait: o.faitGenerateur,
      pieceAttendue: o.pieceAttendue,
      article: o.referencesLegales[0].reference,
      raisons: app.raisons,
    });
    parDomaine.set(o.domaine, lignes);
  }

  return [...parDomaine.entries()]
    .map(([domaine, lignes]) => ({
      domaine,
      libelle: LABEL_DOMAINE[domaine],
      lignes: lignes.sort((a, b) =>
        a.obligation.libelle.localeCompare(b.obligation.libelle, "fr"),
      ),
    }))
    .sort((a, b) => a.libelle.localeCompare(b.libelle, "fr"));
}

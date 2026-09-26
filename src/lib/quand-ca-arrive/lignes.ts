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
  type SourceEtablissement,
  type ObligationApplicable,
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
  /**
   * TOUS les articles que l'obligation cite, fondateur en tête. Le fait montré
   * peut venir d'un autre que le premier : « lors de l'embauche et chaque fois
   * que nécessaire » est de `R. 4141-2`, troisième référence d'une obligation
   * fondée sur `L. 4141-1`. N'afficher que le fondateur citait à l'écran un
   * article qui ne dit pas la phrase affichée (contre-lecture du 2026-09-21).
   */
  articles: string[];
  /**
   * La description, ou `null` quand elle ne dit rien de plus que le fait.
   * Quand l'article n'a pas de ponctuation autour du fait, le fait est la
   * phrase entière — et la page la montrait deux fois (`R. 4624-33`,
   * contre-lecture du 2026-09-26).
   */
  description: string | null;
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

/**
 * Les lignes de la page, depuis ce que le moteur a retenu.
 *
 * SÉPARÉE de `listerQuandCaArrive` pour être ÉPROUVABLE : la première écriture
 * filtrait dans la boucle, et aucun test ne pouvait lui présenter une
 * obligation d'ÉQUIPEMENT portant un `faitGenerateur` — le champ est licite
 * hors du porteur établissement. La contre-lecture a retiré le filtre, posé un
 * fait sur `froid-controle-etancheite-apres-modification`, et la suite est
 * restée verte avec une ligne d'appareil sur la page. Le test lui passe
 * désormais une applicable fabriquée.
 */
export function lignesDepuis(
  applicables: readonly ObligationApplicable[],
): LigneQuandCaArrive[] {
  const lignes: LigneQuandCaArrive[] = [];
  for (const app of applicables) {
    const o = app.obligation;
    if (!releveDeLaPage(o)) continue;
    // Une ligne sans son fait n'aurait rien à dire. Le test du référentiel
    // interdit le cas ; on ne l'affiche pas à moitié s'il survenait.
    if (!o.faitGenerateur) continue;
    lignes.push({
      obligation: o,
      fait: o.faitGenerateur,
      pieceAttendue: o.pieceAttendue,
      articles: o.referencesLegales.map((r) => r.article ?? r.reference),
      description: memeTexte(o.description ?? "", o.faitGenerateur) ? null : (o.description ?? null),
    });
  }
  return lignes;
}

const nu = (t: string) => t.replace(/[\s.;:,]+$/u, "").trim();
const memeTexte = (a: string, b: string) => nu(a) === nu(b);

// L'ordre du Code : le numéro d'abord, puis L. avant R. avant D. — pas
// l'alphabet, qui rangerait tous les « D. » avant les « L. ».
const RANG_PARTIE: Record<string, number> = { L: 0, R: 1, D: 2 };
const cleDuCode = (l: LigneQuandCaArrive) => {
  const a = l.articles[0] ?? "";
  const m = /^([LRD])\.\s*(.*)$/.exec(a);
  return m ? `${m[2]} ${RANG_PARTIE[m[1]]}` : a;
};

/** Les lignes de la page pour ce dossier, groupées par domaine. */
export function listerQuandCaArrive(
  etablissement: SourceEtablissement,
  equipements: EquipementMatching[],
): GroupeQuandCaArrive[] {
  const parDomaine = new Map<DomaineObligation, LigneQuandCaArrive[]>();
  for (const ligne of lignesDepuis(
    determineObligationsApplicables(
      projeterEtablissement(etablissement),
      equipements,
    ),
  )) {
    const lignes = parDomaine.get(ligne.obligation.domaine) ?? [];
    lignes.push(ligne);
    parDomaine.set(ligne.obligation.domaine, lignes);
  }

  return [...parDomaine.entries()]
    .map(([domaine, lignes]) => ({
      domaine,
      libelle: LABEL_DOMAINE[domaine],
      // Dans l'ordre du Code, pas de l'alphabet : trié par libellé, le
      // document unique s'intercalait entre les trois lignes de la chaleur
      // intense (`R. 4463-4`, `-5`, `-7`), qui se lisent ensemble.
      lignes: lignes.sort((a, b) =>
        cleDuCode(a).localeCompare(cleDuCode(b), "fr", { numeric: true }),
      ),
    }))
    .sort((a, b) => a.libelle.localeCompare(b.libelle, "fr"));
}

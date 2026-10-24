/**
 * Ce que le widget « Ce qui doit être en place » du tableau de bord reçoit.
 *
 * **Même source que l'écran** : `etatsPermanentsDuDossier`, qui appelle
 * `listerEtatsPermanents` — la lecture de la page. Le widget ne refait ni la
 * sélection des obligations, ni la jointure des déclarations, ni l'ordre.
 *
 * ~~Il aplatit ce que l'écran affiche, ligne par ligne, dans l'ordre de
 * l'écran~~ (2026-10-17, contrôle visuel de c6 : 34 lignes, 3 811 px de haut,
 * et aucun compte — le widget recopiait l'écran au lieu de le résumer). Il
 * RÉSUME désormais : le compte de l'en-tête de page, puis chaque famille
 * présente avec son « x sur n » et l'ancre de sa section. Aucune ligne
 * individuelle ne traverse.
 *
 * **Aucun compte n'est refait ici.** Le compte de l'en-tête sort de
 * `compteDeLaPage` (`compte.ts`), que la page appelle aussi ; ceux des familles sont ceux que
 * `listerEtatsPermanents` a posés sur chaque famille, et l'ancre sort de
 * `ancreFamille`, qui pose l'`id` de la section. Le test du widget
 * (`components/dashboard/widgets/impl/etats-permanents.test.tsx`) rend la page
 * et le widget sur les mêmes dossiers et compare.
 *
 * Sérialisé côté serveur : des nombres et des chaînes, le corpus ne traverse pas.
 */

import { ancreFamille } from "./ancre";
import type { GroupeAffichage } from "./familles";
import { compteDeLaPage } from "./compte";
import type { EtatsPermanentsDuDossier } from "./queries";
import { compteParLEquipe } from "./par-l-equipe";

export type FamilleWidgetEtats = {
  groupe: GroupeAffichage;
  libelle: string;
  enPlace: number;
  total: number;
  /** L'`id` de la section sur l'écran — `ancreFamille`, comme la section. */
  ancre: string;
};

export type ResumeWidgetEtats = ReturnType<typeof compteDeLaPage> & {
  /** Les familles PRÉSENTES, dans l'ordre de l'écran — repli compris. */
  familles: FamilleWidgetEtats[];
  /** Le nombre de lignes « fait le » (« Ce qui revient »), hors compte. */
  faits: number;
  /**
   * Les formations, déclarées dans ~~Équipe › Formations~~ [2026-10-24 : section « Formations à organiser » d'Équipe] (`par-l-equipe.ts`,
   * ADR-047), affichées à part par le widget. ~~Les familles plus ce
   * compte font le compte de l'en-tête.~~ [2026-10-22 : l'en-tête ne les
   * compte plus, `compteDeLaPage` ; les familles seules le font.]
   */
  risques: ReturnType<typeof compteParLEquipe>;
};

export function resumeDuWidget(d: EtatsPermanentsDuDossier): ResumeWidgetEtats {
  return {
    ...compteDeLaPage(d),
    familles: d.familles.map((f) => ({
      groupe: f.groupe,
      libelle: f.libelle,
      enPlace: f.enPlace,
      total: f.total,
      ancre: ancreFamille(f.groupe),
    })),
    faits: d.faits.length,
    // TOUTES les lignes, celles qu'une réponse manquante cache comprises : le
    // total du dossier (et du score) les compte, et `etats-permanents.test`
    // tient l'égalité. La section d'Équipe, elle, compte ce qu'elle affiche
    // (`aOrganiserALEtablissement`) — revue qualité du 2026-10-24.
    risques: compteParLEquipe(d.parLEquipe),
  };
}

/*
 * ~~`lignesAffichees`, `lignesDuWidget`, `LigneWidgetEtat`~~ (retirés le
 * 2026-10-17, contrôle visuel de c6) : l'aplatissement ligne à ligne de
 * l'écran. Le widget n'affiche plus de ligne ; leur seul appelant était lui.
 */

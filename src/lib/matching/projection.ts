/**
 * La projection d'un `Etablissement` de base vers ce que le moteur lit.
 *
 * **Écrite une fois, parce que la recopier a déjà coûté un défaut.** Le guide
 * « Comprendre » et le générateur de calendrier construisaient chacun le même
 * objet de onze champs, à la main. Le premier n'en portait que neuf : un
 * établissement déclarant manipuler des matières `R. 4227-22` voyait son
 * calendrier engendrer trois obligations incendie quand la page n'en annonçait
 * qu'une. Le commentaire qui l'explique est toujours dans
 * `app/etablissements/[id]/guide/page.tsx`, et il commençait par affirmer que
 * les deux projections étaient identiques — elles ne l'étaient pas.
 *
 * Rendre les champs requis au type a empêché l'omission de compiler ; ça
 * n'empêche pas la troisième recopie de diverger le jour où un douzième champ
 * arrive. Une fonction, elle, l'empêche : ajouter un critère au moteur se fait
 * ici, et tous les appelants le reçoivent.
 *
 * C'est la même ligne que la garde du 2026-08-31 — **partage la règle, pas la
 * mise en page**. Une projection est une règle : elle dit ce que le moteur a le
 * droit de lire.
 */

import type { EtablissementMatching } from "./types";

/**
 * Les champs qu'un établissement doit porter pour être projeté. Volontairement
 * structurel plutôt que `Etablissement` de Prisma : le module `matching` est
 * **pur** — ni Prisma, ni React — et doit le rester pour rester testable sans
 * base.
 */
export type SourceEtablissement = Omit<
  EtablissementMatching,
  "effectifEntreprise"
> &
  (
    | {
        /**
         * L'effectif de l'entreprise se lit sur l'ENTREPRISE, pas sur
         * l'établissement (C37) : la projection le prend là où il vit, et
         * chaque requête doit charger `entreprise.effectif` — une requête qui
         * l'oublierait ne compile pas.
         */
        entreprise: { effectif: number };
      }
    /** Un établissement déjà projeté : la projection est idempotente. */
    | { effectifEntreprise: number }
  );

/**
 * Projette un établissement vers l'entrée du moteur.
 *
 * Le corps est une recopie champ à champ et non un `{...etab}` : l'étalement
 * laisserait passer les colonnes de base qui n'ont rien à faire dans le moteur
 * — raison sociale, adresse, `createdAt` — et un objet de matching qui porte
 * des champs que personne ne lit finit par en voir un lu par accident.
 */
export function projeterEtablissement(
  etab: SourceEtablissement,
): EtablissementMatching {
  return {
    id: etab.id,
    effectifSurSite: etab.effectifSurSite,
    effectifEntreprise:
      "effectifEntreprise" in etab
        ? etab.effectifEntreprise
        : etab.entreprise.effectif,
    estEtablissementTravail: etab.estEtablissementTravail,
    estERP: etab.estERP,
    estIGH: etab.estIGH,
    estHabitation: etab.estHabitation,
    typeErp: etab.typeErp,
    categorieErp: etab.categorieErp,
    classeIgh: etab.classeIgh,
      familleHabitation: etab.familleHabitation,
    personnesPresentesHabituellement: etab.personnesPresentesHabituellement,
    manipuleMatieresR422722: etab.manipuleMatieresR422722,
    comporteLocauxSommeilPublic: etab.comporteLocauxSommeilPublic,
  };
}

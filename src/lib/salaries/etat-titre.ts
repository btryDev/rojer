/**
 * L'état d'un titre de salarié — UNE règle, que lisent la fiche Équipe, le
 * badge du rail et l'état établi d'après les titres
 * (`etats-permanents/par-les-titres.ts`).
 *
 * Venu de `queries.ts` le 2026-10-16 (revue qualité) : ce module-là est
 * `server-only`, et la règle d'un titre dépassé y avait été recopiée deux
 * fois ailleurs. Pur : ni Prisma, ni catalogue, ni horloge.
 *
 * PAS DANS `echeance.ts`, et c'est délibéré : celui-ci est relevé dans
 * l'empreinte du moteur de calendrier (`version-moteur.test.ts`) ; y déplacer
 * du code qui ne change rien à la régénération ferait bouger le relevé pour
 * rien. Le générateur ne lit pas cet état.
 */
import { classerDate, type RegistreLigne } from "@/lib/calendrier/etats";
import { periodiciteEffective } from "@/lib/referentiels/conformite/rythme-retenu";
import type { Obligation } from "@/lib/referentiels/conformite/types";
import type { Periodicite } from "@/lib/referentiels/types-communs";
import { echeanceDuTitre, type DatesDuTitre } from "./echeance";

/**
 * L'état d'un titre, tel que l'écran l'affiche.
 *
 * `aPlanifier` a ici un sens précis, et il n'est pas « en retard » : un titre
 * SANS ÉCHÉANCE — ni date de fin saisie, ni durée écrite au texte.
 * ~~L'habilitation électrique en est le cas type — le Code renvoie à des
 * modalités qu'il qualifie lui-même de recommandées, et le produit ne décrète
 * pas un rendez-vous là où le texte n'en pose aucun (ADR-023 § 6).~~
 * [2026-10-15, `lot/menage-1015` : plus depuis C66 (9ac4d98c) — l'habilitation porte un rythme retenu
 * triennal (ADR-039 § 8) ; l'autorisation de conduite, sans durée écrite, est
 * le cas type.] Le peindre en rouge inventerait une non-conformité.
 */
export type EtatTitre = RegistreLigne;

/**
 * Classe un titre sur SON échéance — celle que le calendrier inscrit.
 *
 * La signature prend le titre et la périodicité, jamais une date nue, et c'est
 * délibéré. Elle prenait `echeanceLe` : chaque appelant passait la date saisie,
 * et une VIP quinquennale délivrée en 2020 sans date de fin sortait « à
 * planifier » ici quand le générateur, qui calcule `delivreLe + cinq ans`, la
 * mettait en retard au calendrier et au score (relecture système du
 * 2026-09-14). Une date nue laisse l'appelant choisir laquelle ; le titre et
 * son rythme ne laissent que `echeanceDuTitre`, et un appelant qui repasserait
 * `t.echeanceLe` ne compile plus.
 *
 * Le classement lui-même est `classerDate`, la fonction partagée qui repose sur
 * `estEnRetard` et `estDansLesProchainsJours` (`lib/dates/retard.ts`) : une
 * échéance datée d'aujourd'hui n'est pas en retard, sur un titre comme sur un
 * appareil.
 */
export function classerTitre(
  titre: DatesDuTitre,
  periodicite: Periodicite | undefined,
  now: Date,
): EtatTitre {
  const echeance = echeanceDuTitre(titre, periodicite);
  if (echeance === null) return "aPlanifier";
  return classerDate(echeance, now);
}

/**
 * L'état d'un titre tel que l'écran Équipe le peint : celui de `classerTitre`
 * — sauf pour une personne SORTIE DE L'EFFECTIF, dont le titre ne réclame plus
 * rien (« archivée »).
 *
 * Le calendrier ne génère des lignes que pour les salariés présents, et le
 * badge du rail ne compte qu'eux. La page Équipe, elle, classait tous les
 * titres : une VIP de 2019 sans date de fin d'une personne partie en 2022
 * virait au rouge pour toujours, depuis que l'échéance se calcule, et le seul
 * moyen d'éteindre le rouge était de retirer le titre — donc la preuve que
 * `docs/rgpd.md` § 4.3 veut garder (relecture du lot, 2026-09-14). Le titre
 * reste affiché, sans rien réclamer.
 *
 * NI POUR UN TITRE DONT L'OBLIGATION A QUITTÉ LE RÉFÉRENTIEL. Le générateur ne
 * lui produit plus de ligne et la réconciliation archive l'ancienne : le
 * calendrier, le score et le badge ne le réclament plus. Équipe le peignait
 * « échéance déclarée dépassée » sur sa date de fin saisie (2026-09-15). La
 * pièce reste une pièce, affichée ; elle ne réclame plus rien.
 */
export function etatDuTitre(
  titre: DatesDuTitre,
  obligation: Pick<Obligation, "periodicite" | "rythmeRetenu"> | undefined,
  salarieActif: boolean,
  now: Date,
): EtatTitre {
  if (!salarieActif || obligation === undefined) return "archivee";
  return classerTitre(titre, periodiciteEffective(obligation), now);
}

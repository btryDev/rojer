// Répartition des occurrences de vérification pour les documents générés.
//
// Module **pur** (aucun accès base, aucune horloge implicite) pour deux
// raisons : il est testable seul, et il oblige les builders PDF à passer par
// les prédicats canoniques de `@/lib/dates/retard` (ADR-011) plutôt qu'à
// réinventer une règle de retard maison — ce qu'ils faisaient, avec pour
// résultat un dossier de contrôle dont le compteur et la liste détaillée
// décrivaient deux ensembles différents.

import {
  JOURS_HORIZON_PROCHE,
  MOIS_FENETRE_HISTORIQUE,
  ajouterMois,
  debutDuJour,
} from "@/lib/dates";
import {
  estVerificationAPlanifier,
  estVerificationAVenir,
  estVerificationEnRetard,
  type VerificationDatee,
} from "@/lib/dates/retard";
import { estMarqueeNonApplicable } from "@/lib/calendrier/marqueur";

/** Répartition en quatre catégories **disjointes**. */
export type EtatVerifications<T> = {
  /** Échéance passée sans réalisation — la non-conformité réelle. */
  enRetard: T[];
  /** Sans date de rendez-vous, mais pas encore en retard. */
  aPlanifier: T[];
  /** Planifiées dans l'horizon proche (30 jours). */
  aVenir: T[];
  /** Réalisées sur la fenêtre d'historique (12 mois). Les lignes archivées
   *  y restent : la réalisation est un fait passé, et une preuve. */
  realisees12m: T[];
  /** Somme des quatre — dénominateur du score de conformité. */
  total: number;
};

/**
 * Répartit une liste de vérifications à un instant donné.
 *
 * Les quatre ensembles sont disjoints par construction : une occurrence
 * réalisée est exclue des trois premiers (`dateRealisee` non nulle), et
 * `estVerificationEnRetard` / `estVerificationAPlanifier` ne sont jamais
 * vrais ensemble. La somme est donc un dénominateur honnête, sans double
 * compte.
 *
 * Une vérification planifiée au-delà de l'horizon proche n'entre dans aucune
 * catégorie : ce n'est ni un engagement de la période, ni un retard. Même
 * convention que le tableau de bord, pour que les deux affichent le même
 * score à la même seconde.
 *
 * L'horloge est injectée (jamais `new Date()` ici) : c'est ce qui rend le
 * document reproductible et le test possible.
 */
export function repartirVerifications<
  // `derniereRealisation` — la date du dernier rapport réalisé (ADR-034) —
  // est REQUISE : c'est elle, et non plus la ligne, qui dit ce qui a été fait
  // sur la fenêtre. Un appelant qui l'omettrait viderait `realisees12m`.
  T extends VerificationDatee & { derniereRealisation: Date | null },
>(verifs: readonly T[], now: Date): EtatVerifications<T> {
  // Borne de la fenêtre d'historique : le **jour civil** situé douze mois en
  // arrière, pris à minuit heure de Paris. Sans `debutDuJour`, la borne
  // hérite de l'heure courante et une vérification réalisée pile douze mois
  // plus tôt (date stockée à minuit) tombe du dossier l'après-midi mais y
  // figure le matin.
  const debutFenetreHistorique = debutDuJour(
    ajouterMois(now, -MOIS_FENETRE_HISTORIQUE),
  );

  // Une ligne archivée (ADR-012) ne réclame plus rien : son obligation ne
  // s'applique plus, on ne la garde que pour la preuve qu'elle porte. Son
  // statut, lui, reste gelé dans son dernier état connu — faute de valeur
  // `archivee` dans l'enum Prisma —, si bien qu'une ligne gelée sur
  // « dépassée » comptait un retard à perpétuité.
  const actives = verifs.filter(
    (v) => !("libelleObligation" in v && typeof v.libelleObligation === "string"
      ? estMarqueeNonApplicable(v.libelleObligation)
      : false),
  );

  const enRetard = actives.filter((v) => estVerificationEnRetard(v, now));
  const aPlanifier = actives.filter((v) => estVerificationAPlanifier(v, now));
  const aVenir = actives.filter((v) =>
    estVerificationAVenir(v, now, JOURS_HORIZON_PROCHE),
  );
  // Lue sur les rapports (ADR-034), avec la colonne gelée en repli pour une
  // ligne d'avant que la réconciliation n'a pas encore remise au modèle.
  //
  // CE QUI CHANGE, ET C'EST VOULU : depuis que la ligne roule au dépôt, une
  // ligne contrôlée il y a trois mois porte AUSSI son échéance ouverte, qui
  // compte parmi les trois premiers ensembles quand elle tombe dans l'horizon
  // ou est dépassée. La disjonction ne tient plus sur la ligne : elle tient
  // entre la ligne (une échéance) et son rapport (un fait). C'est ce qui fait
  // enfin compter en retard une échéance passée sur un appareil déjà contrôlé
  // — le défaut du lot 3 bis — et c'est pourquoi le score bouge (ADR-034, « Ce
  // qu'il faudrait mesurer »).
  const realisees12m = verifs.filter((v) => {
    const faite = v.derniereRealisation ?? v.dateRealisee;
    return faite !== null && faite.getTime() >= debutFenetreHistorique.getTime();
  });

  return {
    enRetard,
    aPlanifier,
    aVenir,
    realisees12m,
    total:
      enRetard.length + aPlanifier.length + aVenir.length + realisees12m.length,
  };
}

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
 * Les quatre ensembles sont disjoints par construction, et c'est l'ÉCHÉANCE
 * OUVERTE qui prime : une ligne retenue en retard, à planifier ou à venir
 * n'entre pas dans `realisees12m`, même si elle porte un contrôle récent
 * (ADR-034). `estVerificationEnRetard` / `estVerificationAPlanifier` ne sont
 * jamais vrais ensemble. La somme est donc un dénominateur honnête, sans
 * double compte : une ligne, une voix.
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
  const dejaComptees = new Set<T>([...enRetard, ...aPlanifier, ...aVenir]);
  // Lue sur les rapports (ADR-034), avec la colonne gelée en repli pour une
  // ligne d'avant que la réconciliation n'a pas encore remise au modèle.
  //
  // UNE LIGNE COMPTE UNE FOIS, ET UNE SEULE — tranché par la propriétaire le
  // 2026-09-12, après mesure. Depuis que la ligne roule au dépôt (ADR-034),
  // elle porte à la fois un contrôle fait et une échéance ouverte ; les
  // compter tous deux gonflait le dénominateur du score et DILUAIT le retard :
  // le même dossier, avec trois échéances dépassées, sortait à 77 si son
  // dernier rapport datait de trois mois et à 70 s'il datait de plus d'un an.
  // Un retard doit coûter le même prix dans les deux cas.
  //
  // L'échéance ouverte prime donc : une ligne en retard, sans date ou à venir
  // sous trente jours est comptée là, et nulle part ailleurs. `realisees12m`
  // recueille le reste — les lignes dont le prochain rendez-vous est lointain
  // (ou qui n'en ont plus) et dont le dernier contrôle tombe dans la fenêtre.
  // C'est ce qui fait enfin compter en retard une échéance passée sur un
  // appareil déjà contrôlé : le défaut du lot 3 bis.
  //
  // L'ADR § 3 écrivait « rapports datés dans la fenêtre ». Compter les
  // RAPPORTS ferait peser une obligation trimestrielle quatre fois plus qu'une
  // annuelle dans un score qui note des obligations : écarté, et l'ADR est
  // amendée en conséquence.
  const realisees12m = verifs.filter((v) => {
    if (dejaComptees.has(v)) return false;
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

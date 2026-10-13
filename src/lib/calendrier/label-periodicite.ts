import type { Periodicite } from "@/lib/referentiels/types-communs";

// LA TABLE DES RYTHMES EN CLAIR, DANS UN MODULE FEUILLE (2026-10-12, suite de
// C62). Elle vivait dans `labels.ts`, qui importe un TYPE d'`echeances.ts` —
// module qui ouvre la base. Le passage à blanc (`passage-a-blanc.test.ts`)
// suit aussi les `import type` : le moteur (`matching/prescriptions.ts`) ne
// pouvait donc pas la lire sans faire entrer Prisma dans sa fermeture, et son
// motif de surcharge écrivait le code brut (« semestrielle », « decennale »).
// Ce module n'importe qu'un type de `types-communs` ; `labels.ts` le
// réexporte, si bien que ses lecteurs n'ont pas bougé.

export const LABEL_PERIODICITE: Record<Periodicite, string> = {
  hebdomadaire: "hebdomadaire",
  bimensuelle: "tous les 15 jours",
  mensuelle: "mensuelle",
  six_semaines: "toutes les 6 semaines",
  trimestrielle: "trimestrielle",
  semestrielle: "semestrielle",
  annuelle: "annuelle",
  biennale: "tous les 2 ans",
  triennale: "tous les 3 ans",
  quadriennale: "tous les 4 ans",
  quinquennale: "tous les 5 ans",
  decennale: "tous les 10 ans",
  mise_en_service_uniquement: "à la mise en service",
  // `autre` ne dit qu'une chose, et l'ADR-026 l'écrit : **le texte n'écrit pas
  // de rythme**. Il ne dit pas que l'obligation est permanente. Écrire
  // « permanente » ici, c'était répondre à la place du droit — et la table s'en
  // chargeait pour les 42 obligations qui portent cette valeur, dont 13 ne sont
  // pas des états permanents : 7 événementielles, 3 ponctuelles et 3 échéances
  // récurrentes dont le rythme n'est renvoyé à aucun texte. Une obligation
  // événementielle redevient due au fait suivant ; rien de permanent là-dedans.
  //
  // Le mélange venait d'avant l'ADR-026, quand `periodicite: "autre"` tenait
  // lieu de nature faute de champ. `nature` existe depuis ; cette table était
  // restée en arrière, et elle est le seul endroit du produit qui parlait encore
  // l'ancienne langue. Le libellé dit désormais ce que le champ sait, et rien de
  // plus — ce que l'obligation EST se lit dans `LIBELLE_NATURE`.
  autre: "sans rythme écrit",
};

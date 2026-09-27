// Les adresses qu'un article `non_couvert` peut donner dans `declareA`, quand
// elles sont partagées par plusieurs articles.
//
// UNE SEULE AUJOURD'HUI (C45, 2026-09-27). Les vingt-cinq articles annoncés
// par la décision de la propriétaire du 2026-09-27 pointent tous vers la même
// section de la page « Ce que Rojer ne couvre pas ». Une constante plutôt que
// vingt-cinq chaînes recopiées : `perimetre/manques-annonces.ts` projette
// EXACTEMENT les articles qui la portent, et `manques-annonces.test.ts`
// confronte les deux ensembles — un article qui la citerait sans être projeté
// serait une adresse qui ne mène nulle part, le défaut que `corpus.test.ts`
// décrit sous `MUETS` (« il vérifie qu'un `declareA` est PRÉSENT, jamais que
// l'adresse citée existe »). Pour ces articles-ci, l'adresse est vérifiée.
//
// Module pur, sans dépendance.

export const ADRESSE_MANQUES_ANNONCES =
  "Page « Ce que Rojer ne couvre pas » (`src/app/etablissements/[id]/perimetre/page.tsx`), section « Ce que l'outil ne suit pas » — projetée par `src/lib/perimetre/manques-annonces.ts` au seul dossier que l'article peut concerner.";

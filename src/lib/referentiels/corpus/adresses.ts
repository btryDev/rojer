// Les adresses qu'un article `non_couvert` peut donner dans `declareA`, quand
// elles sont partagées par plusieurs articles.
//
// ~~UNE SEULE AUJOURD'HUI~~ [2026-10-14 : DEUX — `ADRESSE_MATERIELS_NON_COUVERTS`
// s'ajoute, plus bas] (C45, 2026-09-27). Les vingt-cinq articles annoncés
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

/**
 * La seconde adresse partagée (2026-10-14, décision de la propriétaire) : la
 * liste des matériels que Rojer ne suit pas, que la recherche du formulaire
 * d'équipement propose. Le matériel s'enregistre en catégorie « Autre » avec
 * sa clé ; sa fiche, l'indicateur « sans échéance » et le dossier de
 * conformité disent la phrase propre au matériel. Les escaliers mécaniques,
 * l'eau et les échelles y ont été DÉPLACÉS depuis la page « Ce que Rojer ne
 * couvre pas ». `materiels-non-couverts.test.ts` tient l'égalité, dans les
 * deux sens, entre les articles qui la portent et ceux que la liste cite.
 */
export const ADRESSE_MATERIELS_NON_COUVERTS =
  "Formulaire de déclaration d'un équipement, recherche de matériel : l'encart « Rojer ne suit pas » du matériel (`src/lib/equipements/materiels-non-couverts.ts`), repris sur la fiche de l'équipement, dans l'indicateur « sans échéance » et dans le dossier de conformité.";

// ~~section « Ce que l'outil ne suit pas »~~ — 2026-10-17, ADR-046 : la
// section porte le titre `TITRE_ANNONCES` (« Ce qui peut vous concerner, et
// que Rojer ne suit pas »), et l'article y est dit par son sujet, dans la
// phrase de son domaine. L'adresse reste celle de la PAGE : le détail que
// l'annexe du PDF du référentiel complet imprime n'est pas une adresse, le
// dirigeant ne reçoit pas ce document. `parite-page-pdf.test.ts` tient le
// titre cité ici égal au titre rendu.
export const ADRESSE_MANQUES_ANNONCES =
  "Page « Ce que Rojer ne couvre pas » (`src/app/etablissements/[id]/perimetre/page.tsx`), section « Ce qui peut vous concerner, et que Rojer ne suit pas » — une phrase par domaine, faite du sujet de chaque article, projetée par `src/lib/perimetre/manques-annonces.ts` au seul dossier que l'article peut concerner.";

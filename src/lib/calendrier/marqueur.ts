// Le marqueur d'archivage — HISTORIQUE, et plus qu'une chaîne de référence.
//
// De l'ADR-012 au lot N3 de l'ADR-034, une ligne dont l'obligation cessait de
// s'appliquer était marquée en écrivant ce préfixe DEVANT son libellé, faute
// de valeur `archivee` dans l'enum de statut. Un fait daté vivait donc dans du
// texte, et se lisait par `startsWith` : huit surfaces devaient y penser, sept
// l'oubliaient — le PDF remis en contrôle imprimait « en retard » sur des
// obligations éteintes.
//
// `Verification.archiveLe` l'a remplacé (ADR-034) : posé au N1, lu partout au
// N3, et la migration `20260912090000_archivage_par_champ` a retiré le préfixe
// des libellés en base.
//
// CE QUI RESTE, ET POURQUOI. La constante seule, parce que deux migrations SQL
// recopient ce préfixe à la main — une migration ne peut pas importer de
// TypeScript — et que `migrations-contraintes.test.ts` compare les deux
// caractère par caractère. Sans elle, un tiret simple à la place du cadratin
// passerait sans bruit, et le rétro-remplissage ne toucherait aucune ligne.
//
// Aucun code de production ne la lit. N'en rajoutez pas : l'archivage est un
// champ.

export const MARQUEUR_NON_APPLICABLE = "Ne s'applique plus — ";

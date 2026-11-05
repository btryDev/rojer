# ADR-056 — Un écrit annexé au registre se dépose sur sa ligne, et le registre le reprend

- **Statut** : acceptée, 2026-11-05 — décisions de la propriétaire du même
  jour : « il faudra que ce soit réexploité dans le registre de sécurité » ;
  le fichier se dépose sur la ligne de « Ce qui doit être en place », « pas
  dans le registre puisqu'il le récupère » ; on archive « pendant un certain
  temps mais pas éternellement ».
- **Amende** : ADR-027 § 3 (« aucune surface de dépôt ») pour les seules
  lignes listées ci-dessous. Précise ADR-021 (la fiche « Annexes » du
  registre est composée, pas saisie) et ADR-012 (la conservation d'une pièce
  remplacée est bornée).

## Contexte

Le règlement de sécurité fait **annexer au registre** certains écrits :
le schéma d'organisation globale de la sécurité d'un magasin (M 31), le
contrat d'entretien du système de sécurité incendie et la notice de la
détection (MS 58 § 4), la notice de maintenance de l'éclairage de sécurité
(EC 13), le registre technique des ascenseurs (AS 11). Chacun est déjà une
ligne de « Ce qui doit être en place » (`pieceAttendue` nommée), que le
dirigeant déclare en place sans rien joindre (ADR-027 § 3).

La fiche « Annexes » du registre annonçait « plans d'évacuation,
procès-verbaux, notices et pièces jointes libres » sans pouvoir en recevoir
aucun. Depuis le 2026-11-05 elle relit ces lignes (`registre/annexes.ts`).
Restait l'écrit lui-même : rien ne permettait de le garder avec le registre,
ni de le remettre dans le dossier de contrôle.

## Décision

1. **Où.** Le fichier se dépose sur la ligne de « Ce qui doit être en
   place », dans sa fiche. Le registre ne collecte rien : la fiche
   « Annexes », son PDF et le ZIP de « Préparer un contrôle » reprennent le
   fichier en cours. Une seule saisie, comme pour le reste du registre.
2. **Quelles lignes.** Celles de `ANNEXES_DU_REGISTRE`
   (`registre/annexes.ts`), et seulement là où l'annexion vaut
   (`seulementSi` : le registre technique des ascenseurs en catégories 1 à 4).
   Les autres lignes qui nomment un écrit gardent la case seule. Élargir se
   fait en ajoutant une entrée à la table, pas en changeant la règle.
3. **Déposer vaut déclarer.** Le dépôt crée ou redate la déclaration
   « en place » (la note est gardée). Rojer ne lit pas le fichier : c'est
   toujours une déclaration, pas une preuve, et l'écran le dit
   (ADR-027 reste entier sur ce point). Le score n'en tient pas compte
   autrement qu'une case cochée.
4. **Deux fichiers au plus par ligne.** Le fichier en cours, et le précédent
   (`remplaceeLe` daté). Un nouveau dépôt **efface toujours** l'ancien
   précédent, en base puis au stockage, et fait du fichier en cours, s'il y
   en a un, le précédent. « Pas encore » retire la déclaration et fait du
   fichier en cours le précédent (l'ancien précédent part) ; sans fichier en
   cours, il ne touche à aucun fichier. La base impose un seul fichier en
   cours par ligne (`enCours` vrai ou nul, unique — PostgreSQL ne compare
   pas les NULL), et l'action ne laisse jamais plus d'un précédent.
5. **Pourquoi garder le précédent.** Si un incendie ou un contrôle survient
   juste après un remplacement, on peut montrer ce qui était annexé avant.
   Au-delà, aucun texte ne fixe de durée pour ces écrits — `D. 4711-3` vise
   les rapports de vérification, pas eux. C'est un choix d'exploitation,
   écrit comme tel dans `docs/rgpd.md` § 4.
6. **Pas de tâche planifiée.** La purge se fait au dépôt et au retrait,
   jamais d'office. Le stockage est borné par construction : quatre lignes,
   huit fichiers au plus par établissement.
7. **Hors de la cible.** Une ligne qui cesse de s'appliquer (catégorie
   changée, ascenseur retiré) garde ses fichiers en base, comme ses
   déclarations : ils ne s'affichent plus et reviennent avec elle. Ils
   partent avec l'établissement (`suppression/fichiers.ts`).

## Ce que la décision n'ouvre pas

- **Pas d'annexe libre** (procès-verbal de la commission, plans
  d'évacuation) : elles n'ont pas de ligne où se déposer. À reprendre par
  une décision à part.
- **Pas de dépôt sur les autres états permanents.** L'ADR-027 § 3 reste la
  règle hors de la table.
- **Rojer ne génère pas le schéma.** Son contenu — dimensionnement du
  service de sécurité, actions prioritaires, évacuation générale — est un
  choix d'organisation de l'exploitant.

## Conséquences

- Table `PieceEtatPermanent` (établissement, ligne, fichier, `deposeLe`,
  `remplaceeLe`), RLS activée, clé de stockage libérée à la suppression de
  l'établissement (`CLES_STOCKEES`).
- Le fichier se sert par `/api/etablissements/[id]/pieces/[pieceId]`, borné
  au compte.
- Le ZIP de contrôle porte un dossier `03_Registre_annexes/` avec les seuls
  fichiers en cours.

-- ============================================================================
-- L'archivage est un champ, plus un préfixe de libellé — ADR-034, lot N3
-- 2026-09-12
--
-- CE QUI CHANGE. Une ligne dont l'obligation ne s'applique plus était marquée
-- en écrivant « Ne s'applique plus — » DEVANT son libellé (ADR-012), faute de
-- valeur `archivee` dans l'enum de statut. Un fait daté vivait donc dans une
-- chaîne de caractères, et se lisait par `startsWith` : huit surfaces devaient
-- y penser, sept l'oubliaient. Le lot N1 a posé `archiveLe` et l'écrit depuis ;
-- le N3 fait basculer les lecteurs dessus, et cette migration retire le
-- préfixe des libellés.
--
-- ORDRE DES DEUX ÉCRITURES. La date D'ABORD, le texte ENSUITE : si la
-- migration s'interrompt entre les deux, il reste des lignes marquées ET
-- datées — l'état de N1, que le code sait lire. L'ordre inverse laisserait des
-- lignes archivées que plus rien ne signale.
--
-- La première commande rattrape ce que le rétro-remplissage de N1 n'aurait pas
-- couvert : une ligne archivée entre les deux migrations par une version
-- déployée qui n'écrivait pas encore `archiveLe`. `updatedAt` est la meilleure
-- date disponible, et elle est au plus tard.
--
-- 21 CARACTÈRES, et c'est le préfixe exact de `MARQUEUR_NON_APPLICABLE`
-- (`src/lib/calendrier/marqueur.ts`), tiret cadratin et espace finale compris.
-- `substr` compte en CARACTÈRES sous PostgreSQL, pas en octets : le cadratin
-- occupe trois octets et une seule position. `migrations-contraintes.test.ts`
-- garde l'égalité entre ce préfixe et la constante.
-- ============================================================================

UPDATE "Verification"
SET "archiveLe" = "updatedAt"
WHERE "archiveLe" IS NULL
  AND starts_with("libelleObligation", 'Ne s''applique plus — ');

UPDATE "Verification"
SET "libelleObligation" = substr("libelleObligation", 22)
WHERE starts_with("libelleObligation", 'Ne s''applique plus — ');

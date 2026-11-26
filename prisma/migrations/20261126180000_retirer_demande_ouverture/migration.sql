-- La page « Rojer ouvre bientôt » est retirée (2026-11-26, décision de la
-- propriétaire) : Rojer est ouvert, `/bientot`, son formulaire et
-- l'interrupteur `lib/ouverture.ts` disparaissent. La liste d'attente est
-- supprimée avec ses adresses, sans e-mail d'ouverture (décision de la
-- propriétaire). Table hors compte, lue par aucun code.

-- DropTable
DROP TABLE "DemandeOuverture";

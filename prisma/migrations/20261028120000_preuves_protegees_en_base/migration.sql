-- Les preuves sont protégées par la base, plus seulement par le code (2026-10-28,
-- audit de la base avant la bascule Clever Cloud).
--
-- Jusqu'ici, supprimer une ligne du calendrier (`Verification`) emportait en
-- cascade ses rapports — les pièces du registre de sécurité — et ses actions
-- correctives. Seul le code l'empêchait : `supprimerEquipement` comptait les
-- preuves PUIS supprimait, hors transaction ; un rapport déposé entre les deux
-- partait avec l'appareil.
--
-- NO ACTION, et non RESTRICT. Les deux refusent de supprimer une ligne qui
-- porte encore un rapport ou une action. Mais NO ACTION vérifie à la FIN de
-- l'instruction : quand la suppression d'un établissement ou d'une entreprise
-- emporte dans le même geste la ligne ET ses rapports (chacun par sa propre
-- cascade sur `etablissementId`), il ne reste rien qui pointe, et la
-- suppression passe — comportement inchangé. RESTRICT vérifierait
-- immédiatement et casserait ces suppressions selon l'ordre des cascades.
--
-- Effacer volontairement des preuves reste possible : il faut les supprimer
-- d'abord, nommément (`effacerSalarie`, RGPD).
--
-- Même règle pour un point à corriger désigné sur un appareil par un contrôle
-- d'ensemble (`Action.equipementId`, ADR-048) : c'est la trace de l'appareil.
-- En SET NULL, supprimer l'appareil l'en détachait en silence.

-- DropForeignKey
ALTER TABLE "Action" DROP CONSTRAINT "Action_equipementId_fkey";

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_equipementId_fkey" FOREIGN KEY ("equipementId") REFERENCES "Equipement"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "Action" DROP CONSTRAINT "Action_verificationId_fkey";

-- DropForeignKey
ALTER TABLE "RapportVerification" DROP CONSTRAINT "RapportVerification_verificationId_fkey";

-- AddForeignKey
ALTER TABLE "RapportVerification" ADD CONSTRAINT "RapportVerification_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "Verification"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "Verification"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

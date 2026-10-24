-- Le prestataire attitré d'un contrôle et le rendez-vous pris (ADR-049).
-- Additive : trois colonnes nullables, aucune donnée existante modifiée. Ni
-- l'une ni l'autre ne date la ligne (ADR-036) ; le moteur du calendrier ne
-- les écrit pas. Qu'un prestataire soit de l'établissement de la ligne est
-- tenu par l'action serveur (`resoudrePrestataireOptionnel`).

-- AlterTable
ALTER TABLE "Verification" ADD COLUMN     "prestataireId" TEXT,
ADD COLUMN     "rendezVousLe" TIMESTAMP(3),
ADD COLUMN     "rendezVousNote" TEXT;

-- CreateIndex
CREATE INDEX "Verification_prestataireId_idx" ON "Verification"("prestataireId");

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_prestataireId_fkey" FOREIGN KEY ("prestataireId") REFERENCES "Prestataire"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- La note du rendez-vous reste une ligne courte (« avec M. Martin, accès par
-- la cour »), bornée comme à la saisie.
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_rendez_vous_note_courte"
  CHECK ("rendezVousNote" IS NULL OR char_length("rendezVousNote") <= 300);

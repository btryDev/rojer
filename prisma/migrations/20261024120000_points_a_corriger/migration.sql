-- Points à corriger (ADR-048, décisions de la propriétaire du 2026-10-24).
--
-- Une action issue d'une vérification — un « point à corriger » — se rattache
-- au rapport qui l'a relevé (l'occurrence du contrôle, ADR-034) et, quand le
-- contrôle porte sur l'ensemble de l'établissement, à l'appareil qu'elle
-- concerne. Sa correction peut porter une pièce (photo, facture).
--
-- Additive : aucune ligne existante n'est réécrite. Les points antérieurs
-- gardent `rapportOrigineId` nul — on ne sait pas lequel des rapports d'une
-- ligne les a fait naître.

-- AlterTable
ALTER TABLE "Action" ADD COLUMN     "equipementId" TEXT,
ADD COLUMN     "leveeFichierCle" TEXT,
ADD COLUMN     "leveeFichierMime" TEXT,
ADD COLUMN     "leveeFichierNom" TEXT,
ADD COLUMN     "leveeFichierTaille" INTEGER,
ADD COLUMN     "rapportOrigineId" TEXT;

-- CreateIndex
CREATE INDEX "Action_rapportOrigineId_idx" ON "Action"("rapportOrigineId");

-- CreateIndex
CREATE INDEX "Action_equipementId_idx" ON "Action"("equipementId");

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_rapportOrigineId_fkey" FOREIGN KEY ("rapportOrigineId") REFERENCES "RapportVerification"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_equipementId_fkey" FOREIGN KEY ("equipementId") REFERENCES "Equipement"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Les gardes que Prisma ne sait pas dire (même règle que `Action_origine_xor`).
-- Un rapport d'origine et un appareil désigné n'ont de sens que pour un point
-- issu d'une vérification ; la pièce de correction est entière ou absente.
ALTER TABLE "Action" ADD CONSTRAINT "Action_point_rapport_origine"
  CHECK ("rapportOrigineId" IS NULL OR "verificationId" IS NOT NULL);
ALTER TABLE "Action" ADD CONSTRAINT "Action_point_equipement"
  CHECK ("equipementId" IS NULL OR "verificationId" IS NOT NULL);
ALTER TABLE "Action" ADD CONSTRAINT "Action_levee_fichier_entier"
  CHECK (
    ("leveeFichierCle" IS NULL AND "leveeFichierNom" IS NULL AND "leveeFichierMime" IS NULL AND "leveeFichierTaille" IS NULL)
    OR ("leveeFichierCle" IS NOT NULL AND "leveeFichierNom" IS NOT NULL AND "leveeFichierMime" IS NOT NULL AND "leveeFichierTaille" IS NOT NULL)
  );

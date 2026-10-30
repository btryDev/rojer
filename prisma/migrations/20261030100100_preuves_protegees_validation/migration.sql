-- Les trois clés posées en NOT VALID par
-- `20261030100000_preuves_protegees_en_base` relisent les lignes existantes
-- (règle de `migrations-index.test.ts`). VALIDATE CONSTRAINT prend un verrou
-- SHARE UPDATE EXCLUSIVE : les lectures et les écritures continuent pendant
-- la relecture.
--
-- Une ligne orpheline ne peut pas exister : les anciennes clés, en cascade ou
-- en SET NULL, garantissaient déjà que chaque référence pointe une ligne
-- présente. Si la validation échoue malgré tout, la contrainte reste posée et
-- appliquée aux écritures nouvelles : lire la ligne fautive, la corriger, puis
-- `prisma migrate resolve --rolled-back 20261030100100_preuves_protegees_validation`
-- et redéployer.

ALTER TABLE "Action" VALIDATE CONSTRAINT "Action_equipementId_fkey";

ALTER TABLE "Action" VALIDATE CONSTRAINT "Action_verificationId_fkey";

ALTER TABLE "RapportVerification" VALIDATE CONSTRAINT "RapportVerification_verificationId_fkey";

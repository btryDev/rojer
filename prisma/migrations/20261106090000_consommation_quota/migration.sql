-- Le journal des plafonds « par an » des formules (ADR-053 § 14).

-- CreateTable
CREATE TABLE "ConsommationQuota" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "compteId" UUID NOT NULL,
    "quota" TEXT NOT NULL,
    "consommeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsommationQuota_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsommationQuota_compteId_quota_consommeLe_idx" ON "ConsommationQuota"("compteId", "quota", "consommeLe");

-- AddForeignKey
ALTER TABLE "ConsommationQuota" ADD CONSTRAINT "ConsommationQuota_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "Compte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Comme toutes les tables de `public` (migrations-rls.test.ts).
ALTER TABLE "ConsommationQuota" ENABLE ROW LEVEL SECURITY;

-- Reprise : les permis de feu et plans de prévention des douze derniers mois
-- comptent déjà, à leur date de création. Un établissement dont l'entreprise
-- n'a pas de compte (dossier antérieur à l'ADR-054) n'a pas de compteur.
-- `createdAt` est un horodatage UTC sans fuseau (ADR-011 § 1) : la borne se
-- calcule en UTC, quel que soit le fuseau de la session, et inclut sa limite
-- comme le code (`gte`). Rejouable sans doubler : rien n'est repris pour un
-- plafond dont le journal a déjà des lignes.
INSERT INTO "ConsommationQuota" ("compteId", "quota", "consommeLe")
SELECT en."compteId", 'permisDeFeuParAn', p."createdAt"
FROM "PermisFeu" p
JOIN "Etablissement" et ON et."id" = p."etablissementId"
JOIN "Entreprise" en ON en."id" = et."entrepriseId"
WHERE en."compteId" IS NOT NULL
  AND p."createdAt" >= (now() AT TIME ZONE 'UTC') - interval '12 months'
  AND NOT EXISTS (SELECT 1 FROM "ConsommationQuota" WHERE "quota" = 'permisDeFeuParAn');

INSERT INTO "ConsommationQuota" ("compteId", "quota", "consommeLe")
SELECT en."compteId", 'plansDePreventionParAn', p."createdAt"
FROM "PlanPrevention" p
JOIN "Etablissement" et ON et."id" = p."etablissementId"
JOIN "Entreprise" en ON en."id" = et."entrepriseId"
WHERE en."compteId" IS NOT NULL
  AND p."createdAt" >= (now() AT TIME ZONE 'UTC') - interval '12 months'
  AND NOT EXISTS (SELECT 1 FROM "ConsommationQuota" WHERE "quota" = 'plansDePreventionParAn');

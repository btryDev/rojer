-- ADR-054 : plusieurs personnes travaillent sur le même compte.
--
-- Le compte devient une table (`Compte`, l'« organisation » du plugin
-- `organization` de Better Auth), avec ses membres et ses invitations. La
-- racine de l'isolation passe de l'utilisateur au compte : `compteId` sur
-- "Entreprise", "Abonnement" et "DemandeAssistance".
--
-- Reprise : chaque utilisateur qui a une entreprise, un abonnement ou une
-- demande d'assistance reçoit un compte dont il est le propriétaire. Sur une
-- base neuve, elle ne reprend rien. Les colonnes `userId` des racines sont
-- retirées par `20261103120400_comptes_validation`.

-- CreateTable
CREATE TABLE "Compte" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Compte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membre" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "compteId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvitationCompte" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "compteId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inviterId" UUID NOT NULL,

    CONSTRAINT "InvitationCompte_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Compte_slug_key" ON "Compte"("slug");

-- CreateIndex
CREATE INDEX "Membre_userId_idx" ON "Membre"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Membre_compteId_userId_key" ON "Membre"("compteId", "userId");

-- CreateIndex
CREATE INDEX "InvitationCompte_compteId_idx" ON "InvitationCompte"("compteId");

-- CreateIndex
CREATE INDEX "InvitationCompte_email_idx" ON "InvitationCompte"("email");

-- AddForeignKey
ALTER TABLE "Membre" ADD CONSTRAINT "Membre_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "Compte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membre" ADD CONSTRAINT "Membre_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvitationCompte" ADD CONSTRAINT "InvitationCompte_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "Compte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvitationCompte" ADD CONSTRAINT "InvitationCompte_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Comme toutes les tables de `public` (migrations-rls.test.ts).
ALTER TABLE "Compte" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Membre" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InvitationCompte" ENABLE ROW LEVEL SECURITY;

-- Les nouvelles racines, nulles le temps de la reprise.
ALTER TABLE "Entreprise" ADD COLUMN "compteId" UUID;
ALTER TABLE "Abonnement" ADD COLUMN "compteId" UUID;
ALTER TABLE "DemandeAssistance" ADD COLUMN "compteId" UUID;
ALTER TABLE "Session" ADD COLUMN "compteActifId" UUID;

-- Reprise. Le `slug` provisoire `reprise-<userId>` relie chaque compte créé à
-- son utilisateur le temps des mises à jour, puis il est tiré au hasard.
INSERT INTO "Compte" ("name", "slug")
SELECT u."name", 'reprise-' || u."id"::text
FROM "User" u
WHERE EXISTS (SELECT 1 FROM "Entreprise" e WHERE e."userId" = u."id")
   OR EXISTS (SELECT 1 FROM "Abonnement" a WHERE a."userId" = u."id")
   OR EXISTS (SELECT 1 FROM "DemandeAssistance" d WHERE d."userId" = u."id");

INSERT INTO "Membre" ("compteId", "userId", "role")
SELECT c."id", u."id", 'owner'
FROM "Compte" c
JOIN "User" u ON c."slug" = 'reprise-' || u."id"::text;

UPDATE "Entreprise" e SET "compteId" = c."id"
FROM "Compte" c WHERE c."slug" = 'reprise-' || e."userId"::text;

UPDATE "Abonnement" a SET "compteId" = c."id"
FROM "Compte" c WHERE c."slug" = 'reprise-' || a."userId"::text;

UPDATE "DemandeAssistance" d SET "compteId" = c."id"
FROM "Compte" c WHERE c."slug" = 'reprise-' || d."userId"::text;

UPDATE "Session" s SET "compteActifId" = m."compteId"
FROM "Membre" m WHERE m."userId" = s."userId";

UPDATE "Compte" SET "slug" = gen_random_uuid()::text WHERE "slug" LIKE 'reprise-%';

-- Règle de `migrations-index.test.ts` : sur une table existante, la clé est
-- posée NOT VALID, et validée dans une migration suivante.
ALTER TABLE "Entreprise" ADD CONSTRAINT "Entreprise_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "Compte"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "Abonnement" ADD CONSTRAINT "Abonnement_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "Compte"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "DemandeAssistance" ADD CONSTRAINT "DemandeAssistance_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "Compte"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;

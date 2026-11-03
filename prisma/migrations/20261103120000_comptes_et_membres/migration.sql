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

-- Un rôle, et l'un des trois (ADR-054 § 2) : filet en base sous le refus du
-- code (crochets du plugin, `estRole`). Pas de rôle multiple (« member,lecture »).
ALTER TABLE "Membre" ADD CONSTRAINT "Membre_role_valide" CHECK ("role" IN ('owner', 'member', 'lecture'));
ALTER TABLE "InvitationCompte" ADD CONSTRAINT "InvitationCompte_role_valide" CHECK ("role" IS NULL OR "role" IN ('owner', 'member', 'lecture'));

-- Un compte garde au moins un propriétaire (ADR-054 § 2). Le plugin le
-- vérifie hors transaction : deux propriétaires qui se retirent l'un l'autre au
-- même instant le passaient tous deux. Ici, le compte est verrouillé, puis les
-- propriétaires restants comptés : le second geste attend le premier, et il
-- échoue. Un compte supprimé emporte ses membres sans rien garder.
-- `FOR NO KEY UPDATE` sérialise deux déclencheurs sans attendre les insertions
-- qui pointent le compte. Limites écrites : la garantie vaut en READ COMMITTED
-- (le niveau de Prisma et du plugin) ; et supprimer un `User` dernier
-- propriétaire d'un compte qui existe encore est refusé — une suppression
-- (RGPD, faite à la main) vide d'abord le compte.
CREATE FUNCTION "membre_garde_un_proprietaire"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."role" <> 'owner' THEN
    RETURN NULL;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW."role" = 'owner' AND NEW."compteId" = OLD."compteId" THEN
    RETURN NULL;
  END IF;
  PERFORM 1 FROM "Compte" WHERE "id" = OLD."compteId" FOR NO KEY UPDATE;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "Membre" WHERE "compteId" = OLD."compteId" AND "role" = 'owner') THEN
    RAISE EXCEPTION 'Un compte garde au moins un propriétaire (ADR-054 § 2)' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER "membre_garde_un_proprietaire"
AFTER UPDATE OR DELETE ON "Membre"
FOR EACH ROW EXECUTE FUNCTION "membre_garde_un_proprietaire"();

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

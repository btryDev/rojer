-- Limitation de débit des points d'entrée publics (2026-10-14).
--
-- Audit OWASP B3 / B14, audit Next.js M11 : aucune limite sur la connexion,
-- l'inscription, la réinitialisation, la vérification publique d'une
-- signature (qui hache jusqu'à 20 Mo) ni le serveur MCP. Le compteur vit en
-- base parce que chaque instance Vercel a sa propre mémoire ; il vaut aussi
-- chez Clever Cloud. Migration ADDITIVE : une table neuve, rien n'est modifié
-- ailleurs. Sans ligne, une clé n'a encore rien consommé.

-- CreateTable
CREATE TABLE "LimiteDebit" (
    "cle" TEXT NOT NULL,
    "compte" INTEGER NOT NULL,
    "fenetreFin" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LimiteDebit_pkey" PRIMARY KEY ("cle")
);

-- CreateIndex
CREATE INDEX "LimiteDebit_fenetreFin_idx" ON "LimiteDebit"("fenetreFin");

-- RLS sans politique = refus par défaut, comme toutes les tables de `public`
-- (20261013120000_rls_tables_restantes) : l'app passe par Prisma, propriétaire.
ALTER TABLE "LimiteDebit" ENABLE ROW LEVEL SECURITY;

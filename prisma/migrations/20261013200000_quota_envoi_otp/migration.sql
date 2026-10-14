-- Plafond des envois de code de confirmation, par adresse (2026-10-13).
--
-- ADR-006, « Anti-abus » : « max 5 envois d'OTP / heure / email ». Le renvoi
-- n'avait qu'un délai de 60 s entre deux codes et aucun plafond total (audit
-- ASVS 5.0.0, V6.6.3). Migration ADDITIVE : une table neuve, rien n'est
-- modifié ailleurs. Sans ligne, une adresse n'a encore rien reçu par renvoi —
-- le défaut sûr, puisque les envois initiaux se comptent sur `AccessToken`.

-- CreateTable
CREATE TABLE "QuotaEnvoiOtp" (
    "empreinteAdresse" TEXT NOT NULL,
    "fenetreDebut" TIMESTAMP(3) NOT NULL,
    "envois" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuotaEnvoiOtp_pkey" PRIMARY KEY ("empreinteAdresse")
);

-- RLS sans politique = refus par défaut, comme toutes les tables de `public`
-- (20261013120000_rls_tables_restantes) : l'app passe par Prisma, propriétaire.
ALTER TABLE "QuotaEnvoiOtp" ENABLE ROW LEVEL SECURITY;

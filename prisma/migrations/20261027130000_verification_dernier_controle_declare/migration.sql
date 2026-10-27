-- ADR-051 (2026-10-27) : la date du dernier contrôle déclarée par
-- l'exploitant, sans rapport. Colonne nullable, ajoutée sans valeur : aucune
-- ligne existante ne change d'échéance.

ALTER TABLE "Verification" ADD COLUMN "dernierControleDeclareLe" TIMESTAMP(3);

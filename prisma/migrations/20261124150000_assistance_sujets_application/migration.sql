-- L'assistance s'ouvre à toutes les formules (ADR-050, amendée le
-- 2026-11-24) : trois sujets propres à l'application. Ajout seul, sans
-- usage dans la même transaction (contrainte de PostgreSQL sur ADD VALUE).
ALTER TYPE "CategorieAssistance" ADD VALUE 'ecran';
ALTER TYPE "CategorieAssistance" ADD VALUE 'connexion';
ALTER TYPE "CategorieAssistance" ADD VALUE 'abonnement';

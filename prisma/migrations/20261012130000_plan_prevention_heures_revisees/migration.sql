-- R. 4512-7, 1°, seconde phrase (2026-10-12) : le seuil des 400 heures vaut
-- aussi « dès lors qu'il apparaît, en cours d'exécution des travaux, que le
-- nombre d'heures de travail doit atteindre 400 heures ». Le nombre d'heures
-- prévisible revu en cours de chantier, et sa date. Additive : deux colonnes
-- nullables, sans défaut, aucune reprise — `NULL` = rien n'a été noté.
ALTER TABLE "PlanPrevention" ADD COLUMN "heuresPrevisiblesRevisees" INTEGER;
ALTER TABLE "PlanPrevention" ADD COLUMN "heuresPrevisiblesReviseesLe" TIMESTAMP(3);

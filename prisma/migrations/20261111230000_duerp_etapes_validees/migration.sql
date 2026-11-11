-- Les étapes du DUERP ne sont « faites » qu'une fois validées par le dirigeant
-- (2026-11-11) : `{ activite?, unites?, risques?, transverses? }`, dates ISO.
-- Colonne nullable, sans défaut : aucune réécriture de table, et les DUERP
-- existants repartent « à valider » (prod sans clients, données factices).
ALTER TABLE "Duerp" ADD COLUMN "etapesValidees" JSONB;

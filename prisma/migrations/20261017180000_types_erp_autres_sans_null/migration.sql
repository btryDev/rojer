-- ============================================================================
-- Les autres types d'ERP : aucun élément NULL — 2026-10-17 (ADR-045, revue de c6)
--
-- `Etablissement_types_erp_autres_sans_premier` (migration 20261017120000)
-- laissait passer un élément NULL : `'N' = ANY('{NULL}')` vaut NULL, `NOT NULL`
-- aussi, et un CHECK qui vaut NULL est satisfait. Une liste `{O,NULL}` aurait
-- donc été acceptée — un « type » qui n'en est pas un.
--
-- ADDITIVE : une contrainte de plus, la première reste telle quelle. Aucune
-- donnée à reprendre : la seule voie d'écriture (`typesErpAutresCoherents`)
-- n'écrit que des valeurs de l'enum, et l'ajout vérifie les lignes existantes.
-- ============================================================================

ALTER TABLE "Etablissement"
    ADD CONSTRAINT "Etablissement_types_erp_autres_sans_null" CHECK (
        array_position("typesErpAutres", NULL) IS NULL
    );

-- ============================================================================
-- Un ERP peut porter plusieurs types — 2026-10-17 (ADR-045, lot 2)
--
-- GN 2 de l'arrêté du 25 juin 1980 (LEGIARTI000020303850) : des exploitations
-- groupées dans un même bâtiment, non isolées, forment UN SEUL établissement,
-- d'UNE SEULE catégorie, auquel s'appliquent les dispositions particulières de
-- CHACUN de leurs types. `typeErp` reste le premier type déclaré ; les autres
-- vont ici. Décision de la propriétaire du 2026-10-16.
--
-- ADDITIVE : une colonne, NON NULL avec un défaut vide. Aucune donnée n'est
-- reprise — tout dossier existant reste à un seul type, à l'identique.
-- La contrainte `Etablissement_erp_type_categorie_requis` ne change pas.
--
-- Une contrainte : pas de doublon avec `typeErp` — l'union les dédoublonne,
-- mais un doublon en base dirait deux exploitations là où il n'y en a qu'une.
--
-- PAS DE CONTRAINTE CONTRE LES DOUBLONS DANS LA LISTE ('{M,M}'), et c'est
-- voulu : un CHECK ne peut pas contenir de sous-requête, il faudrait une
-- fonction SQL dédiée. Un doublon est sans effet — le moteur lit les types
-- par `typesErpDe`, qui dédoublonne — et la seule voie d'écriture
-- (`typesErpAutresCoherents`) les retire.
--
-- PAS DE CONTRAINTE « VIDE HORS ERP » (décision du 2026-10-17, via c6) :
-- décocher « ERP » garde les autres types en base, comme il garde déjà
-- `typeErp` et la catégorie — une erreur de clic ne doit rien perdre. Hors
-- ERP, le moteur les ignore (`matchTypologie`).
-- ============================================================================

ALTER TABLE "Etablissement"
    ADD COLUMN "typesErpAutres" "TypeErp"[] NOT NULL DEFAULT ARRAY[]::"TypeErp"[];

ALTER TABLE "Etablissement"
    ADD CONSTRAINT "Etablissement_types_erp_autres_sans_premier" CHECK (
        "typeErp" IS NULL OR NOT ("typeErp" = ANY ("typesErpAutres"))
    );

-- Un ERP porte TOUJOURS son type et sa catégorie (2026-09-27).
--
-- POURQUOI UNE CONTRAINTE, ET PAS « À CONFIRMER ». Le moteur écarte une
-- obligation bornée par catégorie ou par type d'ERP quand l'établissement n'en
-- porte pas (`evaluerErp`, `src/lib/matching/engine.ts`) — l'inverse de la
-- règle du non-renseigné, qui veut qu'une absence retienne la ligne « à
-- confirmer ». L'analyse du 2026-09-27
-- (`docs/revues/analyse-reponse-absente-2026-09-27.md`) a mesuré ce que
-- coûtait l'absence : jusqu'à huit lignes perdues, sans rien pour le dire.
-- Deux corrections étaient possibles : retenir l'union des cinq catégories
-- « à confirmer » (option B), ou rendre l'absence impossible. La propriétaire
-- a fait compter la production le même jour : zéro ERP sans type ou sans
-- catégorie sur quatre établissements. Les deux formulaires exigeaient déjà
-- les deux champs ; seule la base ne le faisait pas. C'est elle qui le fait
-- désormais, et l'asymétrie d'`evaluerErp` tient parce que le cas n'existe
-- plus. `absence-erp.test.ts` fait tomber la suite si cette contrainte
-- disparaît.
--
-- ADDITIVE : aucune colonne ne change, aucune donnée n'est réécrite. Elle
-- échoue si une ligne la viole déjà — c'est voulu : un ERP muet existant doit
-- être corrigé à la main, pas couvert par un défaut inventé.
ALTER TABLE "Etablissement"
    ADD CONSTRAINT "Etablissement_erp_type_categorie_requis" CHECK (
        NOT "estERP" OR ("typeErp" IS NOT NULL AND "categorieErp" IS NOT NULL)
    );

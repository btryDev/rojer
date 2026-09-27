-- ============================================================================
-- Groupe électrogène : les « non » de l'ancienne case n'étaient pas des réponses
-- C41 — 2026-09-27
--
-- CE QUI CHANGE. La question « Groupe électrogène de sécurité présent » était
-- une case à cocher, DÉCOCHÉE PAR DÉFAUT. `normaliserFormDataEquipement`
-- écrivait donc `"aGroupeElectrogene": false` à chaque enregistrement du
-- formulaire, pour toute catégorie d'équipement, que la personne ait répondu
-- ou non : une case décochée et une case jamais regardée sont indistinctes
-- dans un FormData. Aucun `false` écrit jusqu'ici n'est une réponse.
--
-- Depuis ce lot, la question est à trois états (Oui / Non / Je ne sais pas
-- encore) et les deux lignes d'EL 18 § 4 portent une condition
-- `equipement_propriete_non_infirmee` : absente ou `true` ⇒ applicables,
-- `false` ⇒ éteintes. Laissés en base, ces `false` éteindraient les deux
-- lignes chez tout ERP ayant enregistré son installation électrique par le
-- formulaire. On retire donc la clé quand elle vaut `false` : elle redevient
-- « pas encore répondu ». Un `false` écrit APRÈS ce lot est un « Non » choisi
-- dans le menu, et n'est pas concerné. Elle s'exécute une fois, pendant le
-- build Vercel (`prisma migrate deploy`), donc AVANT la bascule : un
-- enregistrement fait par l'ancien code pendant le build réécrirait un `false`
-- qui se lirait ensuite comme un « Non ». Fenêtre courte, données de
-- production fictives au 2026-09-27 (dit par la propriétaire) ; à rejouer à
-- la main, borné à l'heure de bascule, si de vraies données existaient.
--
-- CE QUI N'EST PAS TOUCHÉ. `true` (case cochée : une réponse). Les autres
-- clés du JSON. Toutes catégories confondues : hors installation électrique,
-- la clé n'a jamais été une réponse non plus, et le schéma refuse désormais
-- toute réponse hors catégorie.
--
-- Si la clé était la seule du JSON, la colonne repasse à NULL, comme
-- `serialiserCaracteristiques` l'écrit pour un équipement sans caractéristique.
--
-- Données seules : aucune structure ne change. Rejouable : une seconde
-- exécution ne trouve plus aucune ligne.
-- ============================================================================

UPDATE "Equipement"
SET "caracteristiques" = CASE
  WHEN ("caracteristiques" - 'aGroupeElectrogene') = '{}'::jsonb THEN NULL
  ELSE "caracteristiques" - 'aGroupeElectrogene'
END
WHERE jsonb_typeof("caracteristiques") = 'object'
  AND "caracteristiques" -> 'aGroupeElectrogene' = 'false'::jsonb;

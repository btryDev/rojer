-- Reprise des signatures des douze derniers mois au journal des plafonds
-- (ADR-053 § 14, lot C) : comptées à la demande (lien de signature parti) et
-- quand le titulaire a signé lui-même. Un lien dont l'e-mail n'est pas parti
-- ne compte pas. Les imports de DUERP ne laissent pas de trace distincte :
-- ils ne sont pas repris.

INSERT INTO "ConsommationQuota" ("compteId", "quota", "consommeLe")
SELECT en."compteId", 'signaturesParAn', s."createdAt"
FROM "Signature" s
JOIN "Etablissement" et ON et."id" = s."etablissementId"
JOIN "Entreprise" en ON en."id" = et."entrepriseId"
WHERE en."compteId" IS NOT NULL
  AND s."methode" = 'compte_connecte'
  AND s."createdAt" > now() - interval '12 months';

INSERT INTO "ConsommationQuota" ("compteId", "quota", "consommeLe")
SELECT en."compteId", 'signaturesParAn', a."createdAt"
FROM "AccessToken" a
JOIN "Etablissement" et ON et."id" = a."etablissementId"
JOIN "Entreprise" en ON en."id" = et."entrepriseId"
WHERE en."compteId" IS NOT NULL
  AND a."scope" = 'signature'
  AND (a."revoqueMotif" IS NULL OR a."revoqueMotif" <> 'l''e-mail n''a pas pu être envoyé ; demandez un nouveau lien à votre interlocuteur')
  AND a."createdAt" > now() - interval '12 months';

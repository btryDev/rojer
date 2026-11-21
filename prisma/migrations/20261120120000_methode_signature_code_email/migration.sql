-- La signature depuis le compte, confirmée par un code envoyé à l'adresse du
-- compte (2026-11-19, décision de la propriétaire, fenêtre « Signer et
-- envoyer » du plan de prévention).
--
-- Seule dans son fichier : PostgreSQL refuse d'utiliser une valeur d'enum
-- ajoutée dans la même transaction, et `prisma migrate deploy` exécute chaque
-- migration dans une transaction. Aucune ligne existante n'est touchée.

ALTER TYPE "MethodeSignature" ADD VALUE IF NOT EXISTS 'compte_code_email';

-- ADR-061 : l'unicité « une partie signe une fois » ne porte que sur les
-- signatures actives — `active` vaut true ou NULL, et PostgreSQL ne compare
-- pas les NULL. Écrite dans le schéma (`@@unique`), à l'abri d'un
-- `migrate dev` suivant, à la différence d'un index partiel. Sans verrou sur
-- la table vivante : seule dans son fichier.
CREATE UNIQUE INDEX CONCURRENTLY "Signature_objetType_objetId_partie_active_key" ON "Signature"("objetType", "objetId", "partie", "active");

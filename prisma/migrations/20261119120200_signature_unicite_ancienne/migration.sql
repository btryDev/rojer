-- ADR-061 : l'ancienne unicité (toutes signatures confondues) se retire, la
-- nouvelle (signatures actives) est posée par la migration précédente. Sans
-- verrou : seule dans son fichier.
DROP INDEX CONCURRENTLY "Signature_objetType_objetId_partie_key";

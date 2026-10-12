-- Audit du 2026-10-12, constat 7 : la partie d'une signature était devinée en
-- comparant des adresses. Elle est désormais ENREGISTRÉE — sur le jeton par
-- le demandeur, recopiée sur la signature. Additive : deux colonnes
-- nullables, aucune reprise. Une signature antérieure n'a pas de partie et
-- n'en reçoit pas : la déduire de l'adresse serait refaire le défaut.
CREATE TYPE "PartieSignataire" AS ENUM ('entreprise_utilisatrice', 'entreprise_exterieure');

ALTER TABLE "Signature" ADD COLUMN "partie" "PartieSignataire";
ALTER TABLE "AccessToken" ADD COLUMN "partie" "PartieSignataire";

-- Une partie signe une fois. Les NULL ne se comparent pas en Postgres : les
-- signatures de rapport et l'historique n'y sont pas soumis, et l'index se
-- pose sans conflit sur les lignes existantes.
CREATE UNIQUE INDEX "Signature_objetType_objetId_partie_key" ON "Signature"("objetType", "objetId", "partie");

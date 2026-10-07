-- ADR-038 : les « non » aux questions transverses. Additive, nullable, sans
-- valeur par défaut : NULL se lit « aucun refus enregistré », et les DUERP
-- existants gardent exactement leur lecture d'avant (un risque présent vaut
-- « oui », le reste « sans réponse »).
ALTER TABLE "Duerp" ADD COLUMN "reponsesTransverses" JSONB;

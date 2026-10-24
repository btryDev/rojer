import { describe, expect, it } from "vitest";
import { obligationParId, obligationsConformite } from "@/lib/referentiels/conformite";
import { estFormation } from "@/lib/referentiels/conformite/types";
import { PHRASE_SANS_REPONSE } from "@/lib/matching/sans-reponse";
import {
  cheminDeDeclaration,
  formationsEnAttenteDeReponse,
  lignesFormationAffichees,
} from "./par-l-equipe";
import type { LigneEtatPermanent } from "./queries";

const o = (id: string) => {
  const ob = obligationParId(id);
  if (!ob) throw new Error(id);
  return ob;
};

describe("la marque « formation » (décision du 2026-10-24)", () => {
  it("borne basse : les formations nommées par la décision la portent", () => {
    for (const id of [
      "formation-securite-etablissement-manutention",
      "elec-travail-habilitation-personnel",
      "incendie-erp-5-instruction-personnel",
      "secours-salarie-secouriste",
      "formation-securite-salarie-accueil",
    ]) {
      expect(estFormation(o(id)), id).toBe(true);
    }
  });

  it("borne haute : un document, une information, un exercice ou une autorisation ne la portent pas", () => {
    for (const id of [
      "elec-travail-carnet-prescriptions",
      "epi-etablissement-consigne-utilisation",
      "incendie-travail-exercice-semestriel",
      "incendie-travail-instructions-evacuation",
      "formation-securite-etablissement-information",
      "conduite-salarie-autorisation",
      "sante-travail-salarie-vip",
    ]) {
      expect(estFormation(o(id)), id).toBe(false);
    }
  });

  it("la marque ne sert qu'à la lecture : aucune obligation du niveau audit ne la porte", () => {
    const audit = obligationsConformite.filter((x) => x.niveau === "audit" && estFormation(x));
    expect(audit.map((x) => x.id)).toEqual([]);
  });
});

describe("où une ligne se déclare", () => {
  it("une formation dans Équipe › Formations, un document sur « Ce qui doit être en place »", () => {
    const manutention = o("formation-securite-etablissement-manutention");
    const carnet = o("elec-travail-carnet-prescriptions");
    expect(cheminDeDeclaration(manutention, "etat-x")).toBe("/equipe/formations#etat-x");
    expect(cheminDeDeclaration(carnet)).toBe("/etats-permanents");
  });
});

describe("Équipe › Formations n'affiche pas une formation qui attend une réponse", () => {
  const ligne = (id: string, phrases: string[]) =>
    ({ obligation: o(id), questionsSansReponse: phrases }) as unknown as LigneEtatPermanent;
  const muette = ligne("formation-securite-etablissement-manutention", [
    PHRASE_SANS_REPONSE.manutention_manuelle,
  ]);
  const repondue = ligne("formation-securite-etablissement-manutention", []);
  // Une question de la FICHE muette n'empêche pas l'affichage : la ligne est
  // due sous réserve, et la fiche se complète d'ici.
  const parLaFiche = ligne("incendie-erp-5-instruction-personnel", [
    PHRASE_SANS_REPONSE.locaux_sommeil_public,
  ]);

  it("cache la ligne qui ne tient qu'à un fait d'activité sans réponse, et la compte à part", () => {
    expect(lignesFormationAffichees([muette, repondue, parLaFiche])).toEqual([repondue, parLaFiche]);
    expect(formationsEnAttenteDeReponse([muette, repondue, parLaFiche])).toBe(1);
  });
});

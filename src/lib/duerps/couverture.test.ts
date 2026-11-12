import { describe, expect, it } from "vitest";
import { evaluerCouverture } from "./couverture";
import type { UniteCouverture } from "./couverture";
import type { Referentiel } from "@/lib/referentiels/types";

/**
 * Référentiels de test, construits à la main : les états de couverture ne
 * doivent pas dépendre du contenu réel des secteurs, qui bougera. Le contenu
 * réel est testé, lui, dans `referentiels.test.ts`.
 */
const secteurInstruit: Referentiel = {
  id: "test-instruit",
  nom: "Secteur instruit",
  codesNaf: [],
  unitesTravailSuggerees: [],
  risques: [],
  questionsDetection: [],
  activitesNonCouvertes: [
    {
      id: "tst-decoupe",
      libelle: "Découpe de viande sur place",
      question: "Découpez-vous de la viande sur place ?",
      cequiManque: "Machines de découpe, travail au froid.",
      pourquoi: "Le référentiel décrit la vente, pas le laboratoire.",
      aFaire: { uniteExistante: "u", risques: ["r"] },
    },
    {
      id: "tst-fournil",
      libelle: "Fournil",
      question: "Cuisez-vous du pain sur place ?",
      cequiManque: "Farines, four, travail de nuit.",
      pourquoi: "Le référentiel décrit la vente, pas la fabrication.",
      aFaire: { uniteExistante: "u", risques: ["r"] },
    },
  ],
};

const secteurNonInstruit: Referentiel = {
  id: "test-vide",
  nom: "Secteur non instruit",
  codesNaf: [],
  unitesTravailSuggerees: [],
  risques: [],
  questionsDetection: [],
  activitesNonCouvertes: [],
};

const referentiels = [secteurInstruit, secteurNonInstruit];

const uniteDuReferentiel: UniteCouverture = {
  id: "u1",
  nom: "Vente et caisse",
  referentielUniteId: "com-vente-caisse",
  estTransverse: false,
};
const uniteHorsReferentiel: UniteCouverture = {
  id: "u2",
  nom: "Laboratoire boucherie",
  referentielUniteId: null,
  estTransverse: false,
};
const uniteTransverse: UniteCouverture = {
  id: "u3",
  nom: "Risques transverses",
  referentielUniteId: null,
  estTransverse: true,
};
const uniteDeSnapshotAncien: UniteCouverture = {
  id: "u4",
  nom: "Unité importée d'un snapshot muet",
  estTransverse: false,
};

function evaluer(
  reponses: Record<string, boolean | undefined>,
  unites: UniteCouverture[] = [uniteDuReferentiel],
  secteurId = "test-instruit",
) {
  return evaluerCouverture({ secteurId, reponses, unites, referentiels });
}

describe("evaluerCouverture — les cinq états", () => {
  it("secteur_inconnu quand aucun référentiel ne porte l'identifiant", () => {
    const c = evaluer({}, [uniteDuReferentiel], "n-existe-pas");
    expect(c.etat).toBe("secteur_inconnu");
    expect(c.secteurNom).toBeNull();
    // Non instruit par défaut : sans référence, on n'affirme aucune couverture.
    expect(c.listeInstruite).toBe(false);
  });

  it("secteur_inconnu nomme quand même les unités hors référentiel", () => {
    const c = evaluer({}, [uniteHorsReferentiel], "n-existe-pas");
    expect(c.etat).toBe("secteur_inconnu");
    expect(c.unitesHorsReferentiel).toEqual([
      { id: "u2", nom: "Laboratoire boucherie" },
    ]);
  });

  it("secteur_non_instruit : une liste vide n'est pas une couverture totale", () => {
    const c = evaluer({}, [uniteDuReferentiel], "test-vide");
    expect(c.etat).toBe("secteur_non_instruit");
    expect(c.listeInstruite).toBe(false);
    expect(c.activitesSansReponse).toEqual([]);
    // Et surtout : ce n'est pas « aucun manque identifié ».
    expect(c.etat).not.toBe("aucun_manque_identifie");
  });

  it("manques_identifies sur une activité déclarée", () => {
    const c = evaluer({ "tst-decoupe": true, "tst-fournil": false });
    expect(c.etat).toBe("manques_identifies");
    expect(c.activitesDeclarees.map((a) => a.id)).toEqual(["tst-decoupe"]);
    expect(c.activitesDeclarees[0].cequiManque).toContain("travail au froid");
  });

  it("manques_identifies sur une unité hors référentiel seule", () => {
    const c = evaluer({ "tst-decoupe": false, "tst-fournil": false }, [
      uniteDuReferentiel,
      uniteHorsReferentiel,
    ]);
    expect(c.etat).toBe("manques_identifies");
    expect(c.activitesDeclarees).toEqual([]);
    expect(c.unitesHorsReferentiel).toHaveLength(1);
  });

  it("reponses_incompletes : aucun manque nommé mais une question non tranchée", () => {
    const c = evaluer({ "tst-decoupe": false });
    expect(c.etat).toBe("reponses_incompletes");
    expect(c.activitesEcartees.map((a) => a.id)).toEqual(["tst-decoupe"]);
    expect(c.activitesSansReponse.map((a) => a.id)).toEqual(["tst-fournil"]);
  });

  it("aucun_manque_identifie quand tout est répondu « non » et aucune unité hors référentiel", () => {
    const c = evaluer({ "tst-decoupe": false, "tst-fournil": false });
    expect(c.etat).toBe("aucun_manque_identifie");
    expect(c.activitesEcartees).toHaveLength(2);
    expect(c.activitesSansReponse).toEqual([]);
    expect(c.unitesHorsReferentiel).toEqual([]);
  });
});

describe("evaluerCouverture — « non » explicite et silence ne sont pas le même état", () => {
  it("un « non » range l'activité dans les écartées, une absence dans les sans-réponse", () => {
    const cNon = evaluer({ "tst-decoupe": false, "tst-fournil": false });
    const cSilence = evaluer({});
    expect(cNon.activitesEcartees).toHaveLength(2);
    expect(cNon.activitesSansReponse).toHaveLength(0);
    expect(cSilence.activitesEcartees).toHaveLength(0);
    expect(cSilence.activitesSansReponse).toHaveLength(2);
    // Deux états distincts : le silence ne se lit jamais comme un refus.
    expect(cNon.etat).toBe("aucun_manque_identifie");
    expect(cSilence.etat).toBe("reponses_incompletes");
  });

  it("une valeur undefined explicite vaut « pas répondu », jamais « non »", () => {
    const c = evaluer({ "tst-decoupe": undefined, "tst-fournil": false });
    expect(c.activitesSansReponse.map((a) => a.id)).toEqual(["tst-decoupe"]);
    expect(c.etat).toBe("reponses_incompletes");
  });

  it("une réponse portant un identifiant inconnu n'invente aucune ligne", () => {
    const c = evaluer({
      "tst-decoupe": false,
      "tst-fournil": false,
      "tst-activite-disparue": true,
    });
    expect(c.etat).toBe("aucun_manque_identifie");
    expect(c.activitesDeclarees).toEqual([]);
  });
});

describe("evaluerCouverture — les deux manques ne se confondent pas", () => {
  it("activité déclarée et unité hors référentiel restent dans deux listes", () => {
    const c = evaluer({ "tst-decoupe": true }, [
      uniteDuReferentiel,
      uniteHorsReferentiel,
    ]);
    expect(c.activitesDeclarees).toHaveLength(1);
    expect(c.unitesHorsReferentiel).toHaveLength(1);
    // Aucun total : rien dans le résultat n'additionne les deux.
    expect(Object.values(c).some((v) => typeof v === "number")).toBe(false);
  });

  it("une unité transverse n'est pas un manque", () => {
    const c = evaluer({ "tst-decoupe": false, "tst-fournil": false }, [
      uniteTransverse,
    ]);
    expect(c.unitesHorsReferentiel).toEqual([]);
    expect(c.etat).toBe("aucun_manque_identifie");
  });

  it("une unité de snapshot muet (referentielUniteId absent) n'est pas un manque", () => {
    const c = evaluer({ "tst-decoupe": false, "tst-fournil": false }, [
      uniteDeSnapshotAncien,
    ]);
    expect(c.unitesHorsReferentiel).toEqual([]);
    expect(c.etat).toBe("aucun_manque_identifie");
  });
});

describe("evaluerCouverture — contrat de sortie", () => {
  it("le résultat survit à un aller-retour JSON (il finira dans un snapshot)", () => {
    const c = evaluer({ "tst-decoupe": true }, [
      uniteDuReferentiel,
      uniteHorsReferentiel,
    ]);
    expect(JSON.parse(JSON.stringify(c))).toEqual(c);
  });

  it("la fonction est pure : elle ne touche ni aux réponses ni aux unités", () => {
    const reponses = { "tst-decoupe": true };
    const unites = [uniteDuReferentiel, uniteHorsReferentiel];
    evaluerCouverture({
      secteurId: "test-instruit",
      reponses,
      unites,
      referentiels,
    });
    expect(reponses).toEqual({ "tst-decoupe": true });
    expect(unites).toHaveLength(2);
  });

  it("résout un secteur réel du dépôt sans injection", () => {
    const c = evaluerCouverture({
      secteurId: "commerce",
      reponses: {},
      unites: [],
    });
    expect(c.secteurNom).toBe("Commerce de détail");
    expect(c.secteurId).toBe("commerce");
  });
});

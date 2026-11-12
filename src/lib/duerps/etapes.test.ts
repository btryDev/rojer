import { describe, expect, it } from "vitest";

const TOUTES_VALIDEES = { activite: true, unites: true, risques: true, transverses: true };
import { construireEtapes, enteteEtape } from "./etapes";
import type { EtapeFilId } from "./etapes-validees";

const progression = {
  secteurOk: true,
  unitesOk: true,
  validees: TOUTES_VALIDEES,
  risquesOk: true,
  transverses: { faite: true, sansReponse: [] },
  activitesPosees: false,
  versionValidee: false,
};

function ids(etapes: ReturnType<typeof construireEtapes>): EtapeFilId[] {
  return etapes.map((e) => e.id as EtapeFilId);
}

/**
 * « Votre activité » regroupe le secteur et ses précisions (2026-11-11) : le
 * fil a toujours cinq étapes, et les précisions n'y sont jamais une étape à
 * part. Elles comptent dans l'avancement de l'étape et dans son « Fait ».
 */
describe("construireEtapes — « Votre activité »", () => {
  it("le fil a toujours cinq étapes, avec ou sans précisions", () => {
    const attendu = ["activite", "unites", "risques", "transverses", "synthese"];
    expect(ids(construireEtapes("d1", "unites", progression))).toEqual(attendu);
    expect(
      ids(construireEtapes("d1", "unites", { ...progression, activitesPosees: true })),
    ).toEqual(attendu);
  });

  it("le secteur et les précisions sont la même étape courante", () => {
    for (const page of ["secteur", "activites"] as const) {
      const etapes = construireEtapes("d1", page, progression);
      expect(etapes.find((e) => e.actuelle)?.id).toBe("activite");
    }
    expect(enteteEtape("secteur")).toBe("01 · Votre activité");
    expect(enteteEtape("activites")).toBe("01 · Votre activité");
    expect(enteteEtape("synthese")).toBe("05 · Synthèse");
  });

  it("non validée, l'étape est à faire, sans rien bloquer", () => {
    const etapes = construireEtapes("d1", "synthese", {
      ...progression,
      activitesPosees: true,
      validees: { ...TOUTES_VALIDEES, activite: false },
    });
    expect(etapes[0].faite).toBe(false);
    expect(etapes.find((e) => e.id === "unites")?.atteinte).toBe(true);
    expect(etapes.find((e) => e.id === "synthese")?.atteinte).toBe(true);
  });

  it("le secteur choisi, l'étape mène aux précisions s'il y en a, au secteur sinon", () => {
    const href = (p: Partial<typeof progression>) =>
      construireEtapes("d1", "unites", { ...progression, ...p })[0].href;
    expect(href({ activitesPosees: true })).toBe("/duerp/d1/activites");
    expect(href({ activitesPosees: false })).toBe("/duerp/d1/secteur");
    expect(href({ secteurOk: false, activitesPosees: true })).toBe("/duerp/d1/secteur");
  });
});

describe("construireEtapes — les unités se valident (2026-11-11)", () => {
  it("des unités pré-remplies ne font pas l'étape tant qu'elle n'est pas validée", () => {
    const etapes = construireEtapes("d1", "unites", { ...progression, validees: { ...TOUTES_VALIDEES, unites: false } });
    const unites = etapes.find((e) => e.id === "unites");
    expect(unites?.faite).toBe(false);
    // Elles ouvrent quand même la suite : rien n'est bloqué.
    expect(etapes.find((e) => e.id === "risques")?.atteinte).toBe(true);
  });

  it("validée sans unité, l'étape n'est pas faite", () => {
    const etapes = construireEtapes("d1", "unites", { ...progression, unitesOk: false });
    expect(etapes.find((e) => e.id === "unites")?.faite).toBe(false);
  });
});

describe("construireEtapes — si pas validé, pas fait (2026-11-11)", () => {
  it("complète mais non validée, aucune étape n'est faite", () => {
    const etapes = construireEtapes("d1", "unites", {
      ...progression,
      versionValidee: true,
      validees: {},
    });
    expect(etapes.filter((e) => e.faite).map((e) => e.id)).toEqual(["synthese"]);
  });

  it("validée mais incomplète, l'étape reste à faire", () => {
    const etapes = construireEtapes("d1", "unites", {
      ...progression,
      transverses: { faite: false, sansReponse: ["q1"] },
    });
    expect(etapes.find((e) => e.id === "transverses")?.faite).toBe(false);
  });
});

describe("construireEtapes — avancement par étape", () => {
  it("une étape faite est pleine, l'étape courante suit sa part", () => {
    const etapes = construireEtapes("d1", "risques", {
      ...progression,
      risquesOk: false,
      transverses: { faite: false, sansReponse: ["q1"] },
      avancement: { risques: 0.5, transverses: 0.9, unites: 0.2 },
    });
    const av = (id: string) => etapes.find((e) => e.id === id)?.avancement;
    expect(av("risques")).toBe(0.5);
    // Pas l'étape courante : sa part ne se montre pas, un segment rempli
    // ailleurs se lirait « fait ».
    expect(av("transverses")).toBe(0);
    // Faite : pleine, même si l'appelant dit moins.
    expect(av("unites")).toBe(1);
    expect(av("synthese")).toBe(0);
  });
});

// Relecture indépendante du 2026-10-12 : la synthèse était verrouillée par
// l'étape transverses (« À venir », non cliquable) sur un DUERP déjà validé
// dont une question est sans réponse.
describe("construireEtapes — la synthèse n'attend pas les questions transverses", () => {
  const sansReponse = {
    ...progression,
    transverses: { faite: false, sansReponse: ["q-routier"] },
  };

  it("une question sans réponse : la synthèse reste atteignable, l'étape transverses garde son signal", () => {
    const etapes = construireEtapes("d1", "synthese", sansReponse);
    expect(etapes.find((e) => e.id === "synthese")?.atteinte).toBe(true);
    expect(etapes.find((e) => e.id === "transverses")?.signal?.texte).toBe(
      "1 question sans réponse",
    );
  });

  it("sans unité, la synthèse reste à venir", () => {
    const etapes = construireEtapes("d1", "unites", { ...sansReponse, unitesOk: false });
    expect(etapes.find((e) => e.id === "synthese")?.atteinte).toBe(false);
  });
});

describe("construireEtapes — « Fait » se lit sur les données (2026-10-28)", () => {
  const avec = (p: Partial<Parameters<typeof construireEtapes>[2]>) =>
    construireEtapes("d1", "unites", { ...progression, ...p });
  const faite = (etapes: ReturnType<typeof construireEtapes>, id: EtapeFilId) =>
    etapes.find((e) => e.id === id)?.faite;

  it("accessible n'est pas fait : risques non évalués, l'étape est atteinte mais pas faite", () => {
    const etapes = avec({ risquesOk: false });
    expect(etapes.find((e) => e.id === "risques")?.atteinte).toBe(true);
    expect(faite(etapes, "risques")).toBe(false);
  });

  it("la synthèse n'est faite qu'avec une version validée", () => {
    expect(faite(avec({}), "synthese")).toBe(false);
    expect(faite(avec({ versionValidee: true }), "synthese")).toBe(true);
  });

  it("les transverses suivent leur état calculé", () => {
    expect(faite(avec({ transverses: { faite: false, sansReponse: ["q1"] } }), "transverses")).toBe(false);
    expect(faite(avec({}), "transverses")).toBe(true);
  });
});

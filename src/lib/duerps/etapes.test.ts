import { describe, expect, it } from "vitest";
import { construireEtapes, type EtapeId } from "./etapes";

const progression = {
  secteurOk: true,
  unitesOk: true,
  risquesOk: true,
  transverses: { faite: true, sansReponse: [] },
  activitesPosees: false,
  activitesOk: false,
  versionValidee: false,
};

function ids(etapes: ReturnType<typeof construireEtapes>): EtapeId[] {
  return etapes.map((e) => e.id as EtapeId);
}

/**
 * L'étape « Périmètre du référentiel » (ADR-020) n'existe que si le secteur
 * retenu a des questions à poser. Un écran de questions vide, ou une étape
 * cochée sans rien derrière, se lirait « le référentiel couvre tout » — c'est
 * précisément l'affirmation que le module refuse de produire.
 */
describe("construireEtapes — étape périmètre", () => {
  it("reste masquée quand le secteur ne déclare aucune activité", () => {
    expect(ids(construireEtapes("d1", "unites", progression))).not.toContain(
      "activites",
    );
  });

  it("apparaît avant les unités quand le secteur en déclare", () => {
    const liste = ids(
      construireEtapes("d1", "unites", {
        ...progression,
        activitesPosees: true,
      }),
    );
    expect(liste.indexOf("activites")).toBeGreaterThanOrEqual(0);
    expect(liste.indexOf("activites")).toBeLessThan(liste.indexOf("unites"));
  });

  it("reste visible si on s'y trouve, même sans question déclarée", () => {
    // Sinon le fil d'étapes afficherait une progression dont l'étape courante
    // ne fait pas partie — l'utilisateur se verrait nulle part.
    expect(ids(construireEtapes("d1", "activites", progression))).toContain(
      "activites",
    );
  });

  it("n'est jamais bloquante : elle ne conditionne aucune étape suivante", () => {
    const etapes = construireEtapes("d1", "synthese", {
      ...progression,
      activitesPosees: true,
    });
    expect(etapes.find((e) => e.id === "unites")?.atteinte).toBe(true);
    expect(etapes.find((e) => e.id === "synthese")?.atteinte).toBe(true);
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
  const faite = (etapes: ReturnType<typeof construireEtapes>, id: EtapeId) =>
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

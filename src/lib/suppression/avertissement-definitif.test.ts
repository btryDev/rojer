// Décision de la propriétaire, 2026-09-27 : « quand employeur supprime il est
// averti que data supprimé définitivement ».
//
// Trois gestes effacent des données d'un salarié : retirer un titre, supprimer
// l'établissement, supprimer l'entreprise (cascade `Salarie` → `TitreSalarie`).
// Chacun doit le dire, et dire que c'est définitif. L'export n'est nommé que
// là où il existe : le bouton « Éditer ses données » de la fiche du salarié.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  detailSuppressionEntreprise,
  detailSuppressionEtablissement,
} from "./perimetre";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const lire = (chemin: string) => readFileSync(join(RACINE, chemin), "utf8");

describe("au geste de suppression, l'employeur lit que c'est définitif", () => {
  it("l'établissement : l'équipe et ses titres sont nommés, et c'est définitif", () => {
    const t = detailSuppressionEtablissement({ nom: "Atelier", lignes: 12, versionsDuerp: 0, rapports: 0, entrepriseEmportee: null });
    expect(t).toMatch(/fiches de l'équipe avec leurs titres/);
    expect(t).toMatch(/supprimé définitivement/);
    expect(t).not.toMatch(/l'entreprise est supprimée/);
  });

  it("le dernier établissement d'une entreprise : elle part avec lui, et la phrase le dit (2026-10-26)", () => {
    const t = detailSuppressionEtablissement({ nom: "Atelier", lignes: 12, versionsDuerp: 0, rapports: 0, entrepriseEmportee: "SARL Atelier" });
    expect(t).toMatch(/dernier établissement de SARL Atelier : l'entreprise est supprimée avec lui/);
  });

  it.each([0, 1, 2])("l'entreprise, %i établissement(s) : idem", (n) => {
    const t = detailSuppressionEntreprise({
      etablissements: Array.from({ length: n }, (_, i) => `É${i}`),
      lignes: 5,
      versionsDuerp: 0,
      rapports: 0,
    });
    if (n > 0) expect(t).toMatch(/fiches de l'équipe avec leurs titres/);
    expect(t).toMatch(/supprimé définitivement/);
  });

  it("le retrait d'un titre : définitif, et l'export qu'il nomme existe sur la fiche", () => {
    const actions = lire("src/components/salaries/ActionsSalarie.tsx");
    expect(actions).toMatch(/supprimés définitivement/);
    expect(actions).toMatch(/« Éditer ses données »/);
    const fiche = lire("src/app/etablissements/[id]/equipe/[salarieId]/page.tsx");
    expect(fiche).toMatch(/Éditer ses données/);
    expect(fiche).toMatch(/\/equipe\/\$\{s\.id\}\/donnees/);
  });
});

// Décision de la propriétaire, 2026-10-30 : supprimer un dossier qui porte des
// rapports de vérification n'est pas refusé, mais l'employeur est prévenu
// avant — D. 4711-3 les lui fait conserver, et après c'est sa responsabilité.
describe("au geste de suppression, l'employeur est prévenu des rapports à conserver", () => {
  const etab = (rapports: number) =>
    detailSuppressionEtablissement({ nom: "Atelier", lignes: 12, versionsDuerp: 0, rapports, entrepriseEmportee: null });
  const entreprise = (rapports: number) =>
    detailSuppressionEntreprise({ etablissements: ["Atelier"], lignes: 12, versionsDuerp: 0, rapports });

  it.each([
    ["l'établissement", etab],
    ["l'entreprise", entreprise],
  ] as const)("%s, des rapports : le nombre, D. 4711-3, l'export, la charge", (_, phrase) => {
    const t = phrase(3);
    expect(t).toMatch(/Les 3 rapports de vérification partent aussi/);
    expect(t).toMatch(/cinq dernières années/);
    expect(t).toMatch(/deux derniers contrôles \(art\. D\. 4711-3\)/);
    expect(t).toMatch(/« Préparer un contrôle » avant de supprimer/);
    expect(t).toMatch(/conservation sera à votre charge/);
    // L'avertissement vient avant « définitivement », pas après.
    expect(t.indexOf("D. 4711-3")).toBeLessThan(t.indexOf("supprimé définitivement"));
  });

  it("un seul rapport : au singulier", () => {
    expect(etab(1)).toMatch(/Le rapport de vérification part aussi/);
  });

  it.each([
    ["l'établissement", etab],
    ["l'entreprise", entreprise],
  ] as const)("%s, aucun rapport : rien n'est dit", (_, phrase) => {
    expect(phrase(0)).not.toMatch(/D\. 4711-3|rapports? de vérification/);
  });
});

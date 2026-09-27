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
    const t = detailSuppressionEtablissement({ nom: "Atelier", lignes: 12, versionsDuerp: 0 });
    expect(t).toMatch(/fiches de l'équipe avec leurs titres/);
    expect(t).toMatch(/supprimé définitivement/);
  });

  it.each([0, 1, 2])("l'entreprise, %i établissement(s) : idem", (n) => {
    const t = detailSuppressionEntreprise({
      etablissements: Array.from({ length: n }, (_, i) => `É${i}`),
      lignes: 5,
      versionsDuerp: 0,
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

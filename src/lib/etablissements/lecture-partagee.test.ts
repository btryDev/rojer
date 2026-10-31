import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * CE QUE CE FICHIER DÉFEND (plan performance, 2026-10-29).
 *
 * `etablissementDuRendu` est mémoïsée sur le rendu et lue par la barre
 * latérale EN PARALLÈLE de la page — donc possiblement avant la réparation du
 * calendrier que font le tableau de bord et le calendrier. Les colonnes que la
 * réparation écrit sont OMISES de cette lecture, pour qu'aucun lecteur ne les
 * y prenne d'avant la réparation.
 *
 * La liste des colonnes omises est écrite à la main ; celle des colonnes
 * écrites vit dans le code du calendrier. Ce test les relie : toute colonne
 * d'`Etablissement` qu'un module du calendrier écrit doit être omise, et
 * `updatedAt` avec elle (Prisma la réécrit à chaque `update`). Aucune
 * exécution ne l'observe — `cache()` ne mémoïse rien hors rendu — d'où la
 * lecture des sources, comme `calendrier/fraicheur-sorties.test.ts`.
 */

const SRC = join(__dirname, "..", "..");
const DOSSIER_CALENDRIER = join(SRC, "lib", "calendrier");

/** Les colonnes posées dans le `data` de chaque écriture d'`Etablissement`. */
function colonnesEcritesParLeCalendrier(): Set<string> {
  const colonnes = new Set<string>();
  const fichiers = readdirSync(DOSSIER_CALENDRIER).filter(
    (f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && f !== "faux-prisma.ts",
  );
  for (const f of fichiers) {
    const source = readFileSync(join(DOSSIER_CALENDRIER, f), "utf8");
    const ecritures = source.matchAll(
      /\betablissement\.update(?:Many)?\(\{[^]*?\bdata:\s*\{([^}]*)\}/g,
    );
    for (const [, data] of ecritures) {
      for (const [, cle] of data.matchAll(/(\w+)\s*:/g)) colonnes.add(cle);
    }
  }
  return colonnes;
}

function colonnesOmises(): Set<string> {
  const source = readFileSync(join(__dirname, "queries.ts"), "utf8");
  const debut = source.indexOf("export const etablissementDuRendu");
  const omit = source.slice(debut).match(/\bomit:\s*\{([^}]*)\}/);
  return new Set(
    [...(omit?.[1] ?? "").matchAll(/(\w+)\s*:\s*true/g)].map(([, c]) => c),
  );
}

describe("la lecture partagée de l'établissement omet ce que la réparation écrit", () => {
  it("trouve les écritures du calendrier — sinon rien n'est prouvé", () => {
    // Le sceau, posé par la régénération et effacé par `marquerCalendrierPerime`.
    expect([...colonnesEcritesParLeCalendrier()]).toContain(
      "referentielVersionCalendrier",
    );
  });

  it("chaque colonne écrite par le calendrier, et `updatedAt`, est omise", () => {
    const omises = colonnesOmises();
    const manquantes = [...colonnesEcritesParLeCalendrier(), "updatedAt"].filter(
      (c) => !omises.has(c),
    );
    expect(
      manquantes,
      "Ces colonnes peuvent être réécrites pendant le rendu, après la lecture " +
        "partagée : omettez-les de `etablissementDuRendu`, et lisez-les " +
        "par une lecture à soi.",
    ).toEqual([]);
  });
});

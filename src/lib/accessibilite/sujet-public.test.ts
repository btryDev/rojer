import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cheminPublic } from "@/lib/auth/proxy-session";
import {
  surfacesQuiNommentLEntreprise,
  SURFACES_PUBLIQUES_ACCESSIBILITE,
} from "./sujet-public";

const RACINE = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
);

/**
 * AUCUNE SURFACE PUBLIQUE DU REGISTRE NE DÉCIDE SEULE DE QUI ELLE PARLE.
 *
 * `identite.test.ts` vérifie que la décision est juste. Celui-ci vérifie
 * qu'elle est PRISE À UN SEUL ENDROIT — et c'est l'énoncé qui manquait : les
 * deux surfaces composaient leur en-tête chacune dans son coin, et les deux
 * l'ont composé faux, pendant des mois, sur un document que la loi rend
 * public.
 *
 * L'énoncé est à zéro et il y reste. Deux remèdes quand il tombe, jamais un
 * troisième : passer la surface par `identitePublique`, ou retirer la mention.
 * Excepter un fichier n'en est pas un — c'est exactement ce qui aurait laissé
 * l'affiche A4 titrer du nom d'un autre lieu pendant qu'on corrigeait la page.
 */
describe("le sujet d'une surface publique du registre", () => {
  it("aucune ne nomme l'entreprise elle-même", () => {
    const emprunts = surfacesQuiNommentLEntreprise(RACINE);
    expect(
      emprunts,
      `${emprunts.length} endroit(s) où une surface publique du registre ` +
        `nomme l'entreprise de sa propre autorité. Sur une page atteinte ` +
        `depuis la rue, le sujet est l'établissement : le titre, l'adresse et ` +
        `l'exploitant se demandent à \`identitePublique\`. Ne pas excepter le ` +
        `fichier — le passer par le helper, ou retirer la mention.\n\n` +
        emprunts.map((e) => `  ${e.emplacement}  —  ${e.ligne}`).join("\n"),
    ).toEqual([]);
  });

  it("les répertoires balayés sont bien ceux servis sans session", () => {
    // Le périmètre n'est pas affirmé, il est demandé à la règle du proxy.
    // Si `/accessibilite` cessait d'être public, cette garde parlerait d'un
    // risque qui n'existe plus — et il vaut mieux qu'elle le dise que de
    // continuer à balayer une liste devenue arbitraire.
    for (const dossier of SURFACES_PUBLIQUES_ACCESSIBILITE) {
      const route = dossier.replace(/^src\/app/, "");
      expect(cheminPublic(`${route}/un-slug`), `${route} n'est plus public`).toBe(
        true,
      );
    }
  });

  it("le balayage voit vraiment le défaut qu'on lui injecte", () => {
    // RÉINJECTION DU DÉFAUT RÉEL. Sans ceci, un motif mort rendrait une liste
    // vide et la garde passerait au vert en ne mesurant plus rien. Ce qui est
    // injecté n'est pas un cas d'école : c'est le `<h1>` que la page portait
    // avant le 2026-09-04, à la ligne près.
    const bac = mkdtempSync(join(tmpdir(), "sujet-public-"));
    try {
      for (const dossier of SURFACES_PUBLIQUES_ACCESSIBILITE) {
        mkdirSync(join(bac, dossier, "[slug]"), { recursive: true });
      }
      writeFileSync(
        join(bac, "src/app/accessibilite", "[slug]", "page.tsx"),
        [
          "export default function P({ etab }) {",
          "  const entreprise = etab.entreprise;",
          "  return <h1>{entreprise.raisonSociale}</h1>;",
          "}",
          "",
        ].join("\n"),
      );

      const vus = surfacesQuiNommentLEntreprise(bac);
      expect(vus.length).toBeGreaterThan(0);
      expect(vus[0].emplacement).toContain("src/app/accessibilite");
      expect(vus.some((v) => v.ligne.includes("raisonSociale"))).toBe(true);
    } finally {
      rmSync(bac, { recursive: true, force: true });
    }
  });

  it("le SIRET réinjecté au pied de page est vu, lui aussi", () => {
    // Le SECOND défaut, et il ne se serait pas attrapé par le premier motif :
    // un pied de page qui affiche `siret` sans écrire le mot « entreprise ».
    const bac = mkdtempSync(join(tmpdir(), "sujet-public-siret-"));
    try {
      mkdirSync(join(bac, "src/app/accessibilite", "[slug]"), {
        recursive: true,
      });
      mkdirSync(join(bac, "src/app/api/accessibilite"), { recursive: true });
      writeFileSync(
        join(bac, "src/app/accessibilite", "[slug]", "page.tsx"),
        "export const F = ({ siret }) => <p>SIRET {siret}</p>;\n",
      );

      const vus = surfacesQuiNommentLEntreprise(bac);
      expect(vus.map((v) => v.ligne).join("\n")).toContain("siret");
    } finally {
      rmSync(bac, { recursive: true, force: true });
    }
  });

  it("un commentaire qui parle de l'entreprise ne fait pas tomber la garde", () => {
    // Borne haute. Les corrections de ce module s'expliquent en commentaire —
    // celui de `page.tsx` raconte précisément pourquoi le SIRET est parti. Une
    // garde qui les interdirait ferait effacer l'explication pour passer au
    // vert, ce qui est le contraire du but.
    const bac = mkdtempSync(join(tmpdir(), "sujet-public-comm-"));
    try {
      mkdirSync(join(bac, "src/app/accessibilite", "[slug]"), {
        recursive: true,
      });
      mkdirSync(join(bac, "src/app/api/accessibilite"), { recursive: true });
      writeFileSync(
        join(bac, "src/app/accessibilite", "[slug]", "page.tsx"),
        [
          "/* Le SIRET de l'entreprise est parti d'ici : `raisonSociale`",
          "   titrait la page, et le siret publié était celui du siège. */",
          "// L'entreprise ne revient pas en titre.",
          "export const P = () => <h1>ok</h1>;",
          "",
        ].join("\n"),
      );

      expect(surfacesQuiNommentLEntreprise(bac)).toEqual([]);
    } finally {
      rmSync(bac, { recursive: true, force: true });
    }
  });
});

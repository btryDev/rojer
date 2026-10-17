import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NOM_HISTORIQUE_PREMIERE_ZONE, nomDeZone } from "./nom-zone";

// Décision de la propriétaire du 2026-10-17 (ADR-029 amendée) : un
// établissement = un bâtiment ; les zones, trois au plus, en sont des
// subdivisions ; jamais plusieurs bâtiments. Aucun texte affiché ne parle de
// plusieurs bâtiments, ni ne nomme « bâtiment » ce qui est une zone.

/** Les répertoires d'où sortent les textes affichés (écrans, PDF, registre, MCP…). */
const SURFACES = [
  "src/app",
  "src/components",
  "src/lib/pdf",
  "src/lib/registre",
  "src/lib/perimetre",
  "src/lib/mcp",
  "src/lib/calendrier",
  "src/lib/dashboard",
  "src/lib/equipements",
  "src/lib/etablissements",
  "src/lib/onboarding",
  "src/lib/batiments",
];

/**
 * Ce qu'un texte ne peut plus dire. L'ACCENT est exigé : un texte affiché
 * l'écrit toujours, un identifiant ou un chemin (`batiments`, `Batiment`) jamais.
 * Le pluriel « bâtiments d'habitation » (titre de l'arrêté du 23 juin 1978)
 * reste permis.
 */
const INTERDITS: { nom: string; motif: RegExp }[] = [
  { nom: "« bâtiments » au pluriel", motif: /\b[bB]âtiments\b(?! d'habitation)/ },
  { nom: "« second bâtiment »", motif: /\b(second|deuxième|2e|autre|nouveau)\s+bâtiment\b/i },
  { nom: "« chaque bâtiment » / « par bâtiment »", motif: /\b(chaque|par|ce|quel)\s+bâtiment\b/i },
  { nom: "« ajouter un bâtiment »", motif: /\bajouter\s+un\s+bâtiment\b/i },
  { nom: "le nom historique de la première zone écrit en dur", motif: new RegExp(NOM_HISTORIQUE_PREMIERE_ZONE) },
];

function fichiers(dossier: string): string[] {
  const out: string[] = [];
  const descendre = (d: string) => {
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      if (statSync(p).isDirectory()) descendre(p);
      else if (/\.tsx?$/.test(p) && !/\.test\./.test(p)) out.push(p);
    }
  };
  descendre(join(process.cwd(), dossier));
  return out;
}

/** Le texte d'un source sans ses commentaires : les décisions s'y racontent, le dirigeant ne les lit pas. */
export function sansCommentaires(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
}

function fautes(textes: { fichier: string; texte: string }[]): string[] {
  return textes.flatMap(({ fichier, texte }) =>
    INTERDITS.flatMap(({ nom, motif }) => {
      const m = motif.exec(texte);
      return m ? [`${fichier} — ${nom} : « …${texte.slice(Math.max(0, m.index - 40), m.index + 40)}… »`] : [];
    }),
  );
}

const SOURCES = SURFACES.flatMap(fichiers)
  // Le seul lieu où le nom historique s'écrit : sa propre traduction.
  .filter((f) => !f.endsWith("src/lib/batiments/nom-zone.ts"))
  .map((fichier) => ({ fichier: fichier.replace(process.cwd() + "/", ""), texte: sansCommentaires(readFileSync(fichier, "utf8")) }));

describe("un établissement = un bâtiment : aucun texte affiché ne parle de plusieurs bâtiments (2026-10-17)", () => {
  it("aucune surface ne dit « bâtiments », « second bâtiment », « par bâtiment » ni le nom historique", () => {
    expect(fautes(SOURCES)).toEqual([]);
  });

  it("borne basse : la garde lit bien les écrans et les PDF", () => {
    expect(SOURCES.some((s) => s.fichier.includes("src/app/etablissements"))).toBe(true);
    expect(SOURCES.some((s) => s.fichier.includes("src/lib/pdf"))).toBe(true);
  });

  it("cassure : un texte qui reparle de plusieurs bâtiments est vu", () => {
    for (const t of ["Ajoutez vos bâtiments", "Déclarez un second bâtiment", "Le calendrier par bâtiment", "Bâtiment principal"]) {
      expect(fautes([{ fichier: "faux.tsx", texte: `<p>${t}</p>` }]), t).toHaveLength(1);
    }
    expect(fautes([{ fichier: "faux.tsx", texte: "<p>// vos bâtiments</p>".replace("// ", "") }])).toHaveLength(1);
  });

  it("les commentaires ne comptent pas, la citation d'arrêté non plus", () => {
    expect(fautes([{ fichier: "ok.tsx", texte: sansCommentaires("// vos bâtiments\nconst a = 1; /* par bâtiment */") }])).toEqual([]);
    expect(fautes([{ fichier: "ok.tsx", texte: "l'eau chaude des bâtiments d'habitation" }])).toEqual([]);
  });
});

describe("le nom de la première zone ne se lit jamais comme un second bâtiment", () => {
  it("« Bâtiment principal » s'affiche « Zone principale » ; tout autre nom est rendu tel quel", () => {
    expect(nomDeZone("Bâtiment principal")).toBe("Zone principale");
    expect(nomDeZone("Cuisine")).toBe("Cuisine");
    expect(nomDeZone("Zone principale")).toBe("Zone principale");
  });
});

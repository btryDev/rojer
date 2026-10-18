import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NOM_HISTORIQUE_PREMIERE_ZONE, nomDeZone } from "./nom-zone";
import { NOM_BATIMENT_PRINCIPAL } from "./schema";

// Décision de la propriétaire du 2026-10-17 (ADR-029 amendée) : un
// établissement = un bâtiment ; les zones, trois au plus, en sont des
// subdivisions ; jamais plusieurs bâtiments. Aucun texte affiché ne parle de
// plusieurs bâtiments, ni ne nomme « bâtiment » ce qui est une zone.
//
// Limites connues de la garde (la lecture est textuelle, pas un parseur) :
// - un `//` dans du texte JSX qui suit un mot (`<p>Plan A // vos bâtiments</p>`)
//   est pris pour un commentaire, et la fin de la ligne n'est pas lue ;
// - `src/lib/referentiels` n'est pas lu (voir `SURFACES`).

/**
 * Les répertoires d'où sortent les textes affichés (écrans, PDF, registre, MCP…).
 *
 * `src/lib/referentiels` n'y est PAS, et c'est voulu : le référentiel cite le
 * droit, et le droit parle de plusieurs bâtiments. L'exception connue est
 * `DESCRIPTION_GE4_RESERVES` (`referentiels/conformite/incendie.ts`, l. 122-125) :
 * elle paraphrase `GE 4 § 2` (« plusieurs bâtiments isolés les uns des
 * autres… bâtiment par bâtiment »), qui vise des corps de bâtiment isolés au
 * sens de `GN 3` — ce que Rojer déclare comme des établissements distincts.
 * La reformuler pour passer la garde trahirait le texte. Toute autre phrase
 * du référentiel qui parlerait de « vos bâtiments » échappe donc à cette
 * garde ; elle relève de la relecture du droit, pas de celle des écrans.
 */
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
  // Le singulier qui désigne une ZONE : un bâtiment parmi d'autres, qu'on
  // choisit, qu'on compte ou qu'on nomme d'une lettre. « Le bâtiment » qui est
  // l'établissement (« Équipement et bâtiment », « installés dans un
  // bâtiment ») reste permis.
  { nom: "« un bâtiment de plus »", motif: /\bbâtiments?\s+(de|en)\s+plus\b|\bbâtiments?\s+supplémentaires?\b/i },
  {
    nom: "« le bâtiment concerné » / « sélectionnez le bâtiment »",
    motif: /\bbâtiment\s+(concerné|choisi|sélectionné|suivant|voisin|filtré)(?![a-zà-ÿ])|\b(sélectionnez|choisissez|indiquez|précisez|changez)\s+(le|un|de)\s+bâtiment\b/i,
  },
  { nom: "« bâtiment B »", motif: /\b[bB]âtiment\s+[A-Z0-9]\b/ },
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

/**
 * Le texte d'un source sans ses commentaires : les décisions s'y racontent, le
 * dirigeant ne les lit pas.
 *
 * Un balayage, pas une expression : un `//` DANS une chaîne (`"Plan A // vos
 * bâtiments"`) est du texte affiché, et une expression qui le prenait pour un
 * commentaire l'effaçait. Les chaînes `'` et `"` s'arrêtent à la fin de la
 * ligne — une apostrophe de texte JSX (`<p>L'accueil</p>`) n'ouvre donc pas
 * une chaîne qui avalerait le fichier. Un `//` juste après `>` est du texte
 * JSX (`<p>// …</p>`), pas un commentaire. ~~Dans le doute, le balayage GARDE
 * le texte~~ [2026-10-18, revue : faux pour un `//` de texte JSX qui suit un
 * mot (`<p>Plan A // vos bâtiments</p>`) — le balayage ne sait pas qu'il est
 * dans du JSX, y voit un commentaire et efface la fin de la ligne. Limite
 * écrite en tête du fichier.] Il garde le texte dans les chaînes et après `>`,
 * parce qu'une fausse alerte se voit et qu'un texte effacé non.
 */
export function sansCommentaires(source: string): string {
  let out = "";
  let chaine: string | null = null;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (chaine) {
      out += c;
      if (c === "\\") {
        out += source[++i] ?? "";
      } else if (c === chaine || (c === "\n" && chaine !== "`")) {
        chaine = null;
      }
      continue;
    }
    if (c === "/" && source[i + 1] === "*") {
      const fin = source.indexOf("*/", i + 2);
      i = fin === -1 ? source.length : fin + 1;
      out += " ";
      continue;
    }
    if (c === "/" && source[i + 1] === "/" && source[i - 1] !== ">" && source[i - 1] !== ":") {
      const fin = source.indexOf("\n", i);
      i = (fin === -1 ? source.length : fin) - 1;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") chaine = c;
    out += c;
  }
  return out;
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
    expect(SOURCES.some((s) => s.fichier.startsWith("src/components/"))).toBe(true);
  });

  it("cassure : un texte qui reparle de plusieurs bâtiments est vu", () => {
    for (const t of ["Ajoutez vos bâtiments", "Déclarez un second bâtiment", "Le calendrier par bâtiment", "Bâtiment principal"]) {
      expect(fautes([{ fichier: "faux.tsx", texte: `<p>${t}</p>` }]), t).toHaveLength(1);
    }
  });

  const PIEGES = [
    "<p>Votre établissement compte un bâtiment de plus</p>",
    "<label>Sélectionnez la zone</label><p>Le bâtiment concerné n'a rien</p>",
    "<label>Sélectionnez le bâtiment</label>",
    '<h2>{"Plan A // vos bâtiments"}</h2>',
    "<p>// vos bâtiments</p>",
    "const t = `Bâtiment B`;",
    "Déclarez un second bâtiment",
    "Le calendrier par bâtiment",
    "Ajouter un bâtiment",
    "Bâtiment principal",
  ];

  it("chaque motif interdit attrape au moins un piège : aucun motif n'est une décoration", () => {
    for (const { nom, motif } of INTERDITS) {
      expect(PIEGES.some((t) => motif.test(sansCommentaires(t))), nom).toBe(true);
    }
  });

  it("cassure : les pièges de la revue du 2026-10-17 sont vus, commentaires retirés", () => {
    for (const t of [
      "<p>Votre établissement compte un bâtiment de plus</p>",
      "<label>Sélectionnez le bâtiment concerné</label>",
      "<p>Le bâtiment concerné n'a rien</p>",
      '<h2>{"Plan A // vos bâtiments"}</h2>',
      "<p>// vos bâtiments</p>",
      "const t = `Bâtiment B`;",
    ]) {
      expect(fautes([{ fichier: "faux.tsx", texte: sansCommentaires(t) }]), t).not.toEqual([]);
    }
  });

  it("les commentaires ne comptent pas, la citation d'arrêté non plus", () => {
    expect(fautes([{ fichier: "ok.tsx", texte: sansCommentaires("// vos bâtiments\nconst a = 1; /* par bâtiment */") }])).toEqual([]);
    expect(fautes([{ fichier: "ok.tsx", texte: sansCommentaires("<p>L'accueil</p>\nconst a = 1; // vos bâtiments") }])).toEqual([]);
    expect(fautes([{ fichier: "ok.tsx", texte: "<p>Équipement et bâtiment</p><p>installés dans un bâtiment</p>" }])).toEqual([]);
    expect(fautes([{ fichier: "ok.tsx", texte: "l'eau chaude des bâtiments d'habitation" }])).toEqual([]);
  });
});

describe("le nom de la première zone ne se lit jamais comme un second bâtiment", () => {
  it("« Bâtiment principal » s'affiche sous le nom que sème la création ; tout autre nom est rendu tel quel", () => {
    expect(nomDeZone("Bâtiment principal")).toBe(NOM_BATIMENT_PRINCIPAL);
    expect(NOM_BATIMENT_PRINCIPAL).toBe("Zone principale");
    expect(nomDeZone("Cuisine")).toBe("Cuisine");
    expect(nomDeZone("Zone principale")).toBe("Zone principale");
  });
});

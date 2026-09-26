// Rojer calcule, il n'avise pas. Aucune sortie ne qualifie juridiquement un
// état, un document ou un référentiel — charte, interdits 16 et 17.
//
// POURQUOI CE TEST EXISTE. Les tests anti-verdict du dépôt (`couverture`,
// `documents-obligatoires`) gardent chacun LEUR sortie. Tout le reste passait :
// le 2026-09-26, une recherche a trouvé « opposable par votre contrat — pas par
// le droit » sur trois surfaces, « opposables » dans le dossier de conformité
// et dans le guide, « fait foi » sur la fiche d'un permis de feu, « exigée par
// les assureurs » dans le ZIP remis au contrôleur. Chacun était écrit de bonne
// foi, et se lisait comme un avis que le produit n'a pas qualité à donner.
//
// CE QUE LE BALAYAGE REGARDE : tout ce qui s'affiche ou s'imprime — `src/app`,
// `src/components`, `src/lib` (PDF, ZIP, README, MCP, libellés) et le serveur
// MCP de `scripts/`. Les commentaires sont exclus : ils racontent une
// décision, le dirigeant ne les lit pas.
//
// CE QU'IL NE REGARDE PAS, et pourquoi :
// - `src/lib/referentiels/conformite/` : le référentiel est scellé ; ses notes
//   s'y corrigent avec une montée de version, pas ici. Ce qu'elles portent
//   encore est relevé au journal (C32), pour décision.
// - `src/lib/referentiels/corpus/` : les motifs et réserves de lecture sont le
//   carnet du dépouilleur, lus par un relecteur, pas par le dirigeant.
// - « conforme » : c'est aussi le nom d'une valeur de résultat de rapport
//   (`conforme`, `realisee_conforme`), donc un identifiant partout dans le code.
//   Un motif qui le chercherait accuserait chaque accès de champ. Les libellés
//   « Conforme » sont relevés au journal (C32) — ce qu'un vérificateur écrit
//   dans son rapport, affiché seul, est une décision de vocabulaire.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/** Les qualifications, en mots séparés par n'importe quel blanc — une phrase de JSX se coupe en fin de ligne. */
const QUALIFICATIONS: { nom: string; motif: RegExp }[] = [
  { nom: "opposable", motif: /\b(?:non[\s-]+)?opposab(?:les?|ilités?)\b/giu },
  { nom: "fait foi", motif: /\b(?:fait|font|faire|faisant)\s+foi\b/giu },
  {
    nom: "exigé par les assureurs",
    motif: /\bexig(?:é|ée|és|ées)\s+par\s+(?:les|vos|votre|l')\s*assureurs?\b/giu,
  },
  { nom: "en règle", motif: /\ben\s+règle\b/giu },
  { nom: "en infraction", motif: /\ben\s+infraction\b/giu },
];

/**
 * Les occurrences admises, NOMMÉMENT, avec leur motif. Une entrée qui ne
 * correspond plus à rien fait échouer le test : un aveu mort se retire.
 */
const ADMISES: { fichier: string; nom: string; motif: string }[] = [
  {
    fichier: "src/lib/mcp/tools.ts",
    nom: "opposable",
    motif:
      "La consigne donnée au modèle qui lit le serveur MCP : elle NOMME le mot pour l'interdire (« ni « conforme », ni « en infraction », ni « opposable » »).",
  },
  {
    fichier: "src/lib/mcp/tools.ts",
    nom: "en infraction",
    motif: "Même consigne, même motif.",
  },
];

const DOSSIERS = ["src/app", "src/components", "src/lib"];
const EXCLUS = ["src/lib/referentiels/conformite", "src/lib/referentiels/corpus"];
const FICHIERS_EN_PLUS = ["scripts/mcp-server.ts"];

function fichiers(racine: string): string[] {
  const out: string[] = [];
  const descendre = (d: string) => {
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      const rel = relative(racine, p);
      if (EXCLUS.some((x) => rel === x || rel.startsWith(`${x}/`))) continue;
      if (statSync(p).isDirectory()) {
        if (e !== "node_modules") descendre(p);
      } else if (/\.tsx?$/.test(p) && !/\.test\./.test(p)) out.push(p);
    }
  };
  for (const d of DOSSIERS) {
    try {
      descendre(join(racine, d));
    } catch {
      // Un dossier absent (bac d'essai) n'a rien à balayer.
    }
  }
  for (const f of FICHIERS_EN_PLUS) {
    try {
      if (statSync(join(racine, f)).isFile()) out.push(join(racine, f));
    } catch {
      // idem
    }
  }
  return out;
}

/** Le source, commentaires blanchis — les retours à la ligne gardés, pour situer. */
function sansCommentaires(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "))
    .replace(/(^|[^:\\])\/\/[^\n]*/g, (c, avant: string) => avant + " ".repeat(c.length - avant.length));
}

type Trouvee = { ou: string; nom: string; texte: string };

function qualificationsAffichees(racine: string): Trouvee[] {
  const out: Trouvee[] = [];
  for (const f of fichiers(racine)) {
    const code = sansCommentaires(readFileSync(f, "utf8"));
    const rel = relative(racine, f);
    for (const q of QUALIFICATIONS) {
      for (const m of code.matchAll(q.motif)) {
        const ligne = code.slice(0, m.index).split("\n").length;
        out.push({ ou: `${rel}:${ligne}`, nom: q.nom, texte: m[0].replace(/\s+/g, " ") });
      }
    }
  }
  return out;
}

const admise = (t: Trouvee) =>
  ADMISES.some((a) => t.ou.startsWith(`${a.fichier}:`) && a.nom === t.nom);

describe("aucune sortie ne qualifie juridiquement", () => {
  const trouvees = qualificationsAffichees(RACINE);

  it("le balayage voit les fichiers — sinon il ne prouve rien", () => {
    expect(fichiers(RACINE).length).toBeGreaterThan(200);
    expect(fichiers(RACINE).some((f) => f.endsWith("readme-controle.ts"))).toBe(true);
  });

  it("aucune qualification hors des occurrences admises", () => {
    const hors = trouvees.filter((t) => !admise(t));
    expect(
      hors.map((t) => `${t.ou} — « ${t.texte} »`),
      "Remplacer par un fait : ce que le texte dit, cité, ou ce que Rojer fait — sans conclure.",
    ).toEqual([]);
  });

  it("chaque occurrence admise existe encore — un aveu mort se retire", () => {
    for (const a of ADMISES)
      expect(
        trouvees.some((t) => t.ou.startsWith(`${a.fichier}:`) && t.nom === a.nom),
        `${a.fichier} / ${a.nom}`,
      ).toBe(true);
  });
});

describe("la garde éprouvée en la cassant", () => {
  const bac = (fichiersDuBac: Record<string, string>) => {
    const r = mkdtempSync(join(tmpdir(), "qualif-"));
    for (const [chemin, contenu] of Object.entries(fichiersDuBac)) {
      mkdirSync(dirname(join(r, chemin)), { recursive: true });
      writeFileSync(join(r, chemin), contenu);
    }
    return r;
  };

  it("voit les défauts réels du 2026-09-26, tels qu'ils étaient écrits", () => {
    // Recopiés de `abd0108`, coupure de ligne comprise : c'est ainsi qu'une
    // phrase de JSX échappe à un `grep` sur une ligne.
    const r = bac({
      "src/app/permis-feu/page.tsx": [
        "export const P = () => (",
        '  <p className="m-0">',
        "    Votre assureur l&apos;exigera probablement au titre de la règle",
        "    APSAD R43. C&apos;est un référentiel de la profession de",
        "    l&apos;assurance, opposable par votre contrat — pas par le droit.",
        "    Il fait",
        "    foi de l&apos;analyse de risque.",
        "  </p>",
        ");",
        "",
      ].join("\n"),
      "src/lib/pdf/readme.ts": [
        "export const L = [",
        '  " RÉFÉRENTIELS NON OPPOSABLES CITÉS DANS CE DOSSIER",',
        "  `Recommandation INRS ED 6030 ; règle APSAD R43 exigée par les assureurs.`,",
        "];",
        "",
      ].join("\n"),
    });
    try {
      expect(qualificationsAffichees(r).map((t) => `${t.ou} ${t.nom}`)).toEqual([
        "src/app/permis-feu/page.tsx:5 opposable",
        "src/app/permis-feu/page.tsx:6 fait foi",
        "src/lib/pdf/readme.ts:2 opposable",
        "src/lib/pdf/readme.ts:3 exigé par les assureurs",
      ]);
    } finally {
      rmSync(r, { recursive: true, force: true });
    }
  });

  it("ne voit ni un commentaire, ni un identifiant, ni une URL", () => {
    const r = bac({
      "src/lib/x.ts": [
        "// l'ancienne phrase disait « opposable par votre contrat »",
        "/* et « fait foi »",
        "   sur deux lignes */",
        "const urssafOpposableJusquA = opposabiliteUrssaf();",
        'const u = "https://exemple.fr/opposable";',
        "",
      ].join("\n"),
    });
    try {
      // L'URL porte le mot : elle est vue, et c'est voulu — une adresse
      // affichée qui dit « opposable » se lit aussi.
      expect(qualificationsAffichees(r).map((t) => t.ou)).toEqual(["src/lib/x.ts:5"]);
    } finally {
      rmSync(r, { recursive: true, force: true });
    }
  });
});

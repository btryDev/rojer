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

// Frontières UNICODE : `\b` est ASCII en JavaScript, même avec le drapeau `u`
// — il voyait une frontière au milieu de « opposabilité » (contre-lecture du
// 2026-09-26). Un mot commence et finit là où ni lettre, ni chiffre, ni `_`.
const D = String.raw`(?<![\p{L}\p{N}_])`;
const F = String.raw`(?![\p{L}\p{N}_])`;
const mot = (corps: string) => new RegExp(`${D}(?:${corps})${F}`, "giu");

/** Les qualifications, en mots séparés par n'importe quel blanc — une phrase de JSX se coupe en fin de ligne. */
const QUALIFICATIONS: { nom: string; motif: RegExp }[] = [
  // Les formes françaises, accent compris — pas `opposab\p{L}*`, qui avalait
  // les identifiants `opposabiliteUrssaf`, `opposabilite` de la vigilance.
  { nom: "opposable", motif: mot(String.raw`(?:non[\s-]+|in)?opposab(?:les?|ilités?)`) },
  // « ne fait pas foi » aussi : la négation d'une valeur probante en affirme
  // l'existence ailleurs (motif de l'aperçu du DUERP, contre-lecture du 2026-09-26).
  { nom: "fait foi", motif: mot(String.raw`(?:fait|font|faire|faisant|fera|feront|ferait)\s+(?:pas\s+|plus\s+|point\s+)?foi`) },
  {
    nom: "exigé par l'assureur",
    motif: mot(
      String.raw`exig\p{L}*\s+par\s+(?:les?|la|vos|votre|l')\s*(?:assureurs?|assurances?)` +
        String.raw`|(?:assureurs?|assurances?)\s+(?:l'|les\s+|la\s+)?exig\p{L}*` +
        String.raw`|l'exig\p{L}*\s+probablement`,
    ),
  },
  { nom: "en règle", motif: mot(String.raw`en\s+règle`) },
  { nom: "en infraction", motif: mot(String.raw`en\s+infraction`) },
  // Les familles que la contre-lecture a trouvées hors de la garde : ce que
  // le produit promettrait qu'un document fait POUR le dirigeant.
  { nom: "vous couvre / vous protège", motif: mot(String.raw`vous\s+(?:couvre|couvrent|protège|protègent)|qui\s+protège|vous\s+protéger`) },
  { nom: "responsabilité engagée", motif: mot(String.raw`responsabilité\s+(?:est\s+|serait\s+|sera\s+)?engagée`) },
  { nom: "valeur légale", motif: mot(String.raw`valeur\s+(?:légale|juridique|probante)`) },
  { nom: "premier document demandé", motif: mot(String.raw`premier\s+document\s+demandé`) },
];

/**
 * Les occurrences admises, NOMMÉMENT — fichier et texte exact, pas le mot
 * seul : une admission par fichier laissait passer toute nouvelle occurrence
 * du même mot dans le même fichier. Une entrée qui ne correspond plus à rien
 * fait échouer le test : un aveu mort se retire.
 */
const ADMISES: { fichier: string; ligne: string; motif: string }[] = [
  {
    fichier: "src/lib/mcp/tools.ts",
    // La LIGNE exacte, espaces de tête retirés : une admission par mot
    // laissait passer toute autre phrase du même fichier qui l'emploie
    // (contre-lecture du 2026-09-26). Une seule entrée pour les deux mots
    // qu'elle porte (« en infraction », « opposable »).
    // Ligne coupée le 2026-09-26 (C38) : la phrase qui promettait « les
    // articles qui fondent une obligation » était fausse, et elle est passée à
    // la ligne suivante, corrigée. L'admission ne porte plus que l'interdit.
    ligne: "- Ne qualifie jamais juridiquement un état : ni « conforme », ni « en infraction », ni « opposable ».",
    motif:
      "La consigne donnée au modèle qui lit le serveur MCP : elle NOMME les mots pour les interdire.",
  },
];

/**
 * Le source tel qu'il s'affiche, à la ligne près : les entités de JSX et les
 * espaces explicites ramenées à ce qu'elles rendent, l'apostrophe typographique
 * à la droite. « l&apos;exigera », « en&nbsp;règle », « en{" "} » suivi de
 * « règle » à la ligne : tous passaient.
 */
const commeAffiche = (code: string) =>
  code
    .replace(/&apos;|&#39;|[’‘]/g, "'")
    .replace(/&nbsp;|&#160;| | /g, " ")
    .replace(/\{\s*["'`] ["'`]\s*\}/g, " ");

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

type Trouvee = { ou: string; nom: string; texte: string; ligne: string };

function qualificationsAffichees(racine: string): Trouvee[] {
  const out: Trouvee[] = [];
  for (const f of fichiers(racine)) {
    const code = commeAffiche(sansCommentaires(readFileSync(f, "utf8")));
    const rel = relative(racine, f);
    for (const q of QUALIFICATIONS) {
      for (const m of code.matchAll(q.motif)) {
        const ligne = code.slice(0, m.index).split("\n").length;
        out.push({
          ou: `${rel}:${ligne}`,
          nom: q.nom,
          texte: m[0].replace(/\s+/g, " "),
          ligne: code.split("\n")[ligne - 1].trim(),
        });
      }
    }
  }
  // Rangées par fichier puis par ligne : l'ordre des motifs n'est pas celui du texte.
  const cle = (t: Trouvee) => {
    const i = t.ou.lastIndexOf(":");
    return [t.ou.slice(0, i), Number(t.ou.slice(i + 1))] as const;
  };
  return out.sort((a, b) => {
    const [fa, la] = cle(a);
    const [fb, lb] = cle(b);
    return fa === fb ? la - lb : fa.localeCompare(fb);
  });
}

const admise = (t: Trouvee) =>
  ADMISES.some((a) => t.ou.startsWith(`${a.fichier}:`) && a.ligne === t.ligne);

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
        trouvees.some((t) => t.ou.startsWith(`${a.fichier}:`) && t.ligne === a.ligne),
        `${a.fichier} / ${a.ligne.slice(0, 60)}`,
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
        "src/app/permis-feu/page.tsx:3 exigé par l'assureur",
        "src/app/permis-feu/page.tsx:5 opposable",
        "src/app/permis-feu/page.tsx:6 fait foi",
        "src/lib/pdf/readme.ts:2 opposable",
        "src/lib/pdf/readme.ts:3 exigé par l'assureur",
      ]);
    } finally {
      rmSync(r, { recursive: true, force: true });
    }
  });

  it("voit ce que la sonde de la contre-lecture faisait passer", () => {
    // Chaque forme, une par ligne, telle qu'un écran l'écrirait.
    const formes = [
      "C&apos;est inopposable.",
      "Son opposabilité tient au contrat.",
      "Ce document fera foi.",
      "Une règle exigée par l&apos;assureur.",
      "Une règle exigée par l’assureur.",
      "Une mesure exigée par votre assurance.",
      "Votre assureur l&apos;exigera probablement.",
      "Tout est en&nbsp;règle.",
      "Tout est en{\" \"}",
      "règle.",
    ];
    const r = bac({ "src/app/sonde.tsx": `export const S = () => (\n<p>\n${formes.join("\n")}\n</p>\n);\n` });
    try {
      expect(qualificationsAffichees(r).map((t) => t.ou)).toEqual(
        [3, 4, 5, 6, 7, 8, 9, 10, 11].map((l) => `src/app/sonde.tsx:${l}`),
      );
    } finally {
      rmSync(r, { recursive: true, force: true });
    }
  });

  it("voit les six phrases que la contre-lecture a trouvées hors de la garde, telles qu'elles étaient écrites", () => {
    // Recopiées de `2fbd230`, où la garde précédente les laissait passer.
    const r = bac({
      "src/lib/pdf/DuerpDocument.tsx": "          Aucune valeur légale avant validation d&apos;une version\n",
      "src/app/plan-prevention/page.tsx":
        'enjeu="Une entreprise qui intervient chez vous fait intervenir son personnel dans votre environnement : si un accident survient faute d\'analyse conjointe, votre responsabilité est engagée."\n',
      "src/app/equipe/page.tsx": [
        "                  habilitée au moment où elle a travaillé — c&apos;est cette",
        "                  preuve qui vous couvre sur la période passée.",
        "",
      ].join("\n"),
      "src/lib/salaries/droits.ts": [
        "période où vous avez travaillé. C'est cette preuve qui protège aussi bien",
        "l'entreprise que vous-même.",
        "",
      ].join("\n"),
      "src/app/duerp/page.tsx":
        'enjeu="Obligatoire dès le premier salarié. En cas de contrôle ou d\'accident, c\'est le premier document demandé."\n',
    });
    try {
      expect(qualificationsAffichees(r).map((t) => `${t.ou} ${t.nom}`)).toEqual([
        "src/app/duerp/page.tsx:1 premier document demandé",
        "src/app/equipe/page.tsx:2 vous couvre / vous protège",
        "src/app/plan-prevention/page.tsx:1 responsabilité engagée",
        "src/lib/pdf/DuerpDocument.tsx:1 valeur légale",
        "src/lib/salaries/droits.ts:1 vous couvre / vous protège",
      ]);
    } finally {
      rmSync(r, { recursive: true, force: true });
    }
  });

  it("une admission vaut pour sa LIGNE exacte, pas pour le mot ni le fichier", () => {
    // La sonde de la contre-lecture du 2026-09-26 : une phrase qualifiante
    // ajoutée dans le fichier admis, qui passait tant que l'admission portait
    // sur le mot.
    const r = bac({
      "src/lib/mcp/tools.ts": [
        `const C = \`${ADMISES[0].ligne}\`;`,
        "const D = `Ce registre est opposable à l'inspection.`;",
        "",
      ].join("\n"),
    });
    try {
      const vues = qualificationsAffichees(r);
      // La ligne admise est retrouvée telle quelle, préfixe de code compris :
      // on compare donc la ligne affichée, et la vraie ligne de `tools.ts` est
      // un texte de gabarit, sans préfixe.
      expect(vues.filter((t) => !admise(t)).map((t) => `${t.ou} ${t.nom}`)).toContain(
        "src/lib/mcp/tools.ts:2 opposable",
      );
    } finally {
      rmSync(r, { recursive: true, force: true });
    }
  });

  it("voit « ne fait pas foi », tel que le motif de l'aperçu du DUERP l'écrivait", () => {
    const r = bac({
      "src/app/duerp/preview/route.ts": '    motif: "APERÇU — brouillon non validé, ne fait pas foi",\n',
    });
    try {
      expect(qualificationsAffichees(r).map((t) => `${t.ou} ${t.texte}`)).toEqual([
        "src/app/duerp/preview/route.ts:1 fait pas foi",
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

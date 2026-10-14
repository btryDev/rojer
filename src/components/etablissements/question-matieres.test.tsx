import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import {
  AIDE_MATIERES,
  LIEN_TABLEAU_CLP,
  QUESTION_MATIERES,
  RENVOI_AIDE_MATIERES,
} from "@/lib/etablissements/questions";
import { RELANCES } from "@/lib/etablissements/relance";
import { PHRASE_SANS_REPONSE } from "@/lib/matching/sans-reponse";
import { EtablissementForm } from "./EtablissementForm";
import { StepTypologie } from "@/components/onboarding/StepTypologie";
import { VALEURS_INITIALES } from "@/components/onboarding/types";
import { OnboardingChecklist } from "@/components/layout/OnboardingChecklist";

/**
 * La question posée au dirigeant doit décrire l'article que le moteur teste.
 *
 * LE DÉFAUT QUE CES TESTS FIXAIENT D'ABORD. L'attribut `manipuleMatieresR422722`
 * porte dans son nom le numéro de `R. 4227-22`, et l'aide du formulaire citait
 * ce numéro-là. Les trois classes de produits qu'elle énumère sont bien celles
 * de cet article, mot pour mot ; sa CONDITION ne l'est pas. `R. 4227-22` vise
 * les locaux où ces matières sont « entreposées OU manipulées » — le simple
 * entreposage suffit à le déclencher. « Manipulées ET mises en œuvre » est la
 * phrase de `R. 4227-34`, et c'est ce champ-là, et lui seul, que le moteur
 * évalue (`champR422734`, critère 3 bis de `matching/engine.ts`).
 *
 * ~~Garde : l'aide ne cite pas `R. 4227-22`.~~ [2026-10-13,
 * `lot/question-matieres` : la décision de la propriétaire fait citer
 * `R. 4227-22` dans l'aide, pour ce qu'il fait — NOMMER les classes de
 * produits. La garde devient plus fine : là où l'aide cite `R. 4227-22`, elle
 * nomme les classes et jamais la condition ; la condition « manipulées et mises
 * en œuvre » est attachée à `R. 4227-34`.]
 *
 * CE QUI S'AJOUTE LE 2026-10-13. La question est reformulée pour se répondre
 * étiquette en main, et ses mots n'existent qu'à un endroit
 * (`etablissements/questions.ts`). Les surfaces qui l'affichent — la fiche, le
 * parcours de création, la relance de la checklist, la phrase « à confirmer »
 * (écrans, guide « Comprendre », MCP) — sont RENDUES ou lues ici et confrontées
 * à ce texte unique ; puis tout `src` est balayé pour qu'aucune copie ne
 * survive ailleurs.
 *
 * CE QUI N'EST PAS TESTÉ ICI, PARCE QUE CE N'EST PAS TRANCHÉ : le champ du
 * moteur (manipulation contre entreposage, `chantiers-ouverts.md` § 1).
 */

const SRC = (f: string) => readFileSync(join(process.cwd(), f), "utf8");

/**
 * Le fichier privé de ses commentaires — c'est ce qui reste qui s'affiche.
 * Sans cette coupe, le commentaire qui EXPLIQUE la correction ferait passer
 * les tests pour la correction elle-même.
 *
 * ~~Deux expressions régulières (`/\*…*\/`, puis `//` en début de ligne).~~
 * [2026-10-13, revue de `e6ba53d9` : elles coupaient À L'INTÉRIEUR d'une
 * chaîne contenant « /* » — un motif de glob, une URL —, et tout le code
 * jusqu'au prochain « *\/ » disparaissait du balayage, recopie comprise.
 * Le retrait passe désormais par l'arbre syntaxique de TypeScript : le
 * compilateur sait ce qui est chaîne, JSX ou commentaire.]
 */
const IMPRIMEUR = ts.createPrinter({ removeComments: true });
const sansCommentaires = (source: string, nom = "f.tsx") =>
  IMPRIMEUR.printFile(
    ts.createSourceFile(
      nom,
      source,
      ts.ScriptTarget.Latest,
      true,
      nom.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    ),
  );

/** Le texte visible d'un rendu HTML : balises ôtées, entités rendues, blancs réduits. */
function texte(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");
}

const reduire = (s: string) => s.replace(/\s+/g, " ");

const AIDE = AIDE_MATIERES.join(" ");
const RELANCE = RELANCES.matieres_r4227_22;

/** Un fragment propre à chaque paragraphe de l'aide, et au renvoi de la relance. */
const FRAGMENTS_DE_L_AIDE = [
  "dans un losange bordé de rouge",
  // ~~"dont l'état physique peut provoquer"~~, ~~"les signes ci-dessus aident
  // à les repérer"~~ [2026-10-13 : paragraphes 2 et 4 réécrits, décision de la
  // propriétaire sur les matières inflammables].
  "dans l'état où elles se trouvent",
  "à vérifier sur l'étiquette ou la fiche de données de sécurité",
  "que Rojer ne suit pas et qu'il signale",
  "ce seuil suffit à les rendre dues",
  "détaillés sous la question, sur la fiche",
];

// ── Les surfaces, rendues ─────────────────────────────────────────────

const HTML_FICHE = renderToStaticMarkup(
  <EtablissementForm
    action={async (s) => s}
    libelleSubmit="Enregistrer"
    entreprise={{ id: "ent", effectif: 3 }}
  />,
);
const HTML_PARCOURS = renderToStaticMarkup(
  <StepTypologie state={VALEURS_INITIALES} update={() => {}} />,
);
// L'étape telle que la fiche de l'établissement la construit depuis la
// relance (`app/etablissements/[id]/page.tsx`) ; le passage du lien y est
// vérifié dans le source, plus bas.
const HTML_CHECKLIST = renderToStaticMarkup(
  <OnboardingChecklist
    etablissementRaison="Le Bistrot"
    etapes={[
      {
        id: "relance-matieres_r4227_22",
        titre: RELANCE.titre,
        pourquoi: RELANCE.pourquoi,
        lien: RELANCE.lien,
        faite: false,
      },
    ]}
  />,
);

const SURFACES_RENDUES: [string, string][] = [
  ["fiche (EtablissementForm)", HTML_FICHE],
  ["parcours de création (StepTypologie)", HTML_PARCOURS],
  ["relance de la checklist (OnboardingChecklist)", HTML_CHECKLIST],
];
/**
 * Les surfaces qui portent l'aide ENTIÈRE. ~~La checklist aussi.~~
 * [2026-10-13, revue de `e6ba53d9` : la relance ne garde que le premier
 * paragraphe et renvoie à la fiche — testé à part, ci-dessous.]
 */
const SURFACES_AIDE_ENTIERE = SURFACES_RENDUES.slice(0, 2);

describe("la question des matières : un seul texte, identique partout", () => {
  it.each(SURFACES_RENDUES)("%s affiche le libellé", (_, html) => {
    expect(texte(html)).toContain(QUESTION_MATIERES);
  });

  it.each(SURFACES_AIDE_ENTIERE)("%s affiche l'aide entière, paragraphe par paragraphe", (_, html) => {
    const t = texte(html);
    for (const p of AIDE_MATIERES) expect(t, p.slice(0, 50)).toContain(p);
  });

  it("la relance affiche le premier paragraphe de l'aide, puis le renvoi à la fiche — et pas le reste", () => {
    const t = texte(HTML_CHECKLIST);
    expect(t).toContain(AIDE_MATIERES[0]);
    expect(t).toContain(RENVOI_AIDE_MATIERES);
    for (const p of AIDE_MATIERES.slice(1)) expect(t, p.slice(0, 50)).not.toContain(p);
  });

  it("la relance, seule à l'écran, n'exclut pas un produit H250", () => {
    // Revue de `8ffc560a` : la relance n'affiche que le § 1. Il finissait par
    // « Une flamme seule, sans cette mention, ne suffit pas. » et ne nommait
    // pas H250 — flamme seule, mention « S'enflamme spontanément au contact
    // de l'air » —, que le § 2 fait pourtant entrer : son détenteur lisait
    // « non ». Le texte affiché doit nommer H250 parmi les mentions qui
    // suffisent, et ne plus exclure toute flamme sans « extrêmement
    // inflammable ».
    const t = texte(HTML_CHECKLIST);
    expect(t).toContain("« S'enflamme spontanément au contact de l'air » (H250)");
    expect(t).toContain("Une flamme seule, sans l'une de ces mentions, ne suffit pas.");
    expect(t).not.toContain("sans cette mention, ne suffit pas");
  });

  it.each(SURFACES_RENDUES)("%s affiche le lien vers le tableau CLP de l'INERIS", (_, html) => {
    expect(html).toContain(`href="${LIEN_TABLEAU_CLP.url}"`);
    expect(texte(html)).toContain(LIEN_TABLEAU_CLP.libelle);
  });

  it("la fiche relie l'aide au champ (aria-describedby)", () => {
    expect(HTML_FICHE).toContain('aria-describedby="manipuleMatieresR422722-aide"');
    expect(HTML_FICHE).toMatch(/<div id="manipuleMatieresR422722-aide"/);
  });

  it("la relance : son titre EST la question, sa raison EST le premier paragraphe et le renvoi, son lien EST celui de l'aide", () => {
    expect(RELANCE.titre).toBe(QUESTION_MATIERES);
    // ~~`toBe(AIDE)`~~ [2026-10-13, revue : forme courte].
    expect(RELANCE.pourquoi).toBe(`${AIDE_MATIERES[0]} ${RENVOI_AIDE_MATIERES}`);
    expect(RELANCE.lien).toEqual(LIEN_TABLEAU_CLP);
  });

  it("la fiche de l'établissement transmet le lien de la relance à la checklist", () => {
    // La checklist ne rend le lien que si la page le lui passe.
    expect(sansCommentaires(SRC("src/app/etablissements/[id]/page.tsx"))).toContain(
      "lien: relance.lien",
    );
  });

  it("la phrase « à confirmer » (écrans, guide, MCP) cite la question mot pour mot", () => {
    expect(PHRASE_SANS_REPONSE.matieres_r4227_22).toContain(`« ${QUESTION_MATIERES} »`);
  });

  it("aucune copie du texte hors de sa définition", () => {
    // Des fragments du libellé et de l'aide, plus l'ancien libellé : présents
    // dans le code affiché (commentaires ôtés) d'un autre fichier que
    // `questions.ts`, ils signalent une recopie.
    const FRAGMENTS = [
      "bombe qui explose",
      "flamme sur un cercle",
      "flamme au-dessus d'un cercle",
      "pas seulement stocke-t-on",
      "clp-info.ineris.fr",
      ...FRAGMENTS_DE_L_AIDE,
      // Les anciens libellés.
      "pas seulement stockent",
      "Manipulez-vous",
      "manipulez des matières",
      "Matières classées explosives",
    ];
    const DEFINITION = "src/lib/etablissements/questions.ts";
    const fichiers: string[] = [];
    const parcourir = (dir: string) => {
      for (const nom of readdirSync(dir)) {
        const chemin = join(dir, nom);
        if (statSync(chemin).isDirectory()) parcourir(chemin);
        else if (/\.(ts|tsx)$/.test(nom) && !/\.test\.tsx?$/.test(nom)) fichiers.push(chemin);
      }
    };
    parcourir(join(process.cwd(), "src"));
    // Borne basse : le balayage voit bien la définition.
    expect(fichiers.map((f) => relative(process.cwd(), f))).toContain(DEFINITION);
    const copies: string[] = [];
    for (const f of fichiers) {
      const rel = relative(process.cwd(), f);
      if (rel === DEFINITION) continue;
      const brut = readFileSync(f, "utf8");
      // L'impression de l'arbre coûte : seuls les fichiers dont le texte brut
      // contient un fragment y passent. Retirer des commentaires ne fait
      // qu'ôter du texte, donc ce tri ne laisse rien échapper.
      if (!FRAGMENTS.some((frag) => brut.includes(frag))) continue;
      const code = sansCommentaires(brut, f);
      for (const frag of FRAGMENTS) if (code.includes(frag)) copies.push(`${rel} : « ${frag} »`);
    }
    expect(copies).toEqual([]);
  });

  it("chaque paragraphe de l'aide a son fragment dans le balayage", () => {
    // Sans quoi un paragraphe recopié ailleurs passerait inaperçu (revue de
    // `e6ba53d9`, mutant M4 : le cinquième recopié dans `guide/chez-vous.ts`).
    for (const p of AIDE_MATIERES) {
      expect(FRAGMENTS_DE_L_AIDE.some((frag) => p.includes(frag)), p.slice(0, 50)).toBe(true);
    }
  });

  it("le retrait des commentaires ne mange pas une chaîne qui contient « /* »", () => {
    // La garde du balayage lui-même : l'ancien retrait par expression
    // régulière rendait ici `const a = "x` puis rien.
    const source = 'const a = "src/*.ts";\nconst b = "copie";\n/* vrai commentaire */\n';
    const code = sansCommentaires(source, "f.ts");
    expect(code).toContain('"copie"');
    expect(code).not.toContain("vrai commentaire");
  });
});

describe("l'aide : exemples, références, lien", () => {
  // ~~« oxygène »~~ [2026-10-13, décision de la propriétaire : un comburant
  // n'est pas une matière inflammable, R. 4227-34 ne le vise pas].
  it.each([
    "propane",
    "butane",
    "acétylène",
    "aérosols",
    "solvants",
  ])("l'exemple « %s » y est", (exemple) => {
    expect(AIDE).toContain(exemple);
  });

  // ~~"H270", "H200"~~ [2026-10-13, même décision : comburants et explosifs
  // sortent de l'aide].
  it.each(["H220", "H222", "H224", "H250"])("le code %s y est", (code) => {
    expect(AIDE).toContain(code);
  });

  it("H250 est cité avec sa mention exacte (INERIS, p. 2)", () => {
    expect(AIDE).toContain("« S'enflamme spontanément au contact de l'air » (H250)");
  });

  it("une flamme seule ne suffit pas, et l'aide le dit", () => {
    // ~~"Une flamme seule, sans cette mention, ne suffit pas."~~ [2026-10-13,
    // revue de `8ffc560a` : la phrase excluait H250, que le § 2 fait entrer].
    expect(AIDE).toContain("Une flamme seule, sans l'une de ces mentions, ne suffit pas.");
  });

  // ~~« les pictogrammes sont décrits en mots » (flamme sur un cercle, bombe
  // qui explose)~~ [2026-10-13, décision de la propriétaire : « on respecte la
  // loi » — R. 4227-34 ne vise que les matières INFLAMMABLES de R. 4227-22].
  it("l'aide dit « s'enflammer instantanément », comme R. 4227-22 et le libellé, pas « prendre feu » (R. 4227-24)", () => {
    expect(AIDE).toContain("peuvent s'enflammer instantanément");
    expect(AIDE).not.toMatch(/prendre feu/);
  });

  it("le libellé vise la mention « extrêmement inflammable » et l'inflammation instantanée", () => {
    expect(QUESTION_MATIERES).toContain("une flamme et la mention « extrêmement inflammable »");
    expect(QUESTION_MATIERES).toContain("peuvent s'enflammer instantanément");
  });

  it("ni comburant, ni oxygène, ni explosif, ni la bombe ne sont un critère du libellé", () => {
    expect(QUESTION_MATIERES).not.toMatch(/comburant|oxygène|explosi|bombe|cercle/i);
  });

  it("l'aide ne les donne pas comme critère : ni pictogramme, ni code, ni exemple", () => {
    expect(AIDE).not.toMatch(/oxygène|bombe|cercle|H20\d|H27\d/i);
    // Comburants et explosifs ne sont nommés que dans le paragraphe des
    // articles, celui qui dit qu'ils n'entrent pas dans la question.
    const nomment = AIDE_MATIERES.filter((p) => /comburant|explosi/i.test(p));
    expect(nomment).toHaveLength(1);
    expect(nomment[0]).toContain("Les explosifs et les comburants n'entrent donc pas dans cette question");
  });

  it("la question garde « utilisés, pas seulement stockés »", () => {
    // ~~`/utilisent-ils \(pas seulement stockent-ils\)/`~~ [2026-10-13, revue].
    expect(QUESTION_MATIERES).toMatch(/utilise-t-on \(pas seulement stocke-t-on\)/);
  });

  it("la question porte sur l'établissement, pas sur l'auteur du geste", () => {
    // R. 4227-34 vise l'établissement « où sont manipulées et mises en œuvre »
    // les matières, quel que soit qui les manipule (revue de `e6ba53d9`).
    expect(QUESTION_MATIERES).toMatch(/^Dans l'établissement, /);
    expect(QUESTION_MATIERES).not.toMatch(/salarié|travailleur|personnel/i);
  });

  it("l'aide cite R. 4227-22 et R. 4227-34", () => {
    expect(AIDE).toContain("R. 4227-22");
    expect(AIDE).toContain("R. 4227-34");
  });

  it("le lien pointe le tableau CLP de l'INERIS", () => {
    expect(LIEN_TABLEAU_CLP.url).toBe(
      "https://clp-info.ineris.fr/sites/snar-clp/files/guide_brochure/2025_Tableau_Classification_Etiquetage_CLP_VF.pdf",
    );
    expect(LIEN_TABLEAU_CLP.libelle).toMatch(/INERIS/);
  });

  it("l'aide dit ce que « oui » ajoute, ce que « non » retire, et ce que vaut le silence", () => {
    expect(AIDE).toMatch(/Si oui, l'alarme sonore, la consigne incendie et les exercices semestriels sont dus/);
    expect(AIDE).toMatch(/Si non, ces lignes sont retirées, sauf là où plus de cinquante personnes/);
    expect(AIDE).toMatch(/Tant que la question n'a pas de réponse, elles s'affichent « à confirmer »/);
  });
});

describe("la question nomme l'article qu'elle sert", () => {
  /**
   * Les propositions de l'aide. La coupe se fait sur « ; » et sur un point
   * suivi d'une majuscule, sauf après « art » ou « R » — sans quoi
   * « l'art. R. 4227-22 » se couperait en trois.
   */
  const propositions = AIDE_MATIERES.flatMap((p) =>
    p.split(/(?<!\bart|\bR)\.\s+(?=[A-ZÀ-Ý«])|\s;\s/),
  );

  it("le moteur teste bien le champ de R. 4227-34, et le dit", () => {
    // La borne basse : si le moteur cessait de nommer cet article, les tests
    // suivants compareraient l'écran à rien. Ici on lit les commentaires, et
    // c'est voulu : `types-communs.ts` ne s'affiche à personne, sa
    // documentation EST son énoncé.
    expect(
      SRC("src/lib/referentiels/types-communs.ts"),
      "`champR422734` ne documente plus l'article dont il porte le champ.",
    ).toContain("R. 4227-34");
  });

  it("la condition « manipulées et mises en œuvre » est attachée à R. 4227-34", () => {
    const avecCondition = propositions.filter((p) => p.includes("manipulées et mises en œuvre"));
    expect(avecCondition.length).toBeGreaterThan(0);
    for (const p of avecCondition) expect(p).toContain("R. 4227-34");
  });

  it("là où elle cite R. 4227-22, l'aide ne lui prête jamais la condition de R. 4227-34", () => {
    // C'est la garde d'origine, affinée : citer R. 4227-22 SUR LA CONDITION
    // faisait répondre « non » à un établissement qui ne fait qu'entreposer.
    // ~~Chaque citation devait nommer les classes~~ [2026-10-13 : l'aide cite
    // aussi « R. 4227-22 à R. 4227-25 » pour ce que Rojer ne suit pas ; la
    // garde porte sur la condition, et les classes sont exigées ci-dessous].
    const avec22 = propositions.filter((p) => p.includes("R. 4227-22"));
    expect(avec22.length).toBeGreaterThan(0);
    for (const p of avec22) expect(p).not.toContain("manipulées et mises en œuvre");
  });

  it("R. 4227-22 nomme aussi les explosifs et les comburants, et l'aide le dit", () => {
    expect(propositions).toContain(
      "L'art. R. 4227-22 du Code du travail nomme les matières explosives, comburantes ou extrêmement inflammables",
    );
  });

  it("R. 4227-34 ne vise que les matières inflammables, et l'aide le dit", () => {
    const p34 = propositions.filter((p) => p.includes("R. 4227-34") && p.includes("manipulées et mises en œuvre"));
    expect(p34).toHaveLength(1);
    expect(p34[0]).toMatch(/ne vise, parmi elles, que les matières inflammables/);
  });

  it("le reste relève de R. 4227-22 à R. 4227-25, que Rojer ne suit pas et signale", () => {
    expect(AIDE).toContain(
      "Ces cas relèvent des art. R. 4227-22 à R. 4227-25, que Rojer ne suit pas et qu'il signale sur la page « Ce que Rojer ne couvre pas ».",
    );
  });

  it("elle dit au dirigeant ce que la question ne couvre pas", () => {
    // Le sens de l'erreur est celui-là : la question reste étroite, et c'est
    // la phrase qui rend l'omission visible à celui qui la subit.
    expect(AIDE, "Rien ne dit au dirigeant que l'entreposage seul sort de la question.").toMatch(
      /entreposer sans les mettre en œuvre/,
    );
  });
});

describe("aucune phrase ne qualifie la situation du dirigeant", () => {
  const INTERDITES = [
    /conforme/i,
    /conformité/i,
    /vous devez/i,
    /vous êtes/i,
    /en règle/i,
  ];
  const TEXTES: [string, string][] = [
    ["libellé", QUESTION_MATIERES],
    ["aide", AIDE],
    ["lien", `${LIEN_TABLEAU_CLP.intro} ${LIEN_TABLEAU_CLP.libelle}`],
    ["titre de la relance", RELANCE.titre],
    ["raison de la relance", RELANCE.pourquoi],
    ["phrase « à confirmer »", PHRASE_SANS_REPONSE.matieres_r4227_22],
  ];

  it.each(TEXTES)("%s : aucune tournure interdite", (_, t) => {
    for (const re of INTERDITES) expect(reduire(t), String(re)).not.toMatch(re);
  });
});

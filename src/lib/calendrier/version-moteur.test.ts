import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { posix } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import {
  OBLIGATIONS_RETIREES,
  REFERENTIEL_VERSION,
  empreinteReferentiel,
} from "@/lib/referentiels/conformite";
import {
  SCEAU_CALENDRIER,
  VERSION_MOTEUR_CALENDRIER,
  sceauCalendrier,
} from "./version-moteur";

/**
 * Le rappel d'incrémenter `VERSION_MOTEUR_CALENDRIER` — posé le 2026-09-15
 * (`lot/fusibles-referentiel`).
 *
 * CE QU'IL VAUT, dit honnêtement : UN RAPPEL, pas une garantie. Il tombe dès que
 * le code du moteur change et pose la question — ce changement modifie-t-il ce
 * que la régénération écrit ? —, mais recopier le relevé sans incrémenter
 * laisse tout vert. Il ne sait pas juger ; il empêche seulement d'oublier de
 * se poser la question, ce que `REFERENTIEL_VERSION` avait fait le 2026-09-10.
 *
 * CE QUI EST RELEVÉ : la passe de régénération (`calendrier/actions.ts`) et
 * tout ce qu'elle importe à l'exécution dans `src/`, de proche en proche. La
 * liste se calcule, et un fichier y entre PAR DÉFAUT : un module que le moteur
 * se met à importer, ou qu'on extrait d'un module déjà relevé, est relevé sans
 * qu'on y pense. Chaque module est relevé TRANSPILÉ — types et commentaires
 * retirés —, si bien qu'un commentaire daté ou une annotation de type ne font
 * rien tomber.
 *
 * Une exception de forme : de `referentiels/conformite/index.ts`, qui mêle
 * code, données et `REFERENTIEL_VERSION`, on ne relève que les FONCTIONS — une
 * déclaration `function`, ou une constante qui vaut une fonction fléchée ou une
 * expression de fonction — que le moteur importe, et celles qu'elles appellent
 * dans le même fichier. Pas `REFERENTIEL_VERSION`, qui ferait tomber le test à
 * chaque version ; pas `obligationsParDomaine` ni `empreinteReferentiel`, que
 * le moteur n'importe pas (une empreinte qui calcule autrement change le sceau
 * d'elle-même). Ses imports, eux, sont suivis. TROU CONNU : une déclaration
 * d'`index.ts` qui n'est pas une fonction mais que ces fonctions lisent — le
 * cache `let _index` d'`obligationParId` — n'est pas relevée. S'y ajoute une DONNÉE que le
 * moteur lit et que l'empreinte ne hache pas : la table retiré → absorbant de
 * `OBLIGATIONS_RETIREES`, retraits sans absorbant exclus — le moteur les ignore.
 *
 * CE QUI NE L'EST PAS, et pourquoi — vérifié en lisant `empreinteReferentiel` :
 *  · les fichiers de DONNÉES du référentiel, nommés un par un dans
 *    `DONNEES_REFERENTIEL` : les domaines et `veille-textes.ts`. L'empreinte
 *    hache, par obligation, l'identifiant, la périodicité, `premierDelai`, le
 *    libellé, les réalisateurs, les typologies, les conditions, les catégories,
 *    le porteur, le contexte d'équipement et `succedeA` — sur la liste
 *    `obligationsConformite` telle qu'`index.ts` la compose, si bien que la
 *    composition elle-même est scellée. `veille-textes.ts` ne produit rien au
 *    calendrier. Un test fait tomber la liste si l'un de ses fichiers disparaît ;
 *  · `calendrier/version-moteur.ts`, qui porte la constante elle-même ;
 *  · l'accès aux données (`lib/prisma`) et la garde de session (`lib/auth/`),
 *    qui ne décident d'aucune ligne ; les imports de type seul ; les paquets.
 *
 * RELEVÉS SANS ÉCRIRE, et laissés : `rapports/schema.ts` et
 * `prescriptions/sources.ts` sont relevés en entier alors que le moteur n'en
 * lit qu'une part — `statutDepuisResultat` et `RESULTATS_REALISES`, qui
 * décident d'un statut écrit ; `estSourceContractuelle`, qui ne marque que des
 * raisons. Les écarter demanderait de relever par nom dans ces fichiers aussi,
 * ou une liste d'exclusion qu'un usage futur en écriture rendrait fausse sans
 * bruit. Le prix : ils peuvent faire tomber le test pour une retouche
 * d'affichage — réponse NON.
 *
 * Une montée de TypeScript, ou du lockfile qui le fixe, peut changer la sortie
 * du transpileur, donc le relevé, sans qu'aucune règle ait bougé : recopier le
 * relevé suffit.
 */

/** La racine du dépôt, depuis ce fichier — jamais le répertoire courant. */
const RACINE = fileURLToPath(new URL("../../..", import.meta.url));
const ENTREE = "src/lib/calendrier/actions.ts";
const INDEX_REFERENTIEL = "src/lib/referentiels/conformite/index.ts";

/**
 * Les fichiers de données du référentiel, que l'empreinte scelle. Une liste
 * EXPLICITE, et non « tout le dossier sauf… » : un fichier neuf sous
 * `conformite/` — du code extrait d'`index.ts`, par exemple — entre dans le
 * relevé par défaut au lieu d'en sortir en silence.
 */
const DONNEES_REFERENTIEL = [
  "aeration",
  "ascenseurs",
  "co-activite",
  "compactage-dechets",
  "cuisson-hotte",
  "eclairage",
  "electricite",
  "epi",
  "equipement-sous-pression",
  "formation-securite",
  "froid",
  "incendie",
  "information-travailleurs",
  "levage",
  "locaux-sociaux",
  "organisation-prevention",
  "portes-portails",
  "sante-travail",
  "secours",
  "signalisation",
  "stockage-dangereux",
  "veille-textes",
].map((nom) => `src/lib/referentiels/conformite/${nom}.ts`);

/** Chemins posix relatifs à la racine, séparateurs normalisés. */
function estHorsReleve(chemin: string): boolean {
  if (chemin === "src/lib/calendrier/version-moteur.ts") return true;
  if (DONNEES_REFERENTIEL.includes(chemin)) return true;
  return chemin === "src/lib/prisma.ts" || chemin.startsWith("src/lib/auth/");
}

/**
 * Le dernier relevé, et la version du moteur qu'il a servie. Un seul couple,
 * pas d'historique : `version-moteur.ts` dit ce que coûte un incrément, et le
 * message du test dit quand en faire un.
 */
const RELEVE = {
  version: 0,
  empreinte: "36766d2e7b27f5ea",
};

const versPosix = (p: string) => p.split("\\").join("/");
const surDisque = (chemin: string) => posix.join(versPosix(RACINE), chemin);

function resoudre(depuis: string, specifieur: string): string | null {
  let base: string;
  if (specifieur.startsWith("@/")) {
    base = posix.join("src", specifieur.slice(2));
  } else if (specifieur.startsWith(".")) {
    base = posix.join(posix.dirname(depuis), specifieur);
  } else {
    return null; // un paquet
  }
  for (const candidat of [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`]) {
    if (existsSync(surDisque(candidat))) return candidat;
  }
  return null;
}

function lire(chemin: string): ts.SourceFile {
  return ts.createSourceFile(
    chemin,
    readFileSync(surDisque(chemin), "utf8"),
    ts.ScriptTarget.Latest,
    false,
    chemin.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}

/** Les fonctions nommées d'un fichier : `function`, ou constante fonction. */
function fonctionsDe(source: ts.SourceFile): Map<string, string> {
  const fonctions = new Map<string, string>();
  for (const instruction of source.statements) {
    if (ts.isFunctionDeclaration(instruction) && instruction.name) {
      fonctions.set(instruction.name.text, instruction.getText(source));
    } else if (ts.isVariableStatement(instruction)) {
      for (const d of instruction.declarationList.declarations) {
        if (
          ts.isIdentifier(d.name) &&
          d.initializer !== undefined &&
          (ts.isArrowFunction(d.initializer) ||
            ts.isFunctionExpression(d.initializer))
        ) {
          fonctions.set(d.name.text, instruction.getText(source));
        }
      }
    }
  }
  return fonctions;
}

/**
 * Les fonctions d'`index.ts` que le moteur importe, et celles qu'elles
 * appellent dans le fichier, de proche en proche. `null` = tout (import par
 * espace de noms).
 */
function fonctionsReleveesDeLIndex(
  source: ts.SourceFile,
  importees: Set<string> | null,
): string {
  const fonctions = fonctionsDe(source);
  const retenues = new Set<string>();
  const aVoir = importees === null ? [...fonctions.keys()] : [...importees];
  while (aVoir.length > 0) {
    const nom = aVoir.pop()!;
    const texte = fonctions.get(nom);
    if (texte === undefined || retenues.has(nom)) continue;
    retenues.add(nom);
    for (const mot of texte.match(/[A-Za-z_$][\w$]*/g) ?? []) {
      if (fonctions.has(mot) && !retenues.has(mot)) aVoir.push(mot);
    }
  }
  return [...retenues]
    .sort()
    .map((nom) => fonctions.get(nom)!)
    .join("\n");
}

/** Les modules du moteur, de proche en proche depuis la passe de régénération. */
function modulesDuMoteur(): Map<string, string> {
  const sources = new Map<string, ts.SourceFile>();
  // Ce que les modules relevés importent d'`index.ts`, par nom.
  let importeesDeLIndex: Set<string> | null = new Set();
  const aVisiter = [ENTREE];
  while (aVisiter.length > 0) {
    const chemin = versPosix(aVisiter.pop()!);
    if (sources.has(chemin) || estHorsReleve(chemin)) continue;
    const source = lire(chemin);
    sources.set(chemin, source);
    for (const instruction of source.statements) {
      const estImport =
        ts.isImportDeclaration(instruction) &&
        !instruction.importClause?.isTypeOnly;
      const estReexport =
        ts.isExportDeclaration(instruction) && !instruction.isTypeOnly;
      if (!estImport && !estReexport) continue;
      const specifieur = instruction.moduleSpecifier;
      if (specifieur === undefined || !ts.isStringLiteral(specifieur)) continue;
      const cible = resoudre(chemin, specifieur.text);
      if (cible === null) continue;
      aVisiter.push(cible);
      if (cible !== INDEX_REFERENTIEL || chemin === INDEX_REFERENTIEL) continue;
      const liaisons = ts.isImportDeclaration(instruction)
        ? instruction.importClause?.namedBindings
        : instruction.exportClause;
      if (
        liaisons === undefined ||
        ts.isNamespaceImport(liaisons) ||
        ts.isNamespaceExport(liaisons)
      ) {
        importeesDeLIndex = null;
      } else if (importeesDeLIndex !== null) {
        for (const e of liaisons.elements) {
          if (!e.isTypeOnly) {
            importeesDeLIndex.add((e.propertyName ?? e.name).text);
          }
        }
      }
    }
  }
  const textes = new Map<string, string>();
  for (const [chemin, source] of sources) {
    textes.set(
      chemin,
      chemin === INDEX_REFERENTIEL
        ? fonctionsReleveesDeLIndex(source, importeesDeLIndex)
        : source.getFullText(),
    );
  }
  return textes;
}

function releverLeMoteur(): { empreinte: string; modules: string[] } {
  const modules = [...modulesDuMoteur()].sort(([a], [b]) => (a < b ? -1 : 1));
  const hachage = createHash("sha256");
  for (const [chemin, texte] of modules) {
    const { outputText } = ts.transpileModule(texte, {
      fileName: chemin,
      compilerOptions: {
        removeComments: true,
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        jsx: ts.JsxEmit.Preserve,
      },
    });
    hachage.update(`${chemin}\n${outputText}\n`);
  }
  // La donnée que le moteur lit hors empreinte (`SUCCESSIONS_DECLAREES`).
  // Les retraits SANS absorbant n'y entrent pas : le moteur les ignore.
  const successions = Object.entries(OBLIGATIONS_RETIREES)
    .filter(([, r]) => r.absorbePar !== null)
    .map(([id, r]) => `${id}>${r.absorbePar}`)
    .sort();
  hachage.update(`OBLIGATIONS_RETIREES.absorbePar\n${successions.join("\n")}\n`);
  return {
    empreinte: hachage.digest("hex").slice(0, 16),
    modules: modules.map(([chemin]) => chemin),
  };
}

describe("VERSION_MOTEUR_CALENDRIER — le code du moteur scelle aussi le calendrier", () => {
  it("le code du moteur est celui du dernier relevé", () => {
    const { empreinte, modules } = releverLeMoteur();
    expect(
      empreinte,
      "LE CODE DU MOTEUR DE CALENDRIER A CHANGÉ (hors commentaires et types), " +
        "ou la table des absorbants. Question à trancher avant de recopier quoi " +
        "que ce soit : ce changement modifie-t-il CE QUE LA RÉGÉNÉRATION ÉCRIT " +
        "sur un dossier existant — quelles lignes existent, leurs dates, leur " +
        "statut, leur archivage ?\n" +
        "  · OUI : incrémentez `VERSION_MOTEUR_CALENDRIER` " +
        "(`src/lib/calendrier/version-moteur.ts`) et `RELEVE.version`, puis " +
        "recopiez l'empreinte reçue dans `RELEVE.empreinte`. Tous les dossiers " +
        "seront régénérés à leur prochaine ouverture : une écriture en " +
        "production, à signaler à la propriétaire avant de fusionner.\n" +
        "  · NON (renommage, extraction, affichage) : recopiez l'empreinte seule.\n" +
        "  · Une montée de TypeScript ou du lockfile peut aussi le faire tomber sans " +
        "qu'aucune règle ait changé : c'est NON.\n" +
        "  · Un absorbant modifié AVEC le retrait d'une obligation déplace déjà " +
        "l'empreinte du référentiel, donc le sceau : l'incrément y est superflu, " +
        "sans danger.\n" +
        `Modules relevés : ${modules.join(", ")}.`,
    ).toBe(RELEVE.empreinte);
  });

  it("le relevé couvre les tables de périodicité et le code du porteur", () => {
    // Le trou de la première version (relecture du 2026-09-15) : tout
    // `lib/referentiels/` était exclu, au motif que l'empreinte le scelle. Elle
    // ne hache que la CHAÎNE `o.periodicite` : `triennale` passé de 36 à 30 mois
    // dans `PERIODICITE_CALENDAIRE` ne bougeait rien.
    const { modules } = releverLeMoteur();
    expect(modules).toContain("src/lib/referentiels/types-communs.ts");
    expect(modules).toContain("src/lib/referentiels/conformite/types.ts");
    expect(modules).toContain("src/lib/calendrier/generateur.ts");
    expect(modules).toContain("src/lib/referentiels/conformite/index.ts");
    expect(modules).not.toContain("src/lib/calendrier/version-moteur.ts");
  });

  it("de l'index du référentiel, seules les fonctions que le moteur importe sont relevées", () => {
    const index = modulesDuMoteur().get(INDEX_REFERENTIEL) ?? "";
    expect(index).toContain("function obligationParId");
    expect(index).not.toContain("obligationsParDomaine");
    expect(index).not.toContain("REFERENTIEL_VERSION");
  });

  it("de l'index, une fonction appelée par une fonction importée est relevée, fléchée comprise", () => {
    const source = ts.createSourceFile(
      "index.ts",
      [
        "const aide = (id: string) => id.trim();",
        "const expression = function (x: number) { return x; };",
        "export function importee(id: string) { return aide(id); }",
        "export function inutile() { return expression(1); }",
      ].join("\n"),
      ts.ScriptTarget.Latest,
    );
    const releve = fonctionsReleveesDeLIndex(source, new Set(["importee"]));
    expect(releve).toContain("function importee");
    expect(releve).toContain("const aide");
    expect(releve).not.toContain("inutile");
    expect(releve).not.toContain("expression");
    expect(fonctionsReleveesDeLIndex(source, null)).toContain("const expression");
  });

  it("chaque fichier de données exclu du relevé existe encore", () => {
    // Sans ceci, la liste pourrit : un fichier renommé y resterait nommé pour
    // rien, et son successeur — relevé par défaut — ferait tomber le test sans
    // que personne ne comprenne pourquoi.
    const disparus = DONNEES_REFERENTIEL.filter((c) => !existsSync(surDisque(c)));
    expect(
      disparus,
      "Un fichier de `DONNEES_REFERENTIEL` n'existe plus : retirez-le de la liste, " +
        "et ajoutez son successeur s'il ne porte que des données.",
    ).toEqual([]);
  });

  it("la version du moteur est celle du dernier relevé", () => {
    expect(
      VERSION_MOTEUR_CALENDRIER,
      "`VERSION_MOTEUR_CALENDRIER` et `RELEVE.version` doivent bouger ensemble, " +
        "avec l'empreinte du code qui a motivé l'incrément.",
    ).toBe(RELEVE.version);
  });

  it("le sceau posé sur les calendriers porte la version du moteur", () => {
    // Sans ceci, la constante pourrait être incrémentée sans que le sceau la
    // lise — le trou exact qu'elle ferme, rouvert en silence.
    expect(SCEAU_CALENDRIER).toBe(
      sceauCalendrier(
        REFERENTIEL_VERSION,
        empreinteReferentiel(),
        VERSION_MOTEUR_CALENDRIER,
      ),
    );
  });

  it("le moteur 0 garde la forme d'avant, tout moteur suivant la change", () => {
    // Le moteur 0 est celui que les bases portent déjà : livrer la constante ne
    // désynchronise rien. Le premier incrément, lui, doit désynchroniser tout
    // le parc — et deux incréments ne doivent pas se confondre.
    expect(sceauCalendrier("2026-09-11.1", "154-abc", 0)).toBe(
      "2026-09-11.1+154-abc",
    );
    const un = sceauCalendrier("2026-09-11.1", "154-abc", 1);
    const deux = sceauCalendrier("2026-09-11.1", "154-abc", 2);
    expect(un).not.toBe("2026-09-11.1+154-abc");
    expect(un.startsWith("2026-09-11.1+154-abc")).toBe(true);
    expect(deux).not.toBe(un);
  });
});

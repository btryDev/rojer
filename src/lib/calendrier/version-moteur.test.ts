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
 * expression de fonction — que le moteur importe, et toute déclaration de
 * premier niveau qu'elles nomment, de proche en proche : aujourd'hui le cache
 * `let _index` et la liste `obligationsConformite`, que lit `obligationParId`.
 * Pas `REFERENTIEL_VERSION`, qui ferait tomber le test à chaque version ; pas
 * `obligationsParDomaine` ni `empreinteReferentiel`, que le moteur n'importe
 * pas (une empreinte qui calcule autrement change le sceau d'elle-même). Ses
 * imports, eux, sont suivis. Le repérage des noms est textuel : un nom cité
 * dans une chaîne est relevé pour rien, sans danger. S'y ajoute une DONNÉE que le
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
  version: 4,
  // Recopiée SANS incrément le 2026-09-26 (C37, `lot/effectif-entreprise`) :
  // les seuils d'entreprise se comparent à `Entreprise.effectif`. NON, la
  // régénération n'écrit pas autrement : les obligations d'établissement à
  // seuil sont des états permanents, que le générateur saute, et la
  // formation des élus naît des titres (contre-lecture : 256 couples, zéro
  // calendrier différent). Un incrément à 5, posé d'abord, a été retiré avant
  // livraison. Voir le commentaire de `VERSION_MOTEUR_CALENDRIER`.
  // Recopiée SANS incrément le même jour (seconde vérification C37) :
  // `matching/effectif-entreprise.ts` ne change que des PHRASES (le 6° de
  // L. 1111-3 borné à son terme, « notamment », la mention courte commune).
  // NON, la régénération n'écrit rien d'autre.
  // INCRÉMENTÉ le 2026-09-20 (décision de la propriétaire) : le silence sur
  // les locaux à sommeil ne retient plus que là où le sommeil est plausible.
  // OUI, la régénération écrit autrement : les ERP de 5ᵉ catégorie hors de ces
  // types, muets, perdent leurs quatre lignes « sommeil ». Voir le commentaire
  // de `VERSION_MOTEUR_CALENDRIER`.
  // Recopiée SANS incrément le même jour (revue du lot) : la règle devient
  // uniforme — hors liste, même un « oui » en base ne s'applique pas. La
  // version 4 n'avait pas été livrée : on y reste.
  // INCRÉMENTÉ le 2026-09-19 (ADR-036, lot 4 — la bascule) : la réconciliation
  // date chaque ligne par `echeanceDeLigne` au lieu de conserver la date en
  // base ; `decision-par-faits.ts` et `echeance-de-ligne.ts` entrent dans le
  // relevé par l'import de `generateur.ts`. OUI, la régénération écrit
  // autrement : voir le commentaire de `VERSION_MOTEUR_CALENDRIER`.
  // Recopiée SANS incrément le même jour (relecture du lot 4) : `garderLegs`
  // porté jusqu'à la boucle NB4. La bascule n'a jamais été livrée : on reste
  // en version 3.
  // Recopiée SANS incrément le 2026-09-19 (ADR-036, lot 5 — le ménage) : la
  // garde du legs est retirée. NON, la régénération n'écrit pas autrement sur
  // les dossiers réels : la garde ne changeait que le sort d'une ligne au
  // statut réalisé SANS rapport réalisé (ponctuel générée, ou `autre` en
  // boucle NB4), et d'une ligne cyclique non générée au statut réalisé — que
  // rien n'atteint, un titre cyclique ayant toujours une échéance. MESURÉ le
  // 2026-09-19 en production, en lecture seule, par le contrôle de santé de
  // CETTE branche (`comparerAuMoteur`, qui couvre aussi les lignes non
  // générées) sur les 4 établissements : `statut_seul` 0 — une ligne au statut
  // réalisé sans rapport réalisé y serait sortie —, `inexplique` 0, J+400 vide,
  // le dossier recalculé au moteur 3 identique ligne pour ligne. Et aucun
  // chemin n'en fabrique : un statut réalisé n'est écrit que depuis un rapport
  // réalisé, le retrait le rouvre (comme avant la bascule), un rapport ne se
  // dépose pas sur une ligne de salarié, les seeds n'écrivent aucun statut
  // réalisé et le générateur ne crée jamais de ligne `autre`.
  // Recopiée SANS incrément le même jour (lot 5, suite) : la couture part —
  // le réconciliateur appelle directement la seule décision qu'il prenait
  // déjà par défaut. NON : même décision, mêmes écritures.
  // Puis le deuxième argument mort du générateur (l'historique, refusé s'il
  // n'était pas vide) : NON, aucun appelant ne le remplissait.
  // Recopiée SANS incrément le 2026-09-19 (`lot/qualite-calendrier`, point 2) :
  // `dernierResultat` et `suiviDepuis` deviennent requis, leur absence lève au
  // lieu de retomber sur « conforme » et sur l'horloge. NON : `lireEntrees`
  // porte les deux sur chaque ligne (la colonne `suiviDepuis` est NOT NULL, le
  // résultat voyage avec la date du même rapport), donc aucun repli n'était
  // atteint en production ; seules des fixtures l'atteignaient.
  // Recopiée SANS incrément le même jour (point 3) : « un statut réalisé ne
  // survit pas sans rapport réalisé » sort de `statutDeLigneNonGeneree` dans
  // `reouvrirSansRapportRealise`, que `recalcul-ligne.ts` appelle aussi. NON :
  // la boucle NB4 rend le même statut dans chaque cas, branche pour branche.
  // Recopiée SANS incrément le même jour (point 4) : `deciderParFaits` et
  // `creerParFaits`, deux relais d'une ligne, sont inlinés ; la branche
  // `source === undefined`, morte, part. NON : mêmes appels, mêmes écritures.
  // Recopiée SANS incrément le même jour (point 5) : `derniere-realisation.ts`
  // gagne `ORDRE_RAPPORT_PLUS_RECENT`, que le moteur n'importe pas — il
  // départage toujours par `indexerDernieresRealisations`. NON.
  // Recopiée SANS incrément le 2026-09-20 (`lot/accueil-personnes-presentes`) :
  // `evaluerPersonnesPresentes` et ses deux tables sortent d'`engine.ts` vers
  // `matching/personnes-presentes.ts`, pour être chargeables par un écran. NON :
  // corps et gabarits de raison identiques au caractère près (contre-lecture,
  // diff ligne à ligne), et les raisons ne sont de toute façon pas persistées.
  // Le module entre au relevé avec `nombreDePersonnesADemander` et les mots de
  // la question : une retouche de ces textes déplacera l'empreinte sans toucher
  // un calendrier — recopier, ne pas incrémenter.
  // Recopiée SANS incrément le 2026-09-26 (`lot/sans-qualification`, C32) :
  // `MARQUAGE_CONTRACTUEL_LONG` (`prescriptions/sources.ts`) ne dit plus
  // « opposable par votre contrat d'assurance, pas par le droit ». NON :
  // affichage seul, jamais écrit par la régénération — lu par la fiche de
  // vérification et le formulaire des prescriptions, réexporté par
  // `prescriptions/schema.ts`, absent de `calendrier/` et de
  // `prescriptions/actions.ts` (décision de la session de coordination).
  empreinte: "d6ce6130dcdbeea4",
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

/**
 * Les déclarations de premier niveau d'un fichier, par nom, et lesquelles sont
 * des fonctions : `function`, ou constante qui vaut une fonction fléchée ou une
 * expression de fonction.
 */
function declarationsDe(source: ts.SourceFile): {
  textes: Map<string, string>;
  fonctions: Set<string>;
} {
  const textes = new Map<string, string>();
  const fonctions = new Set<string>();
  for (const instruction of source.statements) {
    if (ts.isFunctionDeclaration(instruction) && instruction.name) {
      textes.set(instruction.name.text, instruction.getText(source));
      fonctions.add(instruction.name.text);
    } else if (ts.isVariableStatement(instruction)) {
      for (const d of instruction.declarationList.declarations) {
        if (!ts.isIdentifier(d.name)) continue;
        textes.set(d.name.text, instruction.getText(source));
        if (
          d.initializer !== undefined &&
          (ts.isArrowFunction(d.initializer) ||
            ts.isFunctionExpression(d.initializer))
        ) {
          fonctions.add(d.name.text);
        }
      }
    }
  }
  return { textes, fonctions };
}

/** Les noms qu'un texte cite — identifiants Unicode compris. */
const NOMS_CITES = /[\p{ID_Start}$_][\p{ID_Continue}$‌‍]*/gu;

/**
 * Les fonctions d'`index.ts` que le moteur importe, et tout ce qu'elles nomment
 * au premier niveau du fichier — fonctions, cache (`let _index`), liste
 * (`obligationsConformite`) —, de proche en proche. Seules les FONCTIONS
 * importées servent de point de départ : une donnée importée par le moteur
 * (`OBLIGATIONS_RETIREES`) n'entre que si une fonction retenue la nomme.
 * `null` = toutes les fonctions (import par espace de noms).
 */
function fonctionsReleveesDeLIndex(
  source: ts.SourceFile,
  importees: Set<string> | null,
): string {
  const { textes, fonctions } = declarationsDe(source);
  const retenues = new Set<string>();
  const aVoir = [...(importees ?? fonctions)].filter((n) => fonctions.has(n));
  while (aVoir.length > 0) {
    const nom = aVoir.pop()!;
    const texte = textes.get(nom);
    if (texte === undefined || retenues.has(nom)) continue;
    retenues.add(nom);
    for (const mot of texte.match(NOMS_CITES) ?? []) {
      if (textes.has(mot) && !retenues.has(mot)) aVoir.push(mot);
    }
  }
  const releves = new Set([...retenues].sort().map((nom) => textes.get(nom)!));
  return [...releves].join("\n");
}

/**
 * Les noms qu'un import ou un réexport tire de son module, sous leur nom
 * D'ORIGINE (`{ a as b }` rend `a`). `null` = tout : `* as`, `export *`, ou
 * import sans liaison nommée.
 */
function nomsLies(
  instruction: ts.ImportDeclaration | ts.ExportDeclaration,
): string[] | null {
  const liaisons = ts.isImportDeclaration(instruction)
    ? instruction.importClause?.namedBindings
    : instruction.exportClause;
  if (
    liaisons === undefined ||
    ts.isNamespaceImport(liaisons) ||
    ts.isNamespaceExport(liaisons)
  ) {
    return null;
  }
  return liaisons.elements
    .filter((e) => !e.isTypeOnly)
    .map((e) => (e.propertyName ?? e.name).text);
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
      const noms = nomsLies(instruction);
      if (noms === null) importeesDeLIndex = null;
      else if (importeesDeLIndex !== null) {
        for (const nom of noms) importeesDeLIndex.add(nom);
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
        "  · Un fichier de DONNÉES neuf du référentiel figure dans les modules " +
        "relevés : ajoutez-le à `DONNEES_REFERENTIEL`, ne recopiez pas.\n" +
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
    // Ce que `obligationParId` lit au premier niveau.
    expect(index).toContain("let _index");
    expect(index).toContain("const obligationsConformite");
    expect(index).not.toContain("obligationsParDomaine");
    expect(index).not.toContain("function empreinteReferentiel");
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
        "let mémoire: Map<string, string> | null = null;",
        "export function lireMémoire() { return mémoire; }",
      ].join("\n"),
      ts.ScriptTarget.Latest,
    );
    const releve = fonctionsReleveesDeLIndex(source, new Set(["importee"]));
    expect(releve).toContain("function importee");
    expect(releve).toContain("const aide");
    expect(releve).not.toContain("inutile");
    expect(releve).not.toContain("expression");
    expect(releve).not.toContain("let mémoire");
    // Une déclaration non fonction, nommée par une fonction retenue — et un
    // identifiant accentué, que le repérage ASCII coupait en deux.
    expect(
      fonctionsReleveesDeLIndex(source, new Set(["lireMémoire"])),
    ).toContain("let mémoire");
    expect(fonctionsReleveesDeLIndex(source, null)).toContain("const expression");
  });

  it("les noms liés suivent le nom d'origine, et `* as` comme `export *` valent tout", () => {
    const source = ts.createSourceFile(
      "m.ts",
      [
        'import { obligationParId as parId, type Obligation } from "x";',
        'export { obligationsConformite as liste } from "x";',
        'import * as ref from "x";',
        'export * from "x";',
      ].join("\n"),
      ts.ScriptTarget.Latest,
    );
    const [renomme, reexport, espace, tout] = source.statements as unknown as [
      ts.ImportDeclaration,
      ts.ExportDeclaration,
      ts.ImportDeclaration,
      ts.ExportDeclaration,
    ];
    expect(nomsLies(renomme)).toEqual(["obligationParId"]);
    expect(nomsLies(reexport)).toEqual(["obligationsConformite"]);
    expect(nomsLies(espace)).toBeNull();
    expect(nomsLies(tout)).toBeNull();
  });

  it("aucun fichier de données exclu ne porte de fonction ni d'import de valeur", () => {
    // La liste d'exclusion ne vaut que si ses fichiers ne sont QUE des données :
    // du code qui s'y glisserait sortirait du relevé en silence.
    const fautes = DONNEES_REFERENTIEL.filter((c) =>
      existsSync(surDisque(c)),
    ).flatMap((chemin) => {
      const trouve = new Set<string>();
      const visiter = (n: ts.Node) => {
        if (
          ts.isFunctionDeclaration(n) ||
          ts.isFunctionExpression(n) ||
          ts.isArrowFunction(n) ||
          ts.isMethodDeclaration(n)
        ) {
          trouve.add(`${chemin} : fonction`);
        }
        const importDeValeur =
          ts.isImportDeclaration(n) &&
          !n.importClause?.isTypeOnly &&
          (nomsLies(n)?.length ?? 1) > 0;
        const reexportDeValeur =
          ts.isExportDeclaration(n) &&
          n.moduleSpecifier !== undefined &&
          !n.isTypeOnly;
        if (importDeValeur || reexportDeValeur) {
          trouve.add(`${chemin} : import de valeur`);
        }
        ts.forEachChild(n, visiter);
      };
      visiter(lire(chemin));
      return [...trouve];
    });
    expect(
      fautes,
      "Un fichier de `DONNEES_REFERENTIEL` porte du code : retirez-le de la " +
        "liste (il sera relevé), ou sortez le code dans un module relevé.",
    ).toEqual([]);
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

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
 * tout ce qu'elle importe à l'exécution dans `src/`, de proche en proche — le
 * réconciliateur, le matching, l'arithmétique des dates, l'échéance d'un
 * titre, et les tables de `referentiels/types-communs.ts`
 * (`PERIODICITE_CALENDAIRE`, `PERIODICITE_EN_JOURS`) et le code de
 * `referentiels/conformite/types.ts` (`porteurDe`…). La liste se calcule : un
 * module que le moteur se met à importer entre dans le relevé sans qu'on y
 * pense. Chaque module est relevé TRANSPILÉ — types et commentaires retirés —,
 * si bien qu'un commentaire daté ou une annotation de type ne font rien tomber.
 * S'y ajoute une DONNÉE que le moteur lit et que l'empreinte ne hache pas : la
 * table retiré → absorbant de `OBLIGATIONS_RETIREES`.
 *
 * CE QUI NE L'EST PAS, et pourquoi — vérifié en lisant `empreinteReferentiel` :
 *  · les DONNÉES du référentiel (`referentiels/conformite/`, hors `types.ts`) et
 *    le corpus (`referentiels/corpus/`). L'empreinte hache, par obligation,
 *    l'identifiant, la périodicité, `premierDelai`, le libellé, les
 *    réalisateurs, les typologies, les conditions, les catégories, le porteur,
 *    le contexte d'équipement et `succedeA` : tout ce que la régénération
 *    recopie ou dont elle déduit une ligne. `conformite/index.ts` en fait
 *    partie : il porte `REFERENTIEL_VERSION`, qui le ferait tomber à chaque
 *    version ; son code (`empreinteReferentiel`, `obligationParId`) change le
 *    sceau par construction s'il change l'empreinte, et sa seule donnée lue
 *    par le moteur hors empreinte — `absorbePar` — est relevée à part ;
 *  · `calendrier/version-moteur.ts`, qui porte la constante elle-même ;
 *  · l'accès aux données (`lib/prisma`) et la garde de session (`lib/auth/`),
 *    qui ne décident d'aucune ligne ; les imports de type seul ; les paquets.
 *
 * Une montée de version de TypeScript peut changer la sortie du transpileur,
 * donc le relevé, sans qu'aucune règle ait bougé : recopier le relevé suffit.
 */

/** La racine du dépôt, depuis ce fichier — jamais le répertoire courant. */
const RACINE = fileURLToPath(new URL("../../..", import.meta.url));
const ENTREE = "src/lib/calendrier/actions.ts";

/** Chemins posix relatifs à la racine, séparateurs normalisés. */
function estHorsReleve(chemin: string): boolean {
  if (chemin === "src/lib/calendrier/version-moteur.ts") return true;
  if (chemin.startsWith("src/lib/referentiels/corpus/")) return true;
  if (
    chemin.startsWith("src/lib/referentiels/conformite/") &&
    chemin !== "src/lib/referentiels/conformite/types.ts"
  ) {
    return true;
  }
  return chemin === "src/lib/prisma.ts" || chemin.startsWith("src/lib/auth/");
}

/**
 * Le dernier relevé, et la version du moteur qu'il a servie. Un seul couple,
 * pas d'historique : `version-moteur.ts` dit ce que coûte un incrément, et le
 * message du test dit quand en faire un.
 */
const RELEVE = {
  version: 0,
  empreinte: "376939893574e58d",
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

/** Les modules du moteur, de proche en proche depuis la passe de régénération. */
function modulesDuMoteur(): Map<string, string> {
  const vus = new Map<string, string>();
  const aVisiter = [ENTREE];
  while (aVisiter.length > 0) {
    const chemin = versPosix(aVisiter.pop()!);
    if (vus.has(chemin) || estHorsReleve(chemin)) continue;
    const texte = readFileSync(surDisque(chemin), "utf8");
    vus.set(chemin, texte);
    const source = ts.createSourceFile(
      chemin,
      texte,
      ts.ScriptTarget.Latest,
      false,
      chemin.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
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
      if (cible !== null) aVisiter.push(cible);
    }
  }
  return vus;
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
  const successions = Object.entries(OBLIGATIONS_RETIREES)
    .map(([id, r]) => `${id}>${r.absorbePar ?? ""}`)
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
    expect(modules).not.toContain("src/lib/calendrier/version-moteur.ts");
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

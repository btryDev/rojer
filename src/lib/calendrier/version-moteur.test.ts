import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import {
  REFERENTIEL_VERSION,
  SCEAU_CALENDRIER,
  empreinteReferentiel,
  sceauCalendrier,
} from "@/lib/referentiels/conformite";
import { VERSION_MOTEUR_CALENDRIER } from "./version-moteur";

/**
 * Le rappel d'incrémenter `VERSION_MOTEUR_CALENDRIER` — posé le 2026-09-15
 * (`lot/fusibles-referentiel`).
 *
 * Une constante à incrémenter à la main ne rappelle rien à personne : c'est le
 * défaut que `REFERENTIEL_VERSION` a eu le 2026-09-10, quand l'empreinte a bougé
 * sans elle. Ce test RELÈVE donc le code du moteur et tombe dès qu'il change,
 * pour poser la seule question qui compte : ce changement modifie-t-il ce que
 * la régénération écrit ?
 *
 * CE QUI EST RELEVÉ : la passe de régénération (`calendrier/actions.ts`) et
 * tout ce qu'elle importe à l'exécution dans `src/`, de proche en proche — le
 * réconciliateur, le matching, l'arithmétique des dates, l'échéance d'un
 * titre… La liste se calcule : un module que le moteur se met à importer
 * entre dans le relevé sans qu'on y pense. Commentaires et mise en forme sont
 * retirés par l'imprimeur de TypeScript, si bien qu'un commentaire daté ne
 * fait rien tomber — ce dépôt en écrit beaucoup.
 *
 * CE QUI NE L'EST PAS, et pourquoi : le référentiel (`lib/referentiels/`), que
 * sa propre empreinte scelle déjà ; l'accès aux données (`lib/prisma`) et la
 * garde de session (`lib/auth/`), qui ne décident d'aucune ligne ; les imports
 * de type seul, effacés à la compilation ; les paquets.
 *
 * Une montée de version de TypeScript peut changer la sortie de l'imprimeur,
 * donc le relevé, sans qu'aucune règle ait bougé : recopier le relevé suffit.
 */

const RACINE = process.cwd();
const ENTREE = "src/lib/calendrier/actions.ts";
const HORS_RELEVE = ["src/lib/referentiels/", "src/lib/prisma", "src/lib/auth/"];

/**
 * Le dernier relevé, et la version du moteur qu'il a servie. Un seul couple,
 * pas d'historique : `version-moteur.ts` dit ce que coûte un incrément, et le
 * message du test dit quand en faire un.
 */
const RELEVE = {
  version: 0,
  empreinte: "c3f302c9e702ac66",
};

function resoudre(depuis: string, specifieur: string): string | null {
  let base: string;
  if (specifieur.startsWith("@/")) base = join("src", specifieur.slice(2));
  else if (specifieur.startsWith(".")) base = join(dirname(depuis), specifieur);
  else return null; // un paquet
  for (const candidat of [`${base}.ts`, `${base}.tsx`, join(base, "index.ts")]) {
    if (existsSync(join(RACINE, candidat))) return candidat;
  }
  return null;
}

/** Les modules du moteur, de proche en proche depuis la passe de régénération. */
function modulesDuMoteur(): Map<string, ts.SourceFile> {
  const vus = new Map<string, ts.SourceFile>();
  const aVisiter = [ENTREE];
  while (aVisiter.length > 0) {
    const chemin = aVisiter.pop()!;
    if (vus.has(chemin) || HORS_RELEVE.some((p) => chemin.startsWith(p))) {
      continue;
    }
    const source = ts.createSourceFile(
      chemin,
      readFileSync(join(RACINE, chemin), "utf8"),
      ts.ScriptTarget.Latest,
      false,
      chemin.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    vus.set(chemin, source);
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
  const imprimeur = ts.createPrinter({ removeComments: true });
  const modules = [...modulesDuMoteur()].sort(([a], [b]) => (a < b ? -1 : 1));
  const hachage = createHash("sha256");
  for (const [chemin, source] of modules) {
    hachage.update(`${chemin}\n${imprimeur.printFile(source)}\n`);
  }
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
      "LE CODE DU MOTEUR DE CALENDRIER A CHANGÉ (hors commentaires). Question à " +
        "trancher avant de recopier quoi que ce soit : ce changement modifie-t-il " +
        "CE QUE LA RÉGÉNÉRATION ÉCRIT sur un dossier existant — quelles lignes " +
        "existent, leurs dates, leur statut, leur archivage ?\n" +
        "  · OUI : incrémentez `VERSION_MOTEUR_CALENDRIER` " +
        "(`src/lib/calendrier/version-moteur.ts`) et `RELEVE.version`, puis " +
        "recopiez l'empreinte reçue dans `RELEVE.empreinte`. Tous les dossiers " +
        "seront régénérés à leur prochaine ouverture : une écriture en " +
        "production, à signaler à la propriétaire avant de fusionner.\n" +
        "  · NON (renommage, extraction, affichage) : recopiez l'empreinte seule.\n" +
        `Modules relevés : ${modules.join(", ")}.`,
    ).toBe(RELEVE.empreinte);
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

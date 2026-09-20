import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * CE QUE CE FICHIER DÉFEND, ET POURQUOI IL BALAIE DES SOURCES.
 *
 * Le lot qui a posé le fait de fraîcheur l'a branché sur quatre sorties. Une
 * contre-lecture a montré que TROIS d'entre elles n'étaient tenues par rien :
 * couper l'avertissement du ZIP de contrôle, du PDF de dossier et de l'écran
 * « Préparer un contrôle » laissait 806 tests verts. La cause est simple et
 * n'est pas réparable test par test : aucun fichier de test n'importe une route
 * d'API ni une page serveur, et le test du composant PDF garde la PROP, pas le
 * builder qui la remplit. Une correction qu'aucune garde ne tient se défait à
 * la première réécriture — et celle-ci porte sur le document qu'on remet à un
 * contrôleur.
 *
 * LA GARDE NE RECOPIE PAS UNE LISTE, ELLE DÉRIVE UN CRITÈRE. Une énumération
 * des quatre sorties se réparerait en la recopiant, donc cesserait de vérifier
 * (c'est la faute que le dépôt connaît sous le nom de « liste exhaustive en
 * test »). Le critère est causal : **une sortie qui LIT le calendrier doit
 * DIRE son âge**. Un cinquième export qui lirait les échéances sans porter la
 * fraîcheur échoue donc tout seul, sans que personne ait pensé à l'inscrire.
 *
 * Même technique que `corpus/citations-ecran.ts` et `auth/tenancy-sonde.ts` :
 * on lit les sources, parce que la propriété porte sur le CÂBLAGE et qu'aucune
 * exécution ne l'observe.
 */

const RACINE = join(__dirname, "..", "..", "..");

/** Les dossiers où vivent les sorties qui rendent un état de conformité. */
const SURFACES = ["src/app", "src/lib/pdf", "src/lib/mcp"] as const;

/**
 * Lire l'une de ces fonctions, c'est lire le calendrier : elles rendent des
 * lignes de vérification, des compteurs de retard, ou les deux.
 *
 * `getDashboardData` y est parce que ses compteurs `verifsEnRetard` et
 * `actionsEnRetard` sont exactement ce qui vaut « À jour » à l'écran quand ils
 * valent zéro — le défaut d'origine.
 */
const LECTEURS_DU_CALENDRIER = [
  "listerVerifications",
  "construireDossierConformiteData",
  "construireRegistreData",
  "getDashboardData",
] as const;

/**
 * Porter la fraîcheur, c'est APPELER l'une de ces fonctions. Le `(` n'est pas
 * un détail : il est tout ce qui sépare cette garde d'une décoration.
 *
 * PREMIÈRE RÉDACTION, ET SA PANNE. La liste contenait aussi
 * `avertissementCalendrier`, et le marqueur était cherché par `includes`, sans
 * parenthèse. Or `avertissementCalendrier` est le NOM DE LA PROP : il reste
 * écrit dans le fichier quand on passe `avertissementCalendrier: null`. Coupée
 * ainsi — import retiré, appel retiré, prop à `null` —, la sortie redevenait
 * muette et le balayage restait VERT. La garde écrite pour empêcher qu'on
 * coupe le fil ne voyait pas qu'on l'avait coupé.
 *
 * Trouvé en l'éprouvant, pas en la relisant : c'est le sort ordinaire de ce
 * genre de garde, et la raison pour laquelle le dépôt exige de casser ce qu'on
 * prétend tenir.
 */
const PORTE_LA_FRAICHEUR = [
  "fraicheurCalendrier(", // application, portée par la session
  "getFraicheurCalendrier(", // serveur MCP, portée explicite
  "phraseFraicheur(", // rend la phrase à afficher
  "etatSelonCalendrier(", // rabat un état sur ce qu'on peut défendre
] as const;

/**
 * Les lecteurs qui n'ont rien à dire de la fraîcheur, avec leur raison.
 *
 * Chaque entrée est un ENGAGEMENT : elle dit pourquoi cette sortie échappe au
 * critère, et se relit quand elle change. Une exemption sans motif est une
 * liste exhaustive déguisée.
 */
const EXEMPTES: Record<string, string> = {
  // Les deux pages d'entrée RÉPARENT le calendrier avant de le lire
  // (`assurerCalendrierAJour`) : elles n'ont pas à dire un âge qu'elles
  // viennent de remettre à zéro. C'est `regeneration-sure.ts` qui réserve la
  // réparation à ces deux-là, et le reste du produit qui en dépend.
  "src/app/etablissements/[id]/page.tsx":
    "page d'entrée : régénère avant de lire",
  "src/app/etablissements/[id]/calendrier/page.tsx":
    "page d'entrée : régénère avant de lire",
  // Le builder du registre ne rend pas d'état de conformité : il compose des
  // rapports DÉPOSÉS, qui sont des faits acquis et ne dépendent pas d'un
  // calcul d'échéance. Le PDF qu'il alimente porte la fraîcheur par le
  // dossier de conformité, dans le même ZIP.
  "src/app/api/etablissements/[id]/registre/pdf/route.ts":
    "rapports déposés, pas d'échéance calculée",
  // Cette route ne fait que rendre le document que le builder compose, et
  // c'est le builder qui porte l'avertissement — sur la page de garde du PDF,
  // avant le score. L'exemption est VÉRIFIÉE plus bas, pas seulement
  // déclarée : si `builders.ts` cessait de le porter, elle tomberait.
  "src/app/api/etablissements/[id]/dossier-conformite/pdf/route.ts":
    "délègue à construireDossierConformiteData, qui la porte",
};

/** Où vivent les builders dont une route peut hériter la fraîcheur. */
const PORTEUR_DELEGUE = "src/lib/pdf/builders.ts";

function fichiersSources(dossier: string): string[] {
  const trouves: string[] = [];
  const descendre = (d: string) => {
    for (const entree of readdirSync(d)) {
      const p = join(d, entree);
      if (statSync(p).isDirectory()) {
        if (entree !== "node_modules") descendre(p);
      } else if (/\.tsx?$/.test(p) && !/\.test\./.test(p)) {
        trouves.push(p);
      }
    }
  };
  descendre(join(RACINE, dossier));
  return trouves;
}

/** Les sorties qui lisent le calendrier, avec ce qu'elles en disent. */
function sorties(): { chemin: string; lit: string[]; dit: boolean }[] {
  const resultat: { chemin: string; lit: string[]; dit: boolean }[] = [];
  for (const dossier of SURFACES) {
    for (const fichier of fichiersSources(dossier)) {
      const source = readFileSync(fichier, "utf8");
      const lit = LECTEURS_DU_CALENDRIER.filter((f) =>
        new RegExp(`\\b${f}\\s*\\(`).test(source),
      );
      if (lit.length === 0) continue;
      resultat.push({
        chemin: fichier.slice(RACINE.length + 1),
        lit,
        dit: PORTE_LA_FRAICHEUR.some((f) => source.includes(f)),
      });
    }
  }
  return resultat;
}

describe("toute sortie qui lit le calendrier en dit l'âge", () => {
  it("trouve bien des sorties — sinon le balayage ne prouve rien", () => {
    // Borne basse. Un critère qui ne rencontre personne passe au vert pour
    // toujours : c'est la panne silencieuse de ce genre de garde.
    expect(sorties().length).toBeGreaterThanOrEqual(5);
  });

  it("chacune porte la fraîcheur, ou figure aux exemptions motivées", () => {
    const muettes = sorties()
      .filter((s) => !s.dit && !(s.chemin in EXEMPTES))
      .map((s) => `${s.chemin} (lit ${s.lit.join(", ")})`);

    expect(
      muettes,
      muettes.length === 0
        ? ""
        : `Ces sorties lisent le calendrier sans rien dire de son âge :\n` +
          `  ${muettes.join("\n  ")}\n` +
          `Un calendrier jamais calculé y rend une liste vide, et une liste ` +
          `vide se lit comme « rien à signaler ». Branchez ` +
          `\`fraicheurCalendrier\` (ou \`getFraicheurCalendrier\` hors session), ` +
          `ou inscrivez la sortie dans EXEMPTES avec sa raison.`,
    ).toEqual([]);
  });

  it("l'exemption par délégation n'en est une que si le délégué porte", () => {
    // Une exemption qui se contente de s'affirmer ne vaut rien. Celle-ci dit
    // « le builder le porte » : on le vérifie. Le jour où `builders.ts`
    // cesserait de lire la fraîcheur, la route qu'il couvre redeviendrait
    // muette sans que personne touche à la route.
    const porteur = sorties().find((s) => s.chemin === PORTEUR_DELEGUE);
    expect(porteur, `${PORTEUR_DELEGUE} ne lit plus le calendrier`).toBeDefined();
    expect(
      porteur?.dit,
      `${PORTEUR_DELEGUE} ne porte plus la fraîcheur : les routes qui lui ` +
        `délèguent ne sont plus couvertes, et leur exemption devient fausse.`,
    ).toBe(true);
  });

  it("aucune exemption ne survit à la sortie qu'elle couvrait", () => {
    // Une exemption qui ne désigne plus rien est une dette invisible : elle
    // couvrirait un fichier recréé plus tard sous le même nom, sans que
    // personne ait relu sa raison.
    const connues = new Set(sorties().map((s) => s.chemin));
    const mortes = Object.keys(EXEMPTES).filter((c) => !connues.has(c));
    expect(mortes, `Exemptions sans objet, à retirer : ${mortes.join(", ")}`)
      .toEqual([]);
  });

  it("le marqueur exige un APPEL, pas le nom d'une prop", () => {
    // Garde de la garde. Si quelqu'un remet un nom de champ dans la liste des
    // marqueurs, la sonde redeviendra verte sur une sortie muette — la panne
    // exacte qu'elle a connue. Chaque marqueur doit donc finir par `(`.
    for (const m of PORTE_LA_FRAICHEUR) {
      expect(m.endsWith("("), `« ${m} » ne dénote pas un appel`).toBe(true);
    }
  });

  it("les quatre sorties corrigées le 2026-09-20 sont toujours branchées", () => {
    // Borne haute, nominative — non pour énumérer, mais parce que ces
    // quatre-là ont été trouvées muettes une fois. Le critère dérivé les
    // couvre déjà ; ce test dit que leur régression serait un retour en
    // arrière connu, pas une nouveauté.
    const parChemin = new Map(sorties().map((s) => [s.chemin, s]));
    for (const chemin of [
      "src/app/api/etablissements/[id]/controle-zip/route.ts",
      "src/app/etablissements/[id]/controle/page.tsx",
      "src/lib/pdf/builders.ts",
      "src/lib/mcp/tools.ts",
    ]) {
      expect(parChemin.get(chemin)?.dit, chemin).toBe(true);
    }
  });
});

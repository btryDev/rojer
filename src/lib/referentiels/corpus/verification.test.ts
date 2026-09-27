// L'échelle de vérification, éprouvée en la cassant, et le document qui en
// découle, éprouvé en le régénérant.
//
// Deux garanties, et elles ne se remplacent pas :
//
//  1. **Chaque barreau de l'échelle est atteint par une donnée qui le mérite.**
//     Trois des six degrés ne sont atteints par aucune référence du dépôt
//     aujourd'hui. Une échelle dont le bas ne marche pas ne se voit pas : elle
//     classerait une lacune au milieu, et le document dirait « lu » d'un texte
//     que personne n'a ouvert. Chaque cas est donc FABRIQUÉ ici, y compris ceux
//     qu'aucune donnée réelle ne produit.
//
//  2. **Le document commité est le produit du script, au caractère près.** Sans
//     cette comparaison, « aucun chiffre écrit à la main » resterait une
//     intention : il suffirait qu'une session corrige un compte directement
//     dans le Markdown pour que le document rejoigne la pile de ceux qui se
//     périment en silence. La contre-épreuve plus bas prouve qu'un chiffre
//     retouché à la main est bien attrapé.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ReferenceLegale } from "../conformite/types";
import type { ArticleDepouille } from "./types";
import {
  ancrageDeReference,
  degre,
  degreDeReference,
  DEGRES,
  mesurerReferentiel,
  type CodeDegre,
} from "./verification";
import {
  CHEMIN_DOCUMENT,
  PREFIXE_DATE,
  rendreEtatVerification,
} from "./verification-document";

// -----------------------------------------------------------------------------
// L'échelle
// -----------------------------------------------------------------------------

/** Un article retenu, complet. Chaque cas ci-dessous en retire une pièce. */
const COMPLET: ArticleDepouille = {
  ref: "R. 0000-1",
  statut: "retenu",
  obligations: ["une-obligation"],
  luLe: "2026-09-01",
  lecture: "premiere_main",
  citationCle: "« Le présent article ne dit rien : il sert de témoin. »",
  versionEnVigueur: "2026-01-01",
};

const REF: ReferenceLegale = {
  source: "CODE_TRAVAIL",
  reference: "R. 0000-1",
  article: "R. 0000-1",
};

/**
 * Un cas par barreau, chacun obtenu en retirant du témoin la SEULE pièce qui
 * distingue ce barreau du précédent. C'est ce qui fait de cette liste une
 * épreuve et non une illustration : si deux barreaux se confondaient, deux
 * lignes d'ici attendraient le même degré et l'une des deux échouerait.
 */
const CAS: { attendu: CodeDegre; quoi: string; article?: ArticleDepouille }[] = [
  {
    attendu: "premiere_main",
    quoi: "le témoin complet, lu à la source, verbatim relevé",
    article: COMPLET,
  },
  {
    attendu: "agent_verbatim",
    quoi: "le même, lu par un agent",
    article: { ...COMPLET, lecture: "agent_verbatim" },
  },
  {
    attendu: "lu_sans_verbatim",
    quoi: "lu à la source, mais aucune citation relevée",
    article: { ...COMPLET, citationCle: undefined },
  },
  {
    attendu: "lecture_indirecte",
    quoi: "un verbatim relevé ailleurs qu'à la source ne rachète pas la source",
    article: { ...COMPLET, lecture: "indirect" },
  },
  {
    attendu: "sans_trace_de_lecture",
    quoi: "au corpus, non dépouillé",
    article: { ref: "R. 0000-1", statut: "non_depouille" },
  },
  {
    attendu: "sans_trace_de_lecture",
    quoi: "un statut conclu sans date de lecture n'atteste pas d'une lecture",
    article: { ...COMPLET, luLe: undefined },
  },
  {
    attendu: "sans_trace_de_lecture",
    quoi: "ni sans moyen de lecture déclaré",
    article: { ...COMPLET, lecture: undefined },
  },
  {
    attendu: "jamais_ouvert",
    quoi: "une clé qu'aucun corpus ne connaît",
    article: undefined,
  },
];

describe("l'échelle de vérification", () => {
  it.each(CAS)("classe « $quoi » au degré $attendu", ({ attendu, article }) => {
    expect(degreDeReference(REF, article)).toBe(attendu);
  });

  it("classe une référence sans clé d'article au degré le plus bas", () => {
    // Le cas se distingue du précédent : la clé manque côté OBLIGATION, pas
    // côté corpus. Le remède n'est pas le même, le degré si.
    expect(degreDeReference({ ...REF, article: undefined }, COMPLET)).toBe(
      "jamais_ouvert",
    );
  });

  it("atteint chacun des barreaux qu'elle déclare", () => {
    // La garde de la garde : une échelle peut gagner un barreau sans que
    // personne n'écrive le cas qui l'atteint, et ce barreau serait alors
    // décoratif. Les cas ci-dessus doivent couvrir l'échelle entière.
    const atteints = new Set([
      ...CAS.map((c) => c.attendu),
      degreDeReference({ ...REF, article: undefined }, COMPLET),
    ]);
    expect([...atteints].sort()).toEqual([...DEGRES.map((d) => d.code)].sort());
  });

  it("ordonne les degrés sans ex æquo", () => {
    // Le plancher d'une obligation est un minimum sur les rangs : deux degrés
    // au même rang le rendraient indéterminé, et l'ordre du tableau
    // dépendrait de l'ordre de déclaration des références.
    const rangs = DEGRES.map((d) => d.rang);
    expect(new Set(rangs).size).toBe(rangs.length);
    expect([...rangs]).toEqual([...rangs].sort((a, b) => b - a));
  });
});

describe("l'ancre de veille, tenue à part de la lecture", () => {
  it("dit « jamais constatée » quand l'obligation ne porte pas de version", () => {
    expect(ancrageDeReference(REF, COMPLET)).toBe("jamais_constate");
  });

  it("dit « ancrée » quand les deux versions concordent", () => {
    expect(
      ancrageDeReference({ ...REF, versionConstatee: "2026-01-01" }, COMPLET),
    ).toBe("ancre");
  });

  it("dit « divergente » quand le corpus a lu une autre version", () => {
    expect(
      ancrageDeReference({ ...REF, versionConstatee: "2020-01-01" }, COMPLET),
    ).toBe("divergent");
  });

  it("une citation relue par l'API Légifrance vaut première main (C51) ; un relevé d'agent, non", () => {
    expect(degreDeReference(REF, { ...COMPLET, lecture: "api_legifrance" })).toBe("premiere_main");
    expect(degreDeReference(REF, { ...COMPLET, lecture: "api_legifrance", citationCle: undefined })).toBe("lu_sans_verbatim");
    expect(degreDeReference(REF, { ...COMPLET, lecture: "agent_verbatim" })).toBe("agent_verbatim");
  });

  it("ne dépend pas du degré de lecture, ni l'inverse", () => {
    // Les deux axes existent parce qu'ils ne disent pas la même chose. Ce test
    // le rend exigible : un texte lu à la source avec verbatim peut n'avoir
    // aucune ancre, et une ancre parfaite peut coiffer un texte jamais ouvert.
    expect(degreDeReference(REF, COMPLET)).toBe("premiere_main");
    expect(ancrageDeReference(REF, COMPLET)).toBe("jamais_constate");

    const ancree = { ...REF, versionConstatee: "2026-01-01" };
    expect(ancrageDeReference(ancree, undefined)).toBe("ancre");
    expect(degreDeReference(ancree, undefined)).toBe("jamais_ouvert");
  });
});

describe("le plancher d'une obligation", () => {
  it("est plus faible que le fondement pour au moins une obligation réelle", () => {
    // Sans cette vérification, le plancher pourrait n'être qu'une copie du
    // degré du fondement — le calcul serait mort et personne ne le verrait.
    const mesures = mesurerReferentiel();
    const affaiblies = mesures.filter(
      (m) => degre(m.degrePlancher).rang < degre(m.degreFondement).rang,
    );
    expect(affaiblies.length).toBeGreaterThan(0);
    for (const m of affaiblies) {
      expect(m.references.length).toBeGreaterThan(1);
    }
  });

  it("ne dépasse jamais le degré de la référence la plus faible", () => {
    for (const m of mesurerReferentiel()) {
      const minimum = Math.min(...m.references.map((r) => degre(r.degre).rang));
      expect(degre(m.degrePlancher).rang).toBe(minimum);
    }
  });
});

// -----------------------------------------------------------------------------
// Le document
// -----------------------------------------------------------------------------

function documentCommite(): string {
  return readFileSync(path.join(process.cwd(), CHEMIN_DOCUMENT), "utf8");
}

/** La date de génération inscrite dans le document commité. */
function dateDuDocument(doc: string): string {
  const ligne = doc
    .split("\n")
    .find((l) => l.startsWith(PREFIXE_DATE))
    ?.slice(PREFIXE_DATE.length)
    .trim();
  expect(
    ligne,
    `${CHEMIN_DOCUMENT} ne porte pas sa date de génération. Régénérez-le : ` +
      `pnpm verification --ecrire`,
  ).toBeDefined();
  return ligne as string;
}

describe(`${CHEMIN_DOCUMENT} — aucun chiffre écrit à la main`, () => {
  it("est identique au rendu du script, au caractère près", () => {
    const doc = documentCommite();
    const rendu = rendreEtatVerification(dateDuDocument(doc));

    expect(
      rendu === doc,
      `${CHEMIN_DOCUMENT} n'est plus le produit du script. Soit le référentiel ` +
        `ou le corpus ont bougé depuis la dernière génération — auquel cas le ` +
        `document affirme aujourd'hui des comptes faux —, soit quelqu'un l'a ` +
        `édité à la main. Dans les deux cas le remède est le même : ` +
        `pnpm verification --ecrire`,
    ).toBe(true);
  });

  it("inspecte réellement un document, et un document nourri", () => {
    // Une garde qui compare deux chaînes vides passe. Ces bornes-ci ne sont pas
    // des comptes du référentiel : ce sont des ordres de grandeur qui ne
    // bougent pas quand un article s'ajoute, et qui s'effondrent si le fichier
    // est vidé ou si le rendu cesse de rendre les tableaux.
    const doc = documentCommite();
    expect(doc.length).toBeGreaterThan(10_000);
    expect(doc.split("\n").filter((l) => l.startsWith("| ")).length).toBeGreaterThan(
      100,
    );
    expect(doc).toContain("pnpm verification --ecrire");
  });

  it("attrape un chiffre retouché à la main", () => {
    // La contre-épreuve. On injecte exactement la faute que la garde prétend
    // interdire : un compte modifié dans le Markdown, sans que les données
    // aient bougé. Si elle passait, la garde serait une décoration.
    const doc = documentCommite();
    const truque = doc.replace(/\| (\d+) \|/, (_, n) => `| ${Number(n) + 1} |`);
    expect(truque).not.toBe(doc);
    expect(truque).not.toBe(rendreEtatVerification(dateDuDocument(doc)));
  });

  it("porte la version du référentiel qu'il décrit", () => {
    // La date seule ne suffirait pas : deux versions du référentiel peuvent
    // naître le même jour — elles se numérotent « 2026-08-31.4 » précisément
    // pour ça.
    const doc = documentCommite();
    expect(doc).toContain("**Référentiel** :");
    expect(dateDuDocument(doc)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

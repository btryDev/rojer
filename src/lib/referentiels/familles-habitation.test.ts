// La nomenclature des familles d'habitation, tenue à sa source.
//
// ─────────────────────────────────────────────────────────────────────────────
// CE QUE CE FICHIER ÉTABLIT
// ─────────────────────────────────────────────────────────────────────────────
//
// **La liste est juste, et la source aussi.** L'article 3 de l'arrêté du
// 31 janvier 1986 écrit quatre familles dont la troisième se subdivise en A et
// B ; le modèle porte exactement ces cinq valeurs. Aucun écart, dans aucun des
// deux sens. C'est la seule des trois listes ouvertes le 2026-09-03 dont la
// source présumée était la bonne ET le contenu exact — `TypeErp` avait perdu un
// type, `ClasseIgh` trois classes, et les catégories d'ERP étaient attribuées
// au mauvais texte.
//
// La garde se pose quand même, et pour une raison précise : `FamilleHabitation`
// a été posée le 2026-09-01 AVANT que l'arrêté n'ait jamais été ouvert dans ce
// dépôt. Elle était juste par chance, ou par mémoire fidèle ; elle n'était pas
// juste par construction. Sans garde, la prochaine main qui y touche
// recommence.
//
// ─────────────────────────────────────────────────────────────────────────────
// LE PIÈGE DE CET ARTICLE, ET C'EST LUI QUI DICTE LA FORME DU PARSEUR
// ─────────────────────────────────────────────────────────────────────────────
//
// **L'article 3 compte CINQ points numérotés et QUATRE familles.** Son 5° est
// intitulé « Duplex et triplex » : c'est une règle de comptage des niveaux pour
// le classement des trois premières familles, pas une cinquième famille. Un
// parseur qui lirait les « N° » — la forme la plus évidente — en fabriquerait
// une, et le modèle gagnerait un membre que le texte n'écrit pas. Un membre de
// trop n'est pas moins grave qu'un manquant : il ouvre au dirigeant une case
// que le règlement ne connaît pas.
//
// **La troisième famille n'est pas une valeur, ses deux branches le sont.** Le
// texte l'écrit lui-même : « Troisième famille : Habitations dont le plancher
// bas […] est situé à vingt-huit mètres au plus […], PARMI LESQUELLES ON
// DISTINGUE : Troisième famille A […] Troisième famille B ». La troisième est
// un en-tête de groupe, comme « a) Etablissements installés dans un bâtiment »
// l'est dans `GN 1`. Le parseur retient les FEUILLES : une famille dont le
// texte écrit des subdivisions n'est pas elle-même un membre.
//
// Ces deux règles se lisent dans le texte, elles ne sont pas des exceptions
// ajoutées pour faire coller la liste au modèle. C'est la différence entre
// dériver et recopier.
//
// ─────────────────────────────────────────────────────────────────────────────
// POURQUOI CE N'EST PAS UNE LISTE EXHAUSTIVE RECOPIÉE
// ─────────────────────────────────────────────────────────────────────────────
//
// Écrire `expect(FAMILLES_HABITATION).toEqual(["PREMIERE", …])` serait une
// sixième copie, réparable au copier-coller depuis la cinquième. La référence
// est DÉRIVÉE du verbatim de l'article 3 dépouillé au corpus
// (`corpus/arrete-1986-habitation.ts`), en lisant les en-têtes de famille.
//
// Le passage de « Troisième famille A » à `TROISIEME_A` est une
// translittération d'une ligne — majuscules, accents retirés, la lettre de
// branche suffixée. Pas une table de correspondance : une table serait la copie
// déguisée qu'on cherche à éviter, et elle n'attraperait jamais une famille
// nouvelle. Celle-ci, si — une « Cinquième famille » au texte sortirait
// `CINQUIEME`, absente du modèle, et le test tomberait en la nommant.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CORPUS, type ArticleDepouille } from "./corpus";
import { FAMILLES_HABITATION } from "./types-communs";
import { etablissementCreationSchema } from "@/lib/etablissements/schema";
import { onboardingSchema } from "@/lib/onboarding/schema";

/** L'entrée de corpus qui porte la nomenclature. */
function article3(): ArticleDepouille {
  const trouves = CORPUS.flatMap((c) =>
    c.articles.filter((a) => a.ref === "Arrêté 1986-01-31 art. 3"),
  );
  expect(
    trouves.length,
    "`Arrêté 1986-01-31 art. 3` doit être dépouillé une fois et une seule dans " +
      "`CORPUS` : c'est l'article qui porte la nomenclature des familles " +
      "d'habitation, et toute cette garde en dépend.",
  ).toBe(1);
  return trouves[0];
}

/** « Troisième famille A » → `TROISIEME_A`. Translittération, pas table. */
function cleDeFamille(ordinal: string, branche: string | undefined): string {
  const sansAccent = ordinal
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  return branche ? `${sansAccent}_${branche}` : sansAccent;
}

/**
 * Les familles que le TEXTE écrit, extraites de son verbatim.
 *
 * L'article pose une ligne par en-tête : « 1° Première famille : », « Troisième
 * famille A : habitations répondant à… ». Les phrases qui mentionnent une
 * famille au fil du texte — « les bâtiments classés en troisième famille B » —
 * ne commencent pas la ligne et ne matchent pas. Le « 5° Duplex et triplex. »
 * ne porte pas le mot « famille » et ne matche pas non plus, ce que le test de
 * contre-épreuve vérifie explicitement.
 *
 * Les feuilles seules sont retenues : un ordinal dont le texte écrit aussi des
 * branches (A, B) est un en-tête de groupe, pas une valeur.
 */
function famillesEcritesParArticle3(
  verbatim = article3().citationCle ?? "",
): { cle: string; rang: number; branche?: string }[] {
  const RANGS: Record<string, number> = {
    PREMIERE: 1,
    DEUXIEME: 2,
    TROISIEME: 3,
    QUATRIEME: 4,
    CINQUIEME: 5,
    SIXIEME: 6,
  };

  const lues = verbatim
    .split("\n")
    .map((l) => l.trim())
    .flatMap((ligne) => {
      const m = /^(?:\d+°\s*)?([A-ZÀ-Ý][a-zà-ÿ]+)\s+famille(?:\s+([AB]))?\s*:/.exec(
        ligne,
      );
      if (!m) return [];
      const ordinal = cleDeFamille(m[1], m[2]);
      return [{ ordinal: cleDeFamille(m[1], undefined), branche: m[2], cle: ordinal }];
    });

  // Une famille subdivisée est un en-tête, pas une valeur : le texte le dit —
  // « parmi lesquelles on distingue ». On retire donc l'ordinal nu dès qu'une
  // de ses branches figure au texte.
  const subdivises = new Set(
    lues.filter((f) => f.branche).map((f) => f.ordinal),
  );
  return lues
    .filter((f) => f.branche || !subdivises.has(f.ordinal))
    .map((f) => ({
      cle: f.cle,
      // Le rang est INCONNU (0) pour un ordinal que la table ci-dessus n'a pas.
      // Une famille inattendue au texte doit ressortir, pas être ignorée.
      rang: RANGS[f.ordinal] ?? 0,
      branche: f.branche,
    }));
}

/** Les valeurs de l'énumération Prisma, lues dans le fichier de schéma. */
function enumPrismaFamilleHabitation(): string[] {
  const schema = readFileSync(
    path.join(process.cwd(), "prisma", "schema.prisma"),
    "utf8",
  );
  const bloc = /enum FamilleHabitation \{([^}]*)\}/.exec(schema);
  expect(
    bloc,
    "`enum FamilleHabitation` introuvable dans prisma/schema.prisma",
  ).not.toBeNull();
  return bloc![1]
    .split("\n")
    .map((l) => l.split("//")[0].trim())
    .filter((l) => l.length > 0);
}

/** L'écart entre deux listes, dans les deux sens. Une valeur de trop est un défaut. */
function ecart(
  attendus: readonly string[],
  declares: readonly string[],
): { manquants: string[]; enTrop: string[] } {
  return {
    manquants: attendus.filter((t) => !declares.includes(t)),
    enTrop: declares.filter((t) => !attendus.includes(t)),
  };
}

function messageEcart(quoi: string, e: ReturnType<typeof ecart>): string {
  return (
    `${quoi} ne dit pas la même chose que l'article 3 de l'arrêté du ` +
    `31 janvier 1986.\n` +
    (e.manquants.length
      ? `MANQUE(NT) : ${e.manquants.join(", ")} — le texte les écrit, la ` +
        `déclaration non. Un propriétaire de ce type d'immeuble ne peut pas se ` +
        `déclarer pour ce qu'il est.\n`
      : "") +
    (e.enTrop.length
      ? `EN TROP : ${e.enTrop.join(", ")} — la déclaration les écrit, le texte ` +
        `non. Attention au 5° de l'article : « Duplex et triplex » est une ` +
        `règle de comptage des niveaux, PAS une cinquième famille.\n`
      : "") +
    `La liste attendue est DÉRIVÉE du verbatim de l'article 3 dépouillé au ` +
    `corpus (\`corpus/arrete-1986-habitation.ts\`). Elle ne se répare pas en ` +
    `recopiant une autre déclaration : soit celle-ci s'écarte du texte et se ` +
    `corrige, soit le relevé est faux et il faut rouvrir Légifrance.`
  );
}

describe("familles d'habitation — la liste du modèle est celle de l'article 3", () => {
  it("le verbatim de l'article 3 porte bien une nomenclature, et le parseur la voit", () => {
    // CONTRE-ÉPREUVE DU PRÉDICAT, avant toute comparaison. Un parseur qui ne
    // trouverait jamais rien laisserait les tests suivants comparer deux listes
    // vides et passer pour une garantie.
    const lues = famillesEcritesParArticle3();
    expect(lues.length).toBeGreaterThan(3);
    // Chaque famille lue est un ordinal connu : un rang à 0 signalerait un
    // en-tête que la lecture n'a pas su situer, donc un texte qui a changé.
    for (const f of lues) expect(f.rang, f.cle).toBeGreaterThan(0);

    // LE 5° NE DOIT PAS ENTRER. C'est le piège de cet article : cinq points
    // numérotés, quatre familles. Si un jour le parseur se met à lire les
    // numéros, cette assertion tombe avant que le modèle ne gagne une famille
    // fantôme.
    expect(article3().citationCle).toContain("5° Duplex et triplex.");
    expect(lues.map((f) => f.rang)).not.toContain(5);

    // LA TROISIÈME NUE NON PLUS : le texte la subdivise, ce sont ses branches
    // qui sont les valeurs.
    expect(lues.map((f) => f.cle)).not.toContain("TROISIEME");
    expect(lues.map((f) => f.cle)).toContain("TROISIEME_A");

    // Le parseur suit le TEXTE, et on le prouve en le lui changeant. Sans cette
    // épreuve, un `citationCle` que personne ne lit deviendrait de l'ornement.
    const ampute = (article3().citationCle ?? "").replace(
      /^2° Deuxième famille :\n/m,
      "",
    );
    expect(famillesEcritesParArticle3(ampute).map((f) => f.cle)).not.toContain(
      "DEUXIEME",
    );
    const gonfle = (article3().citationCle ?? "").replace(
      "5° Duplex et triplex.\n",
      "5° Cinquième famille : habitations inventées de toutes pièces.\n",
    );
    expect(famillesEcritesParArticle3(gonfle).map((f) => f.cle)).toContain(
      "CINQUIEME",
    );
  });

  it("l'énumération Prisma `FamilleHabitation` porte exactement les familles du texte", () => {
    // La déclaration qui contraint la base : une valeur absente de
    // l'énumération PostgreSQL rend la donnée insaisissable quoi qu'en dise le
    // TypeScript.
    const e = ecart(
      famillesEcritesParArticle3().map((f) => f.cle),
      enumPrismaFamilleHabitation(),
    );
    expect(
      e,
      messageEcart("`enum FamilleHabitation` (prisma/schema.prisma)", e),
    ).toEqual({ manquants: [], enTrop: [] });
  });

  it("`FAMILLES_HABITATION` (référentiel) porte exactement les familles du texte", () => {
    const e = ecart(
      famillesEcritesParArticle3().map((f) => f.cle),
      FAMILLES_HABITATION,
    );
    expect(
      e,
      messageEcart(
        "`FAMILLES_HABITATION` (src/lib/referentiels/types-communs.ts)",
        e,
      ),
    ).toEqual({ manquants: [], enTrop: [] });
  });

  it("aucune famille ne peut plus être écrite — pas même une famille valide", () => {
    // TROIS TESTS ONT ÉTÉ REMPLACÉS PAR CELUI-CI LE 2026-09-03, et il faut
    // dire ce qu'ils gardaient avant de dire pourquoi ils partent.
    //
    // Ils confrontaient au verbatim de l'article 3 les deux DÉCLARATIONS de
    // saisie — la liste Zod, par laquelle une famille absente devient
    // insaisissable, et la grille d'onboarding — puis vérifiaient que chaque
    // libellé porte le RANG et la BRANCHE (« 3e famille B »), seule forme sous
    // laquelle un propriétaire reconnaît la ligne que son syndic lui a donnée.
    // Ils étaient justes, et ils sont passés au vert le 2026-09-03 : la liste
    // était bonne, la source était bonne.
    //
    // LA QUESTION A ÉTÉ RETIRÉE DU PRODUIT LE MÊME JOUR, pour une raison
    // qu'aucun de ces trois tests ne pouvait voir : la famille est juste, et
    // elle ne décide de rien. L'arrêté du 31 janvier 1986 a été dépouillé —
    // son unique obligation périodique, l'article 101, vise « le
    // propriétaire » sans mentionner de famille ; les familles gouvernent la
    // construction (art. 97, 98). Un test qui vérifie qu'une liste est fidèle
    // à son texte ne peut pas répondre à « cette liste sert-elle à quelque
    // chose ».
    //
    // CE QUI EST GARDÉ ICI À LEUR PLACE : que la famille ne puisse plus être
    // écrite du tout. Vérifié par le comportement, non par une lecture de
    // texte — un champ que Zod ne déclare pas est retiré de l'objet validé et
    // n'atteint jamais Prisma. Les deux comparaisons qui restent vivantes plus
    // haut portent sur ce qui existe encore : l'énumération PostgreSQL et son
    // reflet `FAMILLES_HABITATION` de `types-communs.ts`, tous deux confrontés
    // au verbatim de l'article 3.
    const regime = {
      effectifSurSite: 4,
      effectifEntreprise: 4,
      estEtablissementTravail: true,
      estERP: false,
      estIGH: false,
      estHabitation: true,
    };
    for (const [ou, schema, identite] of [
      [
        "`etablissementCreationSchema`",
        etablissementCreationSchema,
        {
          raisonDisplay: "Syndic Témoin",
          adresse: "3 rue des Lilas, 75020 Paris",
        },
      ],
      [
        "`onboardingSchema`",
        onboardingSchema,
        {
          raisonSociale: "Syndic Témoin",
          adresse: "3 rue des Lilas, 75020 Paris",
          codeNaf: "68.32A",
        },
      ],
    ] as const) {
      const dossier = { ...identite, ...regime };
      // Une famille PARFAITEMENT VALIDE au regard de l'article 3, et elle ne
      // passe pas : ce n'est pas une liste qu'on a resserrée, c'est une
      // question qu'on ne pose plus.
      const res = schema.safeParse({
        ...dossier,
        familleHabitation: "TROISIEME_B",
      });
      expect(res.success, `${ou} refuse le dossier temoin`).toBe(true);
      if (!res.success) continue;
      expect(
        Object.prototype.hasOwnProperty.call(res.data, "familleHabitation"),
        `${ou} laisse passer une famille d'habitation. La question a été ` +
          `retirée du produit le 2026-09-03 ; si une surface la repose, elle ` +
          `doit revenir avec l'obligation qui la justifie, et les trois tests ` +
          `de libellés sont à reprendre dans l'historique de ce fichier — pas ` +
          `à réinventer. Voir corpus/arrete-1986-habitation.ts.`,
      ).toBe(false);
    }

    // ET LA CONTRE-ÉPREUVE, sans laquelle ce test passerait même si les
    // schémas refusaient tout : un dossier d'habitation SANS famille est
    // accepté à la création, ce qui était impossible entre le 2026-09-01 et
    // ce jour.
    expect(
      etablissementCreationSchema.safeParse({
        raisonDisplay: "Syndic Témoin",
        adresse: "3 rue des Lilas, 75020 Paris",
        ...regime,
      }).success,
    ).toBe(true);
  });
});

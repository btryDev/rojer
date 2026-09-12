import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  echeancesAnnoncables,
  porteeBatiment,
  toutesLesConditions,
  urgenceSeule,
} from "./portee";

/**
 * Le défaut que ce fichier verrouille ne casse rien, et c'est ce qui le rend
 * dangereux.
 *
 * Depuis que `Verification.equipementId` peut être `null` (ADR-022), un `where`
 * de la forme `{ equipement: { … } }` est une **jointure interne** : Prisma la
 * traduit par un `INNER JOIN`, et toute ligne portée par l'établissement en
 * disparaît. Sans erreur de compilation, sans exception, sans ligne rouge —
 * l'échéance cesse simplement d'être affichée sous un filtre par bâtiment.
 *
 * C'est exactement ce que l'ADR-010 et l'ADR-019 interdisent : « les masquer
 * ferait mentir le calendrier par omission ». Et c'est le motif que tout ce
 * chantier existe pour supprimer — le reproduire ailleurs en le corrigeant ici
 * serait le pire des résultats.
 *
 * `tsc` ne peut rien pour nous : le code est parfaitement typé. Il faut donc
 * lire le source.
 */

// Trois niveaux : ce fichier vit dans `src/lib/calendrier/`.
const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/** Les sites qui ont le droit de joindre en interne, avec la raison. */
const DEROGATIONS: { fichier: string; raison: string }[] = [
  {
    fichier: "lib/batiments/queries.ts",
    raison:
      "Répartit la charge PAR bâtiment, au lieu de lister sous un filtre. Une échéance d'établissement n'est dans aucun bâtiment : la compter dans chacun gonflerait autant de pastilles qu'il y a de corps, dans un seul serait arbitraire. Elle reste lisible au calendrier, étiquetée « Tout l'établissement ».",
  },
  {
    fichier: "lib/calendrier/portee.ts",
    raison:
      "C'est la fonction qui porte la règle : elle cite la forme fautive dans sa documentation et la produit corrigée.",
  },
];

function fichiersSource(dir: string, acc: string[] = []): string[] {
  for (const nom of readdirSync(dir)) {
    if (nom === "node_modules" || nom === ".next") continue;
    const chemin = join(dir, nom);
    if (statSync(chemin).isDirectory()) fichiersSource(chemin, acc);
    else if (/\.tsx?$/.test(nom) && !/\.test\.tsx?$/.test(nom)) acc.push(chemin);
  }
  return acc;
}

describe("portée d'une échéance sans équipement (ADR-022)", () => {
  it("une échéance sans équipement passe le filtre par bâtiment", () => {
    const where = porteeBatiment("bat-1");
    // La forme exacte compte : un `OR` dont la première branche accepte
    // `equipementId: null`. C'est elle qui empêche l'INNER JOIN.
    expect(where).toEqual({
      OR: [{ equipementId: null }, { equipement: { batimentId: "bat-1" } }],
    });
  });

  it("sans bâtiment demandé, le filtre ne contraint rien", () => {
    // Rendre `{}` permet de s'étaler dans un `where` sans condition à
    // l'appel — c'est ce qui rend l'usage systématique praticable.
    expect(porteeBatiment(undefined)).toEqual({});
  });

  it("aucun `where` ne filtre les vérifications par une jointure interne", () => {
    const fautifs: string[] = [];

    for (const chemin of fichiersSource(join(RACINE, "src"))) {
      const rel = relative(RACINE, chemin).replace(/^src\//, "");
      if (DEROGATIONS.some((d) => d.fichier === rel)) continue;

      const source = readFileSync(chemin, "utf8");
      // On ne cherche que les filtres — `batimentId` ou `actif` sous une clé
      // `equipement:`. Un `select`/`include` de la relation est légitime : il
      // ne restreint pas la sélection, et `tsc` force alors la garde `?.`.
      const filtres = source.match(
        /equipement:\s*\{\s*(batimentId|actif)\b[^}]*\}/g,
      );
      if (filtres) fautifs.push(`${rel} → ${filtres.join(" , ")}`);
    }

    expect(
      fautifs,
      "Un filtre `equipement: { … }` sur des vérifications est une jointure interne : il exclut en silence les échéances portées par l'établissement (ADR-022), ce qu'interdisent l'ADR-010 et l'ADR-019. Utilisez `porteeBatiment()` — ou, si l'exclusion est voulue, ajoutez le fichier à `DEROGATIONS` avec sa raison.",
    ).toEqual([]);
  });

  it("chaque dérogation dit pourquoi, et son fichier existe", () => {
    // Une dérogation dont le fichier a disparu est une permission qui traîne.
    for (const { fichier, raison } of DEROGATIONS) {
      expect(() => statSync(join(RACINE, "src", fichier)), fichier).not.toThrow();
      expect(raison.length, fichier).toBeGreaterThan(80);
    }
  });
});

/**
 * Le second défaut de ce module ne vit pas dans une condition, mais dans leur
 * **composition** — et c'est pourquoi le balayage de forme ci-dessus ne
 * pouvait pas le voir. `porteeBatiment` était correcte, la condition d'urgence
 * était correcte, et les diffuser dans le même littéral en faisait disparaître
 * une : les deux posent la clé `OR`, la dernière écrasait la première.
 *
 * L'effet à l'écran était le motif que tout ce module existe pour supprimer.
 * Sous « Bâtiment A » + « en retard seulement », l'en-tête comptait sur le
 * bâtiment (`compterEtatCalendrier` n'a pas de condition d'urgence, donc pas
 * de collision) pendant que la liste dessous listait l'établissement entier.
 * Deux nombres contradictoires sur un même écran, aucun marqué faux.
 *
 * On vérifie donc l'objet composé, pas le texte du source.
 */
describe("toutesLesConditions", () => {
  const DEBUT = new Date("2026-08-31T00:00:00.000Z");

  it("garde la portée par bâtiment quand l'urgence pose elle aussi un `OR`", () => {
    const where = toutesLesConditions(
      { etablissementId: "e1" },
      porteeBatiment("b1"),
      urgenceSeule(DEBUT),
    );

    // La condition de bâtiment doit être **retrouvable** dans le résultat.
    // C'est l'assertion qui tombe quand on revient à la diffusion : la clé
    // `OR` de `urgenceSeule` remplace alors celle de `porteeBatiment`, et
    // `batimentId` disparaît entièrement de l'objet transmis à Prisma.
    expect(JSON.stringify(where)).toContain("batimentId");

    // Et l'urgence est là aussi : le correctif ne doit pas troquer un
    // écrasement contre l'autre.
    expect(JSON.stringify(where)).toContain("depassee");
  });

  it("ne perd aucune clé, quelle que soit la condition qui la porte", () => {
    // La garantie énoncée en général, pour qu'une quatrième condition ajoutée
    // demain soit couverte sans qu'on y pense.
    const conditions = [
      { etablissementId: "e1" },
      porteeBatiment("b1"),
      urgenceSeule(DEBUT),
      { datePrevue: { lte: DEBUT } },
    ];
    const rendu = JSON.stringify(toutesLesConditions(...conditions));

    for (const c of conditions) {
      const morceau = JSON.stringify(c);
      expect(rendu, `perdue : ${morceau}`).toContain(morceau.slice(1, -1));
    }
  });

  it("reste lisible : une condition seule n'est pas emballée dans un `AND`", () => {
    expect(toutesLesConditions({ etablissementId: "e1" })).toEqual({
      etablissementId: "e1",
    });
    // Les conditions vides s'effacent — `porteeBatiment(undefined)` rend `{}`.
    expect(
      toutesLesConditions({ etablissementId: "e1" }, porteeBatiment(undefined)),
    ).toEqual({ etablissementId: "e1" });
    expect(toutesLesConditions()).toEqual({});
  });

  it("aucun appelant ne diffuse `porteeBatiment` dans un littéral", () => {
    // La garantie structurelle : tant que la portée passe par le composeur,
    // la collision de clés ne peut pas revenir — y compris sur les sites qui
    // n'y échappaient que par accident, parce que leur condition d'urgence
    // portait `statut` et non `OR`.
    const fautifs: string[] = [];
    for (const chemin of fichiersSource(join(RACINE, "src"))) {
      const rel = relative(RACINE, chemin).replace(/^src\//, "");
      if (rel.startsWith("lib/calendrier/portee")) continue;
      if (/\.\.\.\s*porteeBatiment\s*\(/.test(readFileSync(chemin, "utf8"))) {
        fautifs.push(rel);
      }
    }

    expect(
      fautifs,
      "`porteeBatiment` pose une clé `OR`. La diffuser dans un littéral qui en porte une autre l'écrase en silence. Composez avec `toutesLesConditions(...)`.",
    ).toEqual([]);
  });
});

describe("echeancesAnnoncables", () => {
  it("écarte les lignes éteintes, dont le statut reste gelé", () => {
    // Le compte à rebours de la page d'établissement annonçait « Prochaine
    // échéance — Ne s'applique plus … » : une ligne archivée garde son statut
    // (souvent `depassee`), passe donc le filtre de statut, et sa date étant la
    // plus ancienne, le tri croissant la met EN TÊTE. Elle consommait une des
    // cinq places. La clause vivait dans la page, où aucun test ne l'atteignait.
    expect(echeancesAnnoncables().archiveLe).toBeNull();
  });

  it("retient les trois statuts d'une ligne ouverte, et eux seuls", () => {
    // Pas les statuts réalisés : une obligation sans rendez-vous suivant, déjà
    // faite, n'a pas de prochaine échéance à annoncer (ADR-034).
    expect(echeancesAnnoncables().statut).toEqual({
      in: ["a_planifier", "planifiee", "depassee"],
    });
  });
});

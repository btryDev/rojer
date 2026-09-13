import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  echeanceAttendue,
  echeancesAnnoncables,
  porteeBatiment,
  toutesLesConditions,
  urgenceSeule,
} from "./portee";
import {
  estVerificationEnRetard,
  estVerificationRealisee,
} from "@/lib/dates/retard";

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
    expect(echeancesAnnoncables().AND).toContainEqual({ archiveLe: null });
  });

  it("annonce tout ce qui attend, et rien de purgé", () => {
    // Composée de la clause partagée, jamais réécrite : ce qu'elle annonce est
    // exactement ce qu'`echeanceAttendue` retient.
    expect(echeancesAnnoncables().AND).toContainEqual(echeanceAttendue());
  });
});

describe("urgenceSeule — le pendant SQL d'`estVerificationEnRetard`", () => {
  /**
   * Un évaluateur minimal de clause Prisma, sur les seules formes que
   * `urgenceSeule` emploie : `AND`, `OR`, égalité, `null`, `in`, `notIn`,
   * `lt`. Tout autre opérateur LÈVE — un opérateur ignoré serait un filtre
   * fantôme, et ce test ne mesurerait plus rien.
   */
  function evaluer(where: Record<string, unknown>, ligne: Record<string, unknown>): boolean {
    return Object.entries(where).every(([cle, attendu]) => {
      if (cle === "AND") {
        return (attendu as Record<string, unknown>[]).every((c) => evaluer(c, ligne));
      }
      if (cle === "OR") {
        return (attendu as Record<string, unknown>[]).some((c) => evaluer(c, ligne));
      }
      const valeur = ligne[cle];
      if (attendu === null) return valeur === null;
      if (typeof attendu === "object" && !(attendu instanceof Date)) {
        const f = attendu as Record<string, unknown>;
        const inconnus = Object.keys(f).filter((k) => !["in", "notIn", "lt"].includes(k));
        if (inconnus.length > 0) throw new Error(`opérateur non évalué : ${inconnus}`);
        if ("in" in f && !(f.in as unknown[]).includes(valeur)) return false;
        if ("notIn" in f && (f.notIn as unknown[]).includes(valeur)) return false;
        if ("lt" in f && !((valeur as Date).getTime() < (f.lt as Date).getTime())) return false;
        return true;
      }
      return valeur === attendu;
    });
  }

  it("dit la même chose que le prédicat, sur chaque statut × rythme × date × archivage", () => {
    // MUTATION SURVIVANTE de la relecture (2026-09-13) : la troisième branche,
    // RECOPIÉE, a pu être réduite à un seul statut réalisé sans que rien ne
    // rougisse. La clause est désormais composée ; ce test mesure l'accord.
    // Sur des lignes SANS colonne gelée : sur une rangée jamais roulée,
    // l'échéance ouverte se calcule et le SQL ne sait pas la dire — c'est le
    // sur-ensemble documenté, que `listerVerifications` repasse au prédicat.
    const NOW = new Date("2026-08-19T10:00:00.000Z");
    const DEBUT = new Date("2026-08-18T22:00:00.000Z");
    const passee = new Date("2026-08-01T00:00:00.000Z");
    const future = new Date("2026-09-30T00:00:00.000Z");
    const clause = urgenceSeule(DEBUT) as Record<string, unknown>;
    for (const statut of [
      "a_planifier",
      "planifiee",
      "depassee",
      "realisee_conforme",
      "realisee_observations",
      "realisee_ecart_majeur",
    ]) {
      for (const periodicite of ["mensuelle", "annuelle", "mise_en_service_uniquement", "autre"]) {
        for (const datePrevue of [passee, future]) {
          for (const archiveLe of [null, passee]) {
            const ligne = {
              statut,
              periodicite,
              datePrevue,
              archiveLe,
              dateRealisee: null,
              libelleObligation: "x",
            };
            expect(
              evaluer(clause, ligne),
              `${statut} × ${periodicite} × ${datePrevue === passee ? "passée" : "future"} × ${archiveLe ? "archivée" : "ouverte"}`,
            ).toBe(estVerificationEnRetard(ligne, NOW));
          }
        }
      }
    }
  });
});

describe("echeanceAttendue — le pendant SQL d'`estVerificationRealisee`", () => {
  /**
   * Évalue la clause à la main, sur sa forme exacte. Pas un second Prisma :
   * juste assez pour dire si une ligne (statut, périodicité) la passe, et
   * mesurer l'ACCORD avec le prédicat TypeScript sur toute la table des cas.
   * Le jour où l'un des deux bouge sans l'autre, une case rougit.
   */
  function passe(statut: string, periodicite: string): boolean {
    const clause = echeanceAttendue() as {
      OR: Array<{
        statut: { in: string[] };
        periodicite?: { notIn: string[] };
      }>;
    };
    return clause.OR.some(
      (b) =>
        b.statut.in.includes(statut) &&
        (b.periodicite === undefined || !b.periodicite.notIn.includes(periodicite)),
    );
  }

  it("dit la même chose que le prédicat, sur chaque statut × chaque rythme", () => {
    const statuts = [
      "a_planifier",
      "planifiee",
      "depassee",
      "realisee_conforme",
      "realisee_observations",
      "realisee_ecart_majeur",
    ];
    const rythmes = [
      "hebdomadaire",
      "mensuelle",
      "annuelle",
      "quinquennale",
      "mise_en_service_uniquement",
      "autre",
    ];
    for (const statut of statuts) {
      for (const periodicite of rythmes) {
        expect(passe(statut, periodicite), `${statut} × ${periodicite}`).toBe(
          !estVerificationRealisee({ statut, periodicite }),
        );
      }
    }
  });

  it("retient une rangée périodique gelée sur « réalisée » — le cas qui manquait", () => {
    // La rangée d'avant l'ADR-034, que le préfiltre SQL du tableau de bord
    // faisait disparaître avant même le classement (2026-09-13).
    expect(passe("realisee_conforme", "annuelle")).toBe(true);
    expect(passe("realisee_conforme", "mise_en_service_uniquement")).toBe(false);
  });
});

/**
 * Les pages serveur n'ont pas de test, et deux relectures ont montré ce que
 * ça coûte : une garantie extraite dans une fonction TESTÉE reste invisible
 * là où elle est EMPLOYÉE — retirer l'appel laissait la suite verte
 * (mutation E10, 2026-09-13). Le compilateur ne voit pas une clause en moins
 * dans un `where`. Il faut donc lire le source, comme plus haut.
 */
describe("les pages emploient bien ce que `portee.ts` leur tient", () => {
  const source = (relatif: string) =>
    readFileSync(join(RACINE, "src", "app", "etablissements", "[id]", relatif), "utf8");

  it("la page d'établissement filtre ses cinq prochaines par `echeancesAnnoncables`", () => {
    expect(source("page.tsx")).toContain("echeancesAnnoncables()");
  });

  it("et les choisit sur l'échéance OUVERTE, pas par un `take` sur la colonne", () => {
    // Relecture externe du 2026-09-13 : `orderBy datePrevue` + `take: 5`
    // laissait une rangée gelée occuper une des cinq places.
    const code = source("page.tsx")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    expect(code).toContain("prochainesVerifs: cinqProchaines(prochainesVerifs.map(");
    expect(code).toContain("datePrevue: echeanceOuverte(v),");
    expect(code).not.toMatch(/take:\s*5/);
  });

  it("la fiche de vérification lit l'extinction d'une ligne (dixième surface)", () => {
    // Elle ne lisait pas `archiveLe` : elle annonçait « À planifier », peignait
    // le statut gelé et invitait à déposer — sur la page même où mène le lien
    // « ne s'applique plus depuis le … » du registre (relecture du N4).
    //
    // SUR LE CODE, PAS SUR LES COMMENTAIRES. La première version cherchait des
    // sous-chaînes, et la mutation `etat === "archivee" && false` la laissait
    // verte : les deux chaînes survivaient, dont une dans un commentaire
    // (relecture du 2026-09-13). On retire les commentaires, et on exige les
    // instructions exactes. La garantie de fond — aucun dépôt sur une ligne
    // éteinte — est tenue côté serveur (`rapports/actions.test.ts`).
    const code = source("verifications/[verificationId]/page.tsx")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    expect(code).toContain('const archivee = etat === "archivee";');
    expect(code).toContain("const depotOuvert = !archivee;");
    expect(code).toContain("const statutJour = statutAffiche(v, aujourdhui);");
    expect(code).toContain("depotOuvert ? (");
  });
});

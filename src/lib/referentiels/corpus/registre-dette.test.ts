import { describe, expect, it } from "vitest";
import { CAUSES_BLOCAGE, type CauseBlocage } from "./types";
import { CORPUS, reservesDeLecture } from "./index";

/**
 * LE REGISTRE DE DETTE SE COMPTE (2026-09-20).
 *
 * Trois nombres, tenus à l'unité : un changement — dans un sens ou dans
 * l'autre — demande de venir ici l'écrire. Ce ne sont pas des plafonds qu'on
 * s'interdit de remonter : un dépouillement honnête TROUVE des manques, et le
 * corpus existe pour ça. Ce sont des comptes qu'on s'interdit de laisser
 * bouger EN SILENCE.
 */

const manquantes = CORPUS.flatMap((c) =>
  c.articles.flatMap((a) =>
    a.statut === "obligation_manquante" ? [{ corpus: c.id, ...a }] : [],
  ),
);

const parCause = (cause: CauseBlocage) =>
  manquantes.filter((a) => a.cause === cause);

describe("registre de dette — les obligations manquantes", () => {
  it("les « libres » sont NOMMÉES : ce que rien ne bloque s'encode au lot suivant", () => {
    // Pas « aucune » : un test qui interdit l'étiquette pousse à mal étiqueter,
    // et c'est arrivé dès le premier jour — `PE 27` était rangée `a_trancher`
    // alors que son blocage (« l'article n'écrit aucune périodicité ») est levé
    // depuis que l'ADR-026 porte cinquante états permanents sans rythme. La
    // contre-lecture l'a vu. Le test tient donc la LISTE : elle doit se vider,
    // et s'allonger coûte un geste visible.
    //
    // `R. 4222-21`, libre au matin du 2026-09-20, est encodée le soir même.
    // `PE 27`, nommée ici au soir du 2026-09-20, est encodée le lendemain
    // (§ 4 et § 5). La liste est vide ; elle doit le rester ou se justifier.
    expect(parCause("libre").map((a) => a.ref)).toEqual([]);
  });

  it("« hors de la cible, rien ne bloque » ne peut pas toucher la cible", () => {
    // Les deux champs sont indépendants partout ailleurs ; ici l'un implique
    // l'autre, et une contradiction ferait disparaître une dette de la cible
    // sous une étiquette de périmètre.
    expect(
      parCause("perimetre")
        .filter((a) => a.toucheLaCible)
        .map((a) => a.ref),
    ).toEqual([]);
  });

  it("la matrice cause × cible, tenue dans ses DEUX colonnes", () => {
    // La première écriture ne tenait que la colonne « cible » : réétiqueter une
    // dette hors cible en `perimetre` passait en silence (contre-épreuve de la
    // contre-lecture). Ce que ce test ne voit toujours pas : une permutation de
    // deux causes à l'intérieur d'une même colonne. Il tient des comptes, pas
    // la justesse d'un classement — celle-là se relit.
    const matrice = Object.fromEntries(
      CAUSES_BLOCAGE.map((c) => [
        c,
        [
          parCause(c).filter((a) => a.toucheLaCible).length,
          parCause(c).filter((a) => !a.toucheLaCible).length,
        ],
      ]),
    );
    expect(matrice).toEqual({
      //                        [cible, hors cible]
      libre: [0, 0],
      evenement: [9, 1],
      categorie_equipement: [5, 6],
      attribut_etablissement: [4, 2],
      destinataire: [5, 1],
      activite_exercee: [6, 1],
      relation_tiers: [3, 0],
      // 7 → 9 le 2026-09-21 : `R. 4431-2` ouvert, les deux manques du bruit ne
      // sont plus un texte à lire mais une donnée que le DUERP ne recueille pas.
      module: [9, 0],
      // 4 → 1 le même jour : trois lectures faites. Reste la « centrifugeuse »
      // de l'arrêté du 5 mars 1993, qui ne se tranche pas en ouvrant un article.
      texte_a_lire: [1, 0],
      // 7 → 8 : `R. 4224-3`, trouvé en l'ouvrant pour un autre.
      a_trancher: [8, 1],
      perimetre: [0, 3],
    });
    expect(manquantes.filter((a) => a.toucheLaCible).length).toBe(50);
    expect(manquantes.length).toBe(65);
  });
});

describe("registre de dette — les réserves de lecture", () => {
  it("le compte des réserves ouvertes", () => {
    // 98 → 89 le 2026-09-20 : dix réserves entièrement closes sont passées
    // dans `historique`, qui ne se compte pas (sept relevées par le lot, trois
    // par sa contre-lecture : `R. 4223-11`, `PE 33`, `GC 22`), et UNE est née —
    // celle de `R. 4222-21`, encodée ce jour-là, dont l'avis du médecin du
    // travail et du CSE reste hors du produit.
    const n = CORPUS.flatMap((c) => c.articles).filter(
      (a) => a.statut === "retenu" && a.reserve,
    ).length;
    // 89 → 90 le 2026-09-21 : `PE 27`, encodé pour ses § 4 et § 5, garde
    // dehors ses § 1, § 2, § 3 — et son § 6, que la première écriture de cette
    // réserve avait oublié (l'article a SIX paragraphes, pas cinq).
    expect(n).toBe(90);
    expect(reservesDeLecture().length).toBe(n);
  });
});

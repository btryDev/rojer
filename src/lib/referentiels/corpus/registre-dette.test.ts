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
  it("aucune n'est « libre » : ce que rien ne bloque s'encode, il ne se range pas", () => {
    // `R. 4222-21` était la seule au 2026-09-20 ; elle est encodée depuis
    // (`aeration-etablissement-consigne-utilisation`).
    expect(parCause("libre").map((a) => `${a.corpus} · ${a.ref}`)).toEqual([]);
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

  it("chaque cause du vocabulaire sert, sauf « libre »", () => {
    // Une cause sans emploi est un mot de trop dans un vocabulaire fermé.
    const inutilisees = CAUSES_BLOCAGE.filter(
      (c) => c !== "libre" && parCause(c).length === 0,
    );
    expect(inutilisees).toEqual([]);
  });

  it("le compte total, et celui qui touche la cible", () => {
    expect({
      total: manquantes.length,
      toucheLaCible: manquantes.filter((a) => a.toucheLaCible).length,
    }).toEqual({ total: 65, toucheLaCible: 42 });
  });

  it("ce que la cible attend, cause par cause — c'est la feuille de route du lot 6", () => {
    const cible = manquantes.filter((a) => a.toucheLaCible);
    const compte = Object.fromEntries(
      CAUSES_BLOCAGE.map((c) => [c, cible.filter((a) => a.cause === c).length]),
    );
    expect(compte).toEqual({
      libre: 0,
      // Onze obligations de la cible attendent la MÊME chose : une surface
      // qui dise l'événementiel sans le dater.
      evenement: 11,
      categorie_equipement: 0,
      attribut_etablissement: 2,
      destinataire: 5,
      activite_exercee: 3,
      relation_tiers: 3,
      module: 5,
      texte_a_lire: 2,
      // Onze autres n'attendent aucun code : une décision de la propriétaire.
      a_trancher: 11,
      perimetre: 0,
    });
  });
});

describe("registre de dette — les réserves de lecture", () => {
  it("le compte des réserves ouvertes", () => {
    // 98 → 91 le 2026-09-20 : sept réserves entièrement closes (« CORRIGÉ
    // LE… », « RÉSERVE LEVÉE ») sont passées dans `historique`, qui ne se
    // compte pas. Douze autres se disaient corrigées et gardaient un point
    // ouvert : elles restent des réserves, en entier.
    const n = CORPUS.flatMap((c) => c.articles).filter(
      (a) => a.statut === "retenu" && a.reserve,
    ).length;
    expect(n).toBe(91);
    expect(reservesDeLecture().length).toBe(n);
  });

  it("un `historique` ne cohabite pas avec une `reserve` sur le même article", () => {
    // S'il reste un point ouvert, tout le texte reste une réserve : le scinder
    // demande de le relire, pas de le couper.
    const doubles = CORPUS.flatMap((c) => c.articles)
      .filter((a) => a.historique && a.statut === "retenu" && a.reserve)
      .map((a) => a.ref);
    expect(doubles).toEqual([]);
  });
});

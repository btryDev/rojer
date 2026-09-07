import { describe, it, expect } from "vitest";
import {
  VERSION_HASH_PLAN_PREVENTION,
  versionDeHash,
} from "./hash-objet";

/**
 * La version portée par une empreinte, tenue par un test parce qu'elle décide
 * de ce qu'une page PUBLIQUE annonce à un tiers.
 *
 * Le 2026-09-07, la forme d'entrée du plan de prévention a gagné les cinq
 * rubriques de `R. 4512-8`. Toutes les empreintes calculées avant en changent
 * mécaniquement. Sans la règle que ce fichier tient, `/verifier/<id>` aurait
 * annoncé « Signature invalide — document modifié » sur chaque plan signé
 * avant cette date : une accusation de falsification, adressée à un inspecteur
 * ou à un assureur, fabriquée par une mise à jour du logiciel.
 *
 * Ce qui est tenu ici est la RÈGLE, pas la liste des versions : deux empreintes
 * de formes différentes ne se comparent pas. Elle vaudra encore à la v3.
 */
describe("version d'une empreinte de document", () => {
  const hex = "a".repeat(64);

  it("tient une empreinte sans préfixe pour la première forme", () => {
    // Les lignes écrites avant toute marque. Rendre `""` les aurait fait
    // comparer par accident avec n'importe quelle autre absence de préfixe.
    expect(versionDeHash(hex)).toBe("v1");
  });

  it("lit la version que porte une empreinte marquée", () => {
    expect(versionDeHash(`${VERSION_HASH_PLAN_PREVENTION}${hex}`)).toBe(
      VERSION_HASH_PLAN_PREVENTION,
    );
  });

  it("distingue une empreinte d'avant la marque d'une empreinte d'après", () => {
    // LE CAS QUI COMMANDE TOUT : une signature de plan antérieure au
    // 2026-09-07 face au recalcul d'aujourd'hui. Si ces deux-là se
    // comparaient, la page publique crierait à la falsification.
    const ancienne = hex;
    const recalculee = `${VERSION_HASH_PLAN_PREVENTION}${"b".repeat(64)}`;
    expect(versionDeHash(ancienne)).not.toBe(versionDeHash(recalculee));
  });

  it("ne confond pas deux empreintes de même version mais de contenu différent", () => {
    // La règle de version ne doit pas avaler la détection de modification :
    // à version égale, c'est la comparaison des empreintes qui reprend la main.
    const a = `${VERSION_HASH_PLAN_PREVENTION}${"a".repeat(64)}`;
    const b = `${VERSION_HASH_PLAN_PREVENTION}${"b".repeat(64)}`;
    expect(versionDeHash(a)).toBe(versionDeHash(b));
    expect(a).not.toBe(b);
  });

  it("porte une marque terminée par le séparateur", () => {
    // Sans le « : » final, `versionDeHash` d'une empreinte marquée rendrait
    // « v2 » quand la constante vaut « v2: » — les deux ne se compareraient
    // jamais égales, et TOUTE signature de plan basculerait en « version
    // antérieure », y compris celles écrites après le changement.
    expect(VERSION_HASH_PLAN_PREVENTION.endsWith(":")).toBe(true);
    const marquee = `${VERSION_HASH_PLAN_PREVENTION}${hex}`;
    expect(versionDeHash(marquee)).toBe(VERSION_HASH_PLAN_PREVENTION);
  });
});

import { describe, expect, it } from "vitest";
import { matchTypologie, type EtablissementMatching } from "./index";

/**
 * Les locaux à sommeil dans le moteur — arrêté du 25 juin 1980, Livre III.
 *
 * Ce que ces tests gardent tient en deux phrases, et la seconde est celle
 * qu'on oublie : **la présence de locaux à sommeil restreint quand elle est
 * connue, et ne retire rien quand elle ne l'est pas ; leur ABSENCE, elle, ne
 * s'accorde que déclarée.** C'est la règle du non-renseigné du dépôt écrite
 * pour un attribut d'établissement, et elle est à deux faces — l'incertitude
 * ne réduit jamais la couverture, ce qui veut dire à la fois « on sert quand
 * même » et « on n'allège pas ».
 *
 * Le patron est celui de `famille-habitation.test.ts`, et il l'est jusque dans
 * la méthode : chaque garantie est éprouvée dans les deux sens, le cas qui
 * doit passer ET le cas qui doit être rejeté. Un test qui n'affirme que le
 * premier se répare en supprimant la condition.
 *
 * C'est un test de MÉCANISME : il n'appelle aucune obligation réelle. Ce que
 * les quatre lignes du chapitre III reçoivent effectivement est vérifié dans
 * `engine.test.ts` et `faux-negatifs-ancrage.test.ts`, sur le référentiel.
 */

function etabErp5(
  over: Partial<EtablissementMatching> = {},
): EtablissementMatching {
  return {
    id: "etab-erp5",
    effectifSurSite: 3,
    effectifEntreprise: 3,
    estEtablissementTravail: true,
    estERP: true,
    estIGH: false,
    estHabitation: false,
    typeErp: "O",
    categorieErp: "N5",
    classeIgh: null,
    familleHabitation: null,
    personnesPresentesHabituellement: null,
    manipuleMatieresR422722: null,
    comporteLocauxSommeilPublic: null,
    ...over,
  };
}

describe("obligation exigeant des locaux à sommeil (`locauxSommeilPublic: true`)", () => {
  const typologie = {
    erp: { categories: ["N5" as const] },
    locauxSommeilPublic: true,
  };

  it("retient l'obligation quand le dirigeant a répondu « oui »", () => {
    const r = matchTypologie(
      typologie,
      etabErp5({ comporteLocauxSommeilPublic: true }),
    );
    expect(r.ok).toBe(true);
    expect(r.ok && r.raisons.join(" ")).toContain(
      "locaux à sommeil pour le public déclarés",
    );
  });

  it("écarte l'obligation quand le dirigeant a répondu « non »", () => {
    const r = matchTypologie(
      typologie,
      etabErp5({ comporteLocauxSommeilPublic: false }),
    );
    expect(r.ok).toBe(false);
  });

  it("n'écarte rien quand personne n'a répondu, et le dit", () => {
    const r = matchTypologie(
      typologie,
      etabErp5({ comporteLocauxSommeilPublic: null }),
    );
    expect(r.ok).toBe(true);
    // La raison est lue par un dirigeant, sous « pourquoi chez vous » : elle
    // doit dire que la ligne est servie faute de savoir, pas la présenter
    // comme établie.
    expect(r.ok && r.raisons.join(" ")).toContain("à confirmer");
  });

  it("ne dit pas « à confirmer » quand la réponse est là", () => {
    // Le miroir du test précédent, et il compte : une raison qui dirait « à
    // confirmer » sur un fait confirmé userait la mention jusqu'à ce que plus
    // personne ne la lise.
    const r = matchTypologie(
      typologie,
      etabErp5({ comporteLocauxSommeilPublic: true }),
    );
    expect(r.ok && r.raisons.join(" ")).not.toContain("à confirmer");
  });
});

describe("allègement réservé à l'absence de locaux à sommeil (`locauxSommeilPublic: false`)", () => {
  /**
   * L'autre face de la même règle, et celle qui n'a pas encore d'obligation
   * pour l'employer. Elle existe parce que PE 2 § 3 la réclamera : il réduit
   * le régime des établissements « ne comportant pas de locaux à sommeil » qui
   * reçoivent au plus 19 personnes.
   *
   * Un allègement ne se donne JAMAIS sur une absence supposée. C'est le seul
   * endroit du moteur où le silence rejette au lieu de retenir, et ce n'est
   * pas une exception à la règle du non-renseigné : c'est la règle, vue depuis
   * l'autre bout. Dans les deux cas, le silence ne réduit pas la couverture.
   */
  const typologie = {
    erp: { categories: ["N5" as const] },
    locauxSommeilPublic: false,
  };

  it("accorde l'allègement quand l'absence est déclarée", () => {
    const r = matchTypologie(
      typologie,
      etabErp5({ comporteLocauxSommeilPublic: false }),
    );
    expect(r.ok).toBe(true);
    expect(r.ok && r.raisons.join(" ")).toContain(
      "absence de locaux à sommeil pour le public déclarée",
    );
  });

  it("refuse l'allègement à l'établissement qui a des locaux à sommeil", () => {
    const r = matchTypologie(
      typologie,
      etabErp5({ comporteLocauxSommeilPublic: true }),
    );
    expect(r.ok).toBe(false);
  });

  it("refuse l'allègement tant que personne n'a répondu", () => {
    // LE TEST QUI PORTE TOUT CE BLOC. Le silence ne vaut pas absence. Traiter
    // `null` comme « non » ici allègerait le régime de tous les dossiers muets
    // — l'exact inverse de ce que le même `null` produit sur la face `true`.
    const r = matchTypologie(
      typologie,
      etabErp5({ comporteLocauxSommeilPublic: null }),
    );
    expect(r.ok).toBe(false);
  });
});

describe("le critère est en ET, ce n'est pas un régime", () => {
  it("ne fait entrer personne dans le champ : un non-ERP reste dehors", () => {
    // Si le critère avait été rangé dans la disjonction des régimes, un bureau
    // non-ERP déclarant des locaux à sommeil aurait satisfait la typologie par
    // cette seule branche. Il ne le doit pas : la restriction de catégorie ERP
    // reste en ET avec elle.
    const r = matchTypologie(
      { erp: { categories: ["N5"] }, locauxSommeilPublic: true },
      etabErp5({
        estERP: false,
        typeErp: null,
        categorieErp: null,
        comporteLocauxSommeilPublic: true,
      }),
    );
    expect(r.ok).toBe(false);
  });

  it("ne se contourne pas par la branche « travail »", () => {
    // Le cas d'école de la restriction de catégorie ERP, transposé : une
    // obligation qui vise « les employeurs OU les ERP de 5ᵉ » et exige des
    // locaux à sommeil ne doit pas s'appliquer à un employeur qui a répondu
    // « non », au motif qu'il emploie des salariés.
    const r = matchTypologie(
      { travail: true, erp: true, locauxSommeilPublic: true },
      etabErp5({
        estEtablissementTravail: true,
        comporteLocauxSommeilPublic: false,
      }),
    );
    expect(r.ok).toBe(false);
  });

  it("ne contraint rien quand l'obligation ne le déclare pas", () => {
    // Le critère absent doit rester parfaitement silencieux — y compris chez
    // un établissement qui a répondu. Sans ce test, une garde écrite en
    // `!== undefined` mal placée ferait tomber des obligations qui n'ont
    // jamais parlé de sommeil.
    const r = matchTypologie(
      { erp: { categories: ["N5"] } },
      etabErp5({ comporteLocauxSommeilPublic: false }),
    );
    expect(r.ok).toBe(true);
    expect(r.ok && r.raisons.join(" ")).not.toContain("sommeil");
  });
});

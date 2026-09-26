import { describe, expect, it } from "vitest";
import { matchTypologie, type EtablissementMatching } from "./index";

/**
 * La famille d'habitation dans le moteur (ADR-025 § 4).
 *
 * Ce que ces tests gardent tient en une phrase : **la famille restreint quand
 * elle est connue, et ne retire rien quand elle ne l'est pas.** C'est la seule
 * dissymétrie du moteur par rapport à la catégorie ERP, et elle est délibérée
 * — neuf obligations portent la typologie habitation depuis longtemps, aucun
 * dossier antérieur au 2026-09-01 ne porte de famille, et les écarter en
 * silence produirait des faux négatifs que personne ne pourrait voir.
 *
 * Chaque garantie est éprouvée dans les deux sens : le cas qui doit passer et
 * le cas qui doit être rejeté. Un test qui n'affirme que le premier se répare
 * en supprimant la condition.
 */

function etabHabitation(
  over: Partial<EtablissementMatching> = {},
): EtablissementMatching {
  return {
    id: "etab-hab",
    effectifSurSite: 3,
    effectifEntreprise: 3,
    estEtablissementTravail: false,
    estERP: false,
    estIGH: false,
    estHabitation: true,
    typeErp: null,
    categorieErp: null,
    classeIgh: null,
    familleHabitation: null,
    personnesPresentesHabituellement: null,
    manipuleMatieresR422722: null,
    comporteLocauxSommeilPublic: null,
    ...over,
  };
}

describe("restriction par famille d'habitation", () => {
  it("retient l'obligation quand la famille de l'immeuble est visée", () => {
    const r = matchTypologie(
      { habitation: { familles: ["TROISIEME_A"] } },
      etabHabitation({ familleHabitation: "TROISIEME_A" }),
    );
    expect(r.ok).toBe(true);
    expect(r.ok && r.raisons.join(" ")).toContain("3ᵉ famille A");
  });

  it("écarte l'obligation quand la famille de l'immeuble n'est pas visée", () => {
    const r = matchTypologie(
      { habitation: { familles: ["TROISIEME_A"] } },
      etabHabitation({ familleHabitation: "PREMIERE" }),
    );
    expect(r.ok).toBe(false);
  });

  it("n'écarte rien quand la famille n'est pas renseignée, et le dit", () => {
    const r = matchTypologie(
      { habitation: { familles: ["QUATRIEME"] } },
      etabHabitation({ familleHabitation: null }),
    );
    expect(r.ok).toBe(true);
    // La raison est lue par un dirigeant : elle doit dire que la ligne est
    // servie faute de savoir, pas la présenter comme établie.
    expect(r.ok && r.raisons.join(" ")).toContain("à confirmer");
  });

  it("laisse passer `habitation: true` sans regarder la famille", () => {
    const r = matchTypologie({ habitation: true }, etabHabitation());
    expect(r.ok).toBe(true);
    expect(r.ok && r.raisons.join(" ")).not.toContain("à confirmer");
  });

  it("n'applique rien à un établissement qui n'est pas une habitation", () => {
    const r = matchTypologie(
      { habitation: { familles: ["PREMIERE"] } },
      etabHabitation({ estHabitation: false, familleHabitation: null }),
    );
    expect(r.ok).toBe(false);
  });
});

describe("la restriction de famille ne se contourne pas par un autre régime", () => {
  // Le cas d'école de la restriction de catégorie ERP, transposé : une
  // obligation qui vise « les employeurs OU les habitations de 1ʳᵉ famille »
  // ne doit pas s'appliquer à une habitation de 4ᵉ famille au motif qu'elle
  // emploie des salariés. Sans la garde en ET, la branche `travail` suffirait
  // à la faire passer, et la restriction que le rédacteur a écrite serait
  // ignorée en silence.
  const typologie = {
    travail: true,
    habitation: { familles: ["PREMIERE" as const] },
  };

  it("écarte l'employeur dont l'immeuble est d'une autre famille", () => {
    const r = matchTypologie(
      typologie,
      etabHabitation({
        estEtablissementTravail: true,
        familleHabitation: "QUATRIEME",
      }),
    );
    expect(r.ok).toBe(false);
  });

  it("retient l'employeur dont l'immeuble est de la famille visée", () => {
    const r = matchTypologie(
      typologie,
      etabHabitation({
        estEtablissementTravail: true,
        familleHabitation: "PREMIERE",
      }),
    );
    expect(r.ok).toBe(true);
  });

  it("retient l'employeur dont la famille est inconnue — la garde en ET ne doit pas annuler la prudence", () => {
    const r = matchTypologie(
      typologie,
      etabHabitation({
        estEtablissementTravail: true,
        familleHabitation: null,
      }),
    );
    expect(r.ok).toBe(true);
  });

  it("n'impose rien à un employeur qui n'est pas une habitation", () => {
    // La restriction ne mord que sur les établissements qui relèvent du
    // régime restreint : un bureau ordinaire passe par la branche `travail`.
    const r = matchTypologie(
      typologie,
      etabHabitation({
        estEtablissementTravail: true,
        estHabitation: false,
        familleHabitation: null,
      }),
    );
    expect(r.ok).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { matchTypologie, type EtablissementMatching } from "./index";
import { obligationsConformite } from "@/lib/referentiels/conformite";

/**
 * R. 4227-26 dans le moteur (C45, 2026-09-27) — la règle du non-renseigné,
 * sans aménagement : seul un « non » DÉCLARÉ retire la ligne. Chaque sens est
 * éprouvé : le cas qui passe ET le cas rejeté — un test qui n'affirme que le
 * premier se répare en supprimant la condition.
 */

const OBLIGATION = "incendie-travail-chiffons-impregnes-recipients-clos";

function bureau(over: Partial<EtablissementMatching> = {}): EtablissementMatching {
  return {
    id: "etab-bureau",
    effectifSurSite: 4,
    effectifEntreprise: 4,
    estEtablissementTravail: true,
    estERP: false,
    estIGH: false,
    estHabitation: false,
    typeErp: null,
    categorieErp: null,
    classeIgh: null,
    familleHabitation: null,
    personnesPresentesHabituellement: null,
    manipuleMatieresR422722: null,
    comporteLocauxSommeilPublic: null,
    chiffonsImpregnes: null,
    ...over,
  };
}

const typologie = () => {
  const o = obligationsConformite.find((x) => x.id === OBLIGATION);
  if (!o) throw new Error(`${OBLIGATION} absente du référentiel`);
  return o.typologies;
};

describe("R. 4227-26 — chiffons, cotons et papiers imprégnés", () => {
  it("« oui » retient l'état permanent, et le dit", () => {
    const r = matchTypologie(typologie(), bureau({ chiffonsImpregnes: true }));
    expect(r.ok).toBe(true);
    expect(r.ok && r.raisons.join(" ")).toContain("imprégnés déclarés");
  });

  it("« non » le retire", () => {
    expect(matchTypologie(typologie(), bureau({ chiffonsImpregnes: false })).ok).toBe(false);
  });

  it("« je ne sais pas » le retient « à confirmer » — l'incertitude ne réduit rien", () => {
    const r = matchTypologie(typologie(), bureau({ chiffonsImpregnes: null }));
    expect(r.ok).toBe(true);
    expect(r.ok && r.raisons.join(" ")).toContain("à confirmer");
  });

  it("ni NAF, ni effectif, ni ERP : un bureau d'une personne le lit aussi", () => {
    const r = matchTypologie(
      typologie(),
      bureau({ effectifSurSite: 1, effectifEntreprise: 1, chiffonsImpregnes: true }),
    );
    expect(r.ok).toBe(true);
  });

  it("sans travailleur, rien : l'article est au Code du travail", () => {
    const r = matchTypologie(
      typologie(),
      bureau({ estEtablissementTravail: false, estERP: true, typeErp: "M", categorieErp: "N5", chiffonsImpregnes: true }),
    );
    expect(r.ok).toBe(false);
  });

  it("l'obligation est un état permanent d'établissement, sans rythme ni pièce", () => {
    const o = obligationsConformite.find((x) => x.id === OBLIGATION)!;
    expect(o.nature).toBe("etat_permanent");
    expect(o.periodicite).toBe("autre");
    expect(o.pieceAttendue).toBeNull();
    expect(o.porteur).toBe("etablissement");
  });
});

describe("C45, M1 — le silence d'une question à trois états se porte à côté de la ligne", () => {
  it("chiffons : silence ⇒ `sansReponse`, oui ⇒ rien", () => {
    const silence = matchTypologie(typologie(), bureau({ chiffonsImpregnes: null }));
    expect(silence.ok && silence.sansReponse).toEqual(["chiffons_impregnes"]);
    const oui = matchTypologie(typologie(), bureau({ chiffonsImpregnes: true }));
    expect(oui.ok && oui.sansReponse).toBeUndefined();
  });

  it("locaux à sommeil : silence d'un type qui pose la question ⇒ `sansReponse` ; sans type, la raison seule", () => {
    const t = { erp: { categories: ["N5" as const] }, locauxSommeilPublic: true };
    const erp = { estERP: true, categorieErp: "N5" as const, comporteLocauxSommeilPublic: null };
    const hotel = matchTypologie(t, bureau({ ...erp, typeErp: "O" }));
    expect(hotel.ok && hotel.sansReponse).toEqual(["locaux_sommeil_public"]);
    const sansType = matchTypologie(t, bureau({ ...erp, typeErp: null }));
    expect(sansType.ok).toBe(true);
    expect(sansType.ok && sansType.sansReponse).toBeUndefined();
  });
});

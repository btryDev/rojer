import { describe, expect, it } from "vitest";
import { matchTypologie, type EtablissementMatching } from "./index";
import { obligationsConformite } from "@/lib/referentiels/conformite";

/**
 * R. 4227-26 dans le moteur (C45, 2026-09-27) — ~~la règle du non-renseigné,
 * sans aménagement : seul un « non » DÉCLARÉ retire la ligne.~~ [2026-10-08 :
 * plus de question, plus de critère ; la ligne vaut pour tout lieu de travail
 * et la porte du niveau audit la tient hors du quotidien.] Chaque sens est
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
    manutentionManuelle: null,
    travailSurEcran: null,
    operationsElectriques: null,
    conduiteEngins: null,
    expositionCMR: null,
    epiPresents: null,
    ssiCategorieAouB: null,
    ...over,
  };
}

const typologie = () => {
  const o = obligationsConformite.find((x) => x.id === OBLIGATION);
  if (!o) throw new Error(`${OBLIGATION} absente du référentiel`);
  return o.typologies;
};

describe("R. 4227-26 — chiffons, cotons et papiers imprégnés", () => {
  // ~~« oui » retient, « non » retire, « je ne sais pas » retient « à
  // confirmer »~~ — 2026-10-08, décision de la propriétaire : la question est
  // retirée de toutes les surfaces et le critère du moteur avec elle. La ligne
  // (niveau audit, ADR-042) vaut pour tout lieu de travail : l'article ne pose
  // aucun seuil. Le typage ne relit plus de réponse : `chiffonsImpregnes` n'est
  // plus un champ de `EtablissementMatching`, ni un critère de typologie.
  it("la typologie ne pose que le lieu de travail — aucune question", () => {
    expect(typologie()).toEqual({ travail: true });
  });

  it("ni NAF, ni effectif, ni ERP, ni réponse : un bureau d'une personne la lit", () => {
    const r = matchTypologie(
      typologie(),
      bureau({ effectifSurSite: 1, effectifEntreprise: 1 }),
    );
    expect(r.ok).toBe(true);
    expect(r.ok && r.sansReponse).toBeUndefined();
  });

  it("sans travailleur, rien : l'article est au Code du travail", () => {
    const r = matchTypologie(
      typologie(),
      bureau({ estEtablissementTravail: false, estERP: true, typeErp: "M", categorieErp: "N5" }),
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
  // ~~« chiffons : silence ⇒ `sansReponse`, oui ⇒ rien »~~ — question retirée
  // le 2026-10-08 ; la marque `chiffons_impregnes` n'existe plus.
  // ~~« sans type, la raison seule »~~ — 2026-09-27 : sans type, la marque
  // renvoie à la question que la fiche pose bel et bien, le type d'ERP.
  it("locaux à sommeil : silence d'un type qui pose la question ⇒ `sansReponse` ; sans type, `type_erp`", () => {
    const t = { erp: { categories: ["N5" as const] }, locauxSommeilPublic: true };
    const erp = { estERP: true, categorieErp: "N5" as const, comporteLocauxSommeilPublic: null };
    const hotel = matchTypologie(t, bureau({ ...erp, typeErp: "O" }));
    expect(hotel.ok && hotel.sansReponse).toEqual(["locaux_sommeil_public"]);
    const sansType = matchTypologie(t, bureau({ ...erp, typeErp: null }));
    expect(sansType.ok).toBe(true);
    expect(sansType.ok && sansType.sansReponse).toEqual(["type_erp"]);
  });
});

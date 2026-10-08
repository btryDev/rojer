import { describe, expect, it } from "vitest";
import { obligationParId, obligationsConformite } from "./index";
import { indexArticlesParRef } from "../corpus";
import { LABEL_PERIODICITE } from "@/lib/calendrier/labels";
import { libelleRythme, RENVOIS_AUX_NORMES, renvoiAuxNormes } from "./renvoi-aux-normes";

// Revue de fidélité du 2026-10-07, correction 13 : l'habilitation électrique
// se lisait « sans rythme écrit ». Le Code renvoie le rythme aux normes ; la
// mention le dit, sans poser d'échéance ni modifier l'obligation.

describe("rythme renvoyé aux normes", () => {
  it("les mots du renvoi sont ceux du texte, mot pour mot au corpus", () => {
    const index = indexArticlesParRef();
    for (const [article, mots] of Object.entries(RENVOIS_AUX_NORMES)) {
      const lu = index.get(article);
      expect(lu, article).toBeDefined();
      expect(lu!.article.citationCle ?? "", article).toContain(mots);
    }
  });

  it("le titre d'habilitation ne la porte plus : la mention du rythme retenu la remplace (C66)", () => {
    // ~~« le titre d'habilitation la porte »~~ — 2026-10-08 : il porte le
    // rythme de la NF C 18-510 relevé par le préventeur (ADR-039 § 8).
    const o = obligationParId("elec-salarie-habilitation")!;
    expect(renvoiAuxNormes(o)).toBeNull();
    expect(libelleRythme(o)).toBe(LABEL_PERIODICITE.triennale);
    // La règle elle-même tient toujours : sans rythme retenu, le renvoi revient.
    const r = renvoiAuxNormes({ ...o, rythmeRetenu: undefined })!;
    expect(r.court).toBe("Rythme renvoyé aux normes (R. 4544-10)");
    expect(r.long).toContain("« selon les modalités contenues dans les normes mentionnées à l'article R. 4544-3 »");
  });

  it("pas ce qui cite le même article pour autre chose", () => {
    // Le carnet de prescriptions et l'obligation d'établissement citent
    // R. 4544-10 en fondement ; ce n'est pas le renouvellement d'un titre.
    // L'attestation médicale a un rythme écrit.
    for (const id of [
      "elec-travail-carnet-prescriptions",
      "elec-travail-habilitation-personnel",
      "elec-salarie-attestation-medicale-voisinage",
    ]) {
      expect(renvoiAuxNormes(obligationParId(id)!), id).toBeNull();
    }
  });

  it("borne haute : aucune obligation livrée ne la porte aujourd'hui", () => {
    // ~~une seule~~ — 2026-10-08 (C66). Pas une liste : si une obligation la
    // reçoit, ce test dit de vérifier qu'elle relève bien d'un renvoi aux
    // normes que personne n'a relevé.
    expect(obligationsConformite.filter((o) => renvoiAuxNormes(o) !== null)).toHaveLength(0);
  });

  it("ailleurs, le libellé de la périodicité effective", () => {
    const o = obligationParId("incendie-erp-extincteurs-annuelle")!;
    expect(libelleRythme(o)).toBe(LABEL_PERIODICITE.annuelle);
  });
});

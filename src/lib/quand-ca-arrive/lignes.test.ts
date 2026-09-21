import { describe, expect, it } from "vitest";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import { porteurDe } from "@/lib/referentiels/conformite/types";
import { estDeclencheeParUnFait, modeDeclaration, estSansRendezVous } from "@/lib/etats-permanents/regle";
import type { EtablissementMatching } from "@/lib/matching";
import { listerQuandCaArrive, releveDeLaPage } from "./lignes";

function etab(p: Partial<EtablissementMatching> = {}): EtablissementMatching {
  return {
    id: "etab-1",
    effectifSurSite: 6,
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
    ...p,
  } as EtablissementMatching;
}

const lignes = (e: EtablissementMatching) =>
  listerQuandCaArrive(e, []).flatMap((g) => g.lignes);

describe("« Quand ça arrive » — ce que la page présente", () => {
  it("un bureau de six salariés y trouve ce qu'un fait rend dû, et rien d'autre", () => {
    const ids = lignes(etab()).map((l) => l.obligation.id);
    expect(ids).toContain("formation-securite-etablissement-information");
    expect(ids).toContain("formation-securite-etablissement-travail-sur-ecran");
    for (const l of lignes(etab())) {
      expect(l.obligation.nature, l.obligation.id).toBe("evenementielle");
      expect(porteurDe(l.obligation), l.obligation.id).toBe("etablissement");
    }
  });

  it("chaque ligne dit son fait, et il vient du référentiel", () => {
    for (const l of lignes(etab())) {
      expect(l.fait.length, l.obligation.id).toBeGreaterThan(20);
      expect(l.fait).toBe(l.obligation.faitGenerateur);
    }
  });

  it("passe par le moteur : un immeuble d'habitation seul, sans employeur, n'y voit rien", () => {
    // La page ne liste pas le référentiel, elle liste ce qui s'APPLIQUE.
    expect(
      lignes(etab({ estEtablissementTravail: false, estHabitation: true })),
    ).toEqual([]);
  });

  it("aucune ligne de la page n'existe au calendrier ni à l'écran des états permanents", () => {
    // Trois surfaces, trois natures : une obligation montrée deux fois avec
    // deux règles d'affichage différentes finirait par se contredire.
    for (const l of lignes(etab())) {
      expect(estSansRendezVous(l.obligation.periodicite), l.obligation.id).toBe(true);
      expect(modeDeclaration(l.obligation), l.obligation.id).toBeNull();
    }
  });
});

describe("« Quand ça arrive » — ce que le référentiel lui doit", () => {
  const dUneFiche = obligationsConformite.filter((o) => estDeclencheeParUnFait(o));

  it("toute obligation que la page peut présenter porte son fait générateur", () => {
    const muettes = obligationsConformite
      .filter((o) => releveDeLaPage(o))
      .filter((o) => !o.faitGenerateur || o.faitGenerateur.trim().length < 20)
      .map((o) => o.id);
    // Une ligne sans son fait n'aurait rien à dire, et `listerQuandCaArrive`
    // la tairait : c'est ICI qu'on l'apprend, pas à l'écran.
    expect(muettes).toEqual([]);
  });

  it("la page a de quoi se montrer : au moins une obligation en relève", () => {
    expect(obligationsConformite.filter((o) => releveDeLaPage(o)).length).toBeGreaterThan(0);
  });

  it("un fait générateur n'est porté que par une obligation événementielle", () => {
    const deplaces = obligationsConformite
      .filter((o) => o.faitGenerateur !== undefined && o.nature !== "evenementielle")
      .map((o) => o.id);
    expect(deplaces).toEqual([]);
  });

  it("la page ne prend que le porteur établissement — les deux autres ont leur fiche", () => {
    for (const o of dUneFiche) {
      expect(releveDeLaPage(o), o.id).toBe(porteurDe(o) === "etablissement");
    }
  });
});

import { describe, expect, it } from "vitest";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import {
  determineObligationsApplicables,
  matchTypologie,
  type EtablissementMatching,
} from "./index";

/**
 * Sur quel nombre un seuil d'effectif se compte (C37, 2026-09-26).
 *
 * Le moteur comparait tous les seuils à `effectifSurSite` — « salariés +
 * apprentis » du site. Les textes ne comptent pas tous la même chose :
 * L. 2311-2 compte l'ENTREPRISE selon L. 1111-2, sans les apprentis
 * (L. 1111-3 1°) ; R. 4228-22/-23 décomptent « par établissement ». Chaque
 * typologie à seuil écrit donc sa maille (`effectifMaille`), et le moteur lit
 * le nombre qui lui correspond (`evaluerEffectif`).
 *
 * Ce que ces tests gardent, dans les deux sens : l'entreprise au seuil fait
 * apparaître la ligne même quand aucun site ne l'atteint ; l'entreprise sous
 * le seuil ne la retire pas quand le site l'atteint (« à confirmer ») ; la
 * restauration reste comptée sur le site. Et, en dernier, la propriété qui
 * résume la règle du produit : par rapport au moteur d'avant, rien ne
 * disparaît.
 */

function etab(
  effectifSurSite: number,
  effectifEntreprise: number,
): EtablissementMatching {
  return {
    id: "etab-effectif",
    effectifSurSite,
    effectifEntreprise,
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
  };
}

const ids = (e: EtablissementMatching) =>
  new Set(determineObligationsApplicables(e, []).map((a) => a.obligation.id));

const raisons = (e: EtablissementMatching, id: string) =>
  determineObligationsApplicables(e, [])
    .find((a) => a.obligation.id === id)
    ?.raisons.join(" | ") ?? "";

describe("maille entreprise — CSE (L. 2311-2)", () => {
  const typo = {
    travail: true,
    effectifMin: 11,
    effectifMaille: "entreprise" as const,
  };

  it("s'applique quand l'entreprise atteint onze sans qu'aucun site ne les compte", () => {
    const r = matchTypologie(typo, etab(6, 15));
    expect(r.ok).toBe(true);
    expect(r.ok && r.raisons.join(" ")).toContain(
      "effectif de l'entreprise 15, apprentis non compris",
    );
  });

  it("ne s'applique pas quand l'entreprise ET le site sont sous onze", () => {
    expect(matchTypologie(typo, etab(10, 10)).ok).toBe(false);
  });

  it("retient « à confirmer » quand l'entreprise est sous onze et le site à onze ou plus", () => {
    // Dix salariés, deux apprentis : le texte ne compte pas les apprentis,
    // mais le produit ne sait pas les distinguer d'un effectif d'entreprise
    // resté à l'ancienne valeur quand le site a grandi.
    const r = matchTypologie(typo, etab(12, 10));
    expect(r.ok).toBe(true);
    expect(r.ok && r.raisons.join(" ")).toContain("à confirmer");
  });

  it("ne dit pas « à confirmer » quand l'entreprise établit le seuil", () => {
    const r = matchTypologie(typo, etab(12, 12));
    expect(r.ok && r.raisons.join(" ")).not.toContain("à confirmer");
  });
});

describe("maille établissement — restauration (R. 4228-22/-23)", () => {
  it("un site de dix dans une entreprise de soixante lit l'emplacement, pas le local", () => {
    const vus = ids(etab(10, 60));
    expect(vus.has("locaux-etablissement-emplacement-restauration")).toBe(true);
    expect(vus.has("locaux-etablissement-local-restauration")).toBe(false);
  });

  it("un site de cinquante lit le local, quel que soit l'effectif déclaré de l'entreprise", () => {
    const vus = ids(etab(50, 10));
    expect(vus.has("locaux-etablissement-local-restauration")).toBe(true);
    expect(vus.has("locaux-etablissement-emplacement-restauration")).toBe(false);
  });
});

describe("le référentiel, pas un mécanisme de test", () => {
  it("le CSE et le règlement intérieur suivent l'effectif de l'entreprise", () => {
    const vus = ids(etab(8, 50));
    expect(vus.has("prevention-etablissement-cse")).toBe(true);
    expect(vus.has("prevention-etablissement-reglement-interieur")).toBe(true);
    expect(raisons(etab(8, 50), "prevention-etablissement-cse")).toContain(
      "effectif de l'entreprise 50",
    );
  });

  it("toute typologie qui écrit un seuil d'effectif écrit aussi sa maille", () => {
    const sansMaille = obligationsConformite
      .filter(
        (o) =>
          (o.typologies.effectifMin !== undefined ||
            o.typologies.effectifMax !== undefined) &&
          o.typologies.effectifMaille === undefined,
      )
      .map((o) => o.id);
    expect(sansMaille).toEqual([]);
  });

  it("par rapport au moteur d'avant, qui comptait le site partout, aucune ligne ne disparaît", () => {
    // Le moteur d'avant = même établissement, l'entreprise prise égale au
    // site. Pour chaque couple, ce qu'il montrait doit rester montré.
    const valeurs = [0, 1, 5, 10, 11, 12, 30, 49, 50, 60];
    const perdues: string[] = [];
    for (const site of valeurs) {
      const avant = ids(etab(site, site));
      for (const entreprise of valeurs) {
        const apres = ids(etab(site, entreprise));
        for (const id of avant) {
          if (!apres.has(id)) perdues.push(`${id} (site ${site}, entreprise ${entreprise})`);
        }
      }
    }
    expect(perdues).toEqual([]);
  });
});

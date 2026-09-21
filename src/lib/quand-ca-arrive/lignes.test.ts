import { describe, expect, it } from "vitest";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import { porteurDe } from "@/lib/referentiels/conformite/types";
import { estDeclencheeParUnFait, modeDeclaration, estSansRendezVous } from "@/lib/etats-permanents/regle";
import type { EtablissementMatching } from "@/lib/matching";
import type { ObligationApplicable } from "@/lib/matching";
import { lignesDepuis, listerQuandCaArrive, releveDeLaPage } from "./lignes";

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
    // Depuis le 2026-09-21, tout employeur y lit aussi ce qu'un épisode de
    // chaleur intense rend dû (R. 4463-4, -5, -7).
    expect(ids).toContain("prevention-etablissement-chaleur-eau-fraiche");
    expect(ids).toContain("sante-travail-etablissement-examen-de-reprise");
    for (const l of lignes(etab())) {
      expect(l.obligation.nature, l.obligation.id).toBe("evenementielle");
      expect(porteurDe(l.obligation), l.obligation.id).toBe("etablissement");
    }
  });

  it("cite l'article qui DIT le fait, pas seulement le fondateur", () => {
    // « lors de l'embauche et chaque fois que nécessaire » est de R. 4141-2,
    // troisième référence d'une obligation fondée sur L. 4141-1.
    const info = lignes(etab()).find(
      (l) => l.obligation.id === "formation-securite-etablissement-information",
    );
    expect(info?.articles).toContain("R. 4141-2");
    expect(info?.articles[0]).toBe("L. 4141-1");
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

describe("« Quand ça arrive » — le filtre, éprouvé sur ce que le référentiel ne contient pas encore", () => {
  // `faitGenerateur` est LICITE sur une obligation de salarié ou d'appareil
  // (les fiches pourront s'en servir). Le jour où l'une en porte un, seul le
  // filtre de porteur garde la page propre — et aucune obligation réelle ne
  // permet de l'éprouver aujourd'hui. On lui en fabrique donc une.
  const base = obligationsConformite.find(
    (o) => o.id === "froid-controle-etancheite-apres-modification",
  )!;
  const dAppareilAvecUnFait = {
    obligation: { ...base, faitGenerateur: "Après toute modification du circuit frigorifique" },
    raisons: [],
    equipementsConcernes: [],
  } as unknown as ObligationApplicable;

  it("le prédicat de nature la reconnaît — c'est bien le porteur qui l'écarte", () => {
    expect(estDeclencheeParUnFait(dAppareilAvecUnFait.obligation)).toBe(true);
    expect(porteurDe(dAppareilAvecUnFait.obligation)).toBe("equipement");
  });

  it("une obligation d'APPAREIL portant un fait n'entre pas sur la page", () => {
    expect(lignesDepuis([dAppareilAvecUnFait])).toEqual([]);
  });

  it("une obligation d'établissement SANS son fait n'y entre pas non plus, plutôt qu'à moitié", () => {
    const info = obligationsConformite.find(
      (o) => o.id === "formation-securite-etablissement-information",
    )!;
    const sansFait = {
      obligation: { ...info, faitGenerateur: undefined },
      raisons: [],
      equipementsConcernes: [],
    } as unknown as ObligationApplicable;
    expect(lignesDepuis([sansFait])).toEqual([]);
    // La borne haute : la même, avec son fait, y entre.
    expect(
      lignesDepuis([{ ...sansFait, obligation: info } as ObligationApplicable]).map(
        (l) => l.obligation.id,
      ),
    ).toEqual(["formation-securite-etablissement-information"]);
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

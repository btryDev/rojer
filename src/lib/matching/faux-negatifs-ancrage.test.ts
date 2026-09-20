import { describe, expect, it } from "vitest";
import { determineObligationsApplicables } from "./index";
import type { EtablissementMatching } from "./index";
import { porteurDe } from "@/lib/referentiels/conformite/types";

/**
 * Le lot « faux négatifs d'ancrage » — la garantie que le rebranchement tient.
 *
 * Six obligations existaient au référentiel en étant accrochées à une catégorie
 * d'équipement qui ne les conditionne pas. Un établissement qui n'avait pas
 * déclaré cet équipement ne les voyait JAMAIS, alors qu'il y est soumis. Dans un
 * outil de conformité, ce silence est pire qu'un trou : le trou se voit, le faux
 * négatif rassure à tort.
 *
 * Ce fichier existe parce qu'un test vert ne montre pas ça. Le point du lot est
 * qu'une obligation APPARAISSE là où elle n'apparaissait pas — et la seule façon
 * de l'établir est de le demander au moteur, sur un établissement qui n'a
 * strictement rien déclaré.
 *
 * DEUX RÈGLES DE RÉDACTION, et elles ne sont pas décoratives.
 *
 * 1. On passe par `determineObligationsApplicables` avec le référentiel RÉEL —
 *    jamais un tableau d'obligations fabriqué pour l'occasion, jamais une
 *    réimplémentation du prédicat. Ce dépôt a déjà rencontré le piège : un test
 *    qui recopie la règle qu'il prétend vérifier reste vert quand la garantie
 *    est neutralisée. Ici, si quelqu'un remet `categoriesEquipement` sur l'une
 *    de ces obligations, ces tests tombent — et eux seuls.
 *
 * 2. Chaque assertion « l'obligation apparaît » est doublée d'une assertion
 *    « et elle n'apparaît pas ailleurs ». Rebrancher trop large ferait naître
 *    des échéances qui ne sont pas dues : l'erreur symétrique, et tout aussi
 *    grave. Le champ d'application n'a pas bougé, et c'est vérifié ici.
 */

// ---------------------------------------------------------------------------
// Fixtures — le point commun est qu'AUCUNE ne déclare le moindre équipement.
// ---------------------------------------------------------------------------

/** Employeur non-ERP, sous le seuil de R. 4227-34. Le cas le plus dépouillé. */
function bureauSansRien(
  over: Partial<EtablissementMatching> = {},
): EtablissementMatching {
  return {
    id: "etab-bureau-nu",
    effectifSurSite: 12,
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
    ...over,
  };
}

/** ERP de 5ᵉ catégorie — le restaurateur du brief, qui n'a rien déclaré. */
function restoErpCat5SansRien(
  over: Partial<EtablissementMatching> = {},
): EtablissementMatching {
  return {
    id: "etab-resto-nu",
    effectifSurSite: 8,
    estEtablissementTravail: true,
    estERP: true,
    estIGH: false,
    estHabitation: false,
    typeErp: "N",
    categorieErp: "N5",
    classeIgh: null,
    familleHabitation: null,
    personnesPresentesHabituellement: null,
    manipuleMatieresR422722: null,
    comporteLocauxSommeilPublic: null,
    ...over,
  };
}

/** Rend les identifiants que le moteur retient, sur un parc VIDE. */
function idsSansAucunEquipement(etab: EtablissementMatching): string[] {
  return determineObligationsApplicables(etab, []).map((a) => a.obligation.id);
}

// ---------------------------------------------------------------------------
// 1. Tenue du registre de sécurité — CCH R. 143-44, CT L. 4711-1 et L. 4711-2
// ---------------------------------------------------------------------------

describe("faux négatif — tenue du registre de sécurité", () => {
  /**
   * R. 143-44, version en vigueur depuis le 1er juillet 2026 : « Dans les
   * établissements soumis aux prescriptions du présent chapitre, il doit être
   * tenu un registre de sécurité. » Le chapitre, c'est tous les ERP. L'article
   * ne nomme aucun équipement.
   */
  it("un ERP de 5ᵉ catégorie qui n'a rien déclaré reçoit le registre", () => {
    expect(idsSansAucunEquipement(restoErpCat5SansRien())).toContain(
      "incendie-registre-securite",
    );
  });

  /**
   * Côté Code du travail, L. 4711-1 et L. 4711-2 obligent tout employeur à
   * tenir et conserver les pièces des vérifications, sans seuil d'effectif.
   * L'ancrage à un extincteur déclaré n'avait aucun fondement de ce côté-là
   * non plus.
   */
  it("un employeur non-ERP qui n'a rien déclaré reçoit le registre", () => {
    expect(idsSansAucunEquipement(bureauSansRien())).toContain(
      "incendie-registre-securite",
    );
  });

  /**
   * Le garde-fou symétrique : `typologies` reste `{ travail: true, erp: true }`,
   * une disjonction. Un immeuble d'habitation pur, qui n'est ni employeur ni
   * ERP, ne doit rien recevoir — le rebranchement n'a pas transformé
   * l'obligation en obligation universelle.
   */
  it("un immeuble d'habitation, ni employeur ni ERP, ne le reçoit pas", () => {
    const habitation: EtablissementMatching = {
      id: "etab-hab-nu",
      effectifSurSite: 0,
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
    };
    expect(idsSansAucunEquipement(habitation)).not.toContain(
      "incendie-registre-securite",
    );
  });
});

// ---------------------------------------------------------------------------
// 2. Exercices d'évacuation semestriels — CT R. 4227-39
// ---------------------------------------------------------------------------

describe("faux négatif — exercices et essais semestriels", () => {
  /**
   * Le cœur du lot. R. 4227-34 dispose que les établissements de son champ
   * « sont équipés d'un système d'alarme sonore » : l'alarme y est le CONTENU
   * d'une obligation, pas la condition d'une autre. Ancrer l'exercice sur
   * ALARME_INCENDIE revenait à ne l'exiger que de ceux qui avaient déjà obéi.
   */
  it("un établissement de plus de 50 personnes sans alarme déclarée reçoit l'exercice", () => {
    expect(
      idsSansAucunEquipement(
        bureauSansRien({ personnesPresentesHabituellement: 60 }),
      ),
    ).toContain("incendie-travail-exercice-semestriel");
  });

  /**
   * Seconde branche du champ, disjonctive : la manipulation de matières
   * inflammables de R. 4227-22, quel que soit l'effectif.
   */
  it("un établissement manipulant des matières R. 4227-22 le reçoit, quel que soit l'effectif", () => {
    expect(
      idsSansAucunEquipement(
        bureauSansRien({ effectifSurSite: 3, manipuleMatieresR422722: true }),
      ),
    ).toContain("incendie-travail-exercice-semestriel");
  });

  /**
   * Le garde-fou symétrique, et il compte autant : le champ de R. 4227-34
   * n'a pas bougé. Le salon de coiffure de deux personnes ne reçoit toujours
   * rien. Si ce test tombe, le rebranchement a sur-appliqué.
   */
  it("un petit établissement hors du champ de R. 4227-34 ne le reçoit pas", () => {
    expect(
      idsSansAucunEquipement(bureauSansRien({ effectifSurSite: 4 })),
    ).not.toContain("incendie-travail-exercice-semestriel");
  });
});

// ---------------------------------------------------------------------------
// 3. Consigne de sécurité incendie — CT R. 4227-37
// ---------------------------------------------------------------------------

describe("faux négatif — consigne de sécurité incendie affichée", () => {
  /**
   * R. 4227-37 : « Dans les établissements mentionnés à l'article R. 4227-34,
   * une consigne de sécurité incendie est établie et affichée de manière très
   * apparente. » Aucun équipement dans le texte.
   */
  it("un établissement du champ de R. 4227-34 sans équipement reçoit la consigne", () => {
    expect(
      idsSansAucunEquipement(
        bureauSansRien({ personnesPresentesHabituellement: 60 }),
      ),
    ).toContain("incendie-travail-consigne-affichee");
  });

  it("un établissement hors de ce champ ne la reçoit pas", () => {
    expect(
      idsSansAucunEquipement(bureauSansRien({ effectifSurSite: 4 })),
    ).not.toContain("incendie-travail-consigne-affichee");
  });
});

// ---------------------------------------------------------------------------
// 4. Visite de commission — le faux négatif qui est resté ouvert six jours
// ---------------------------------------------------------------------------

describe("visite de commission — le faux négatif est corrigé (2026-09-01)", () => {
  /**
   * CE BLOC A CHANGÉ DE SENS, ET C'EST CE QU'IL ANNONÇAIT. Il constatait un
   * DÉFAUT : « un hôtel de 5ᵉ catégorie sans alarme déclarée ne reçoit
   * toujours PAS la visite », avec cette phrase — « le jour où cet attribut
   * existera, ce test devra tomber : c'est ce qui le rend utile ». Il est
   * tombé le 2026-09-01, et voici ce qui l'a fait tomber.
   *
   * R. 143-41 fonde les visites sans condition d'équipement, et PE 37 — seul
   * article du Livre III à organiser une visite périodique en 5ᵉ catégorie —
   * ne vise que les établissements comportant « pour le public, des locaux à
   * sommeil ». Cette restriction décide de l'EXISTENCE de la visite, pas de
   * son rythme. Elle était portée par une caractéristique de
   * l'ALARME_INCENDIE parce qu'aucun attribut d'établissement ne pouvait la
   * porter, et un porteur établissement n'accepte pas de `conditions`.
   *
   * `Etablissement.comporteLocauxSommeilPublic` existe désormais, et
   * `TypologieApplication.locauxSommeilPublic` la porte. L'obligation est
   * passée au porteur établissement.
   *
   * Les trois cas ci-dessous sont les trois qui comptent, et ils sont écrits
   * pour tomber séparément : la correction (l'hôtel sans alarme la reçoit),
   * la borne (le commerce qui a répondu « non » ne la reçoit pas), et la
   * prudence (le silence ne retire rien). Un seul des trois affirmé sans les
   * deux autres se réparerait en supprimant la condition.
   */
  const VISITE = "incendie-erp-5-visite-commission";

  it("un hôtel de 5ᵉ catégorie sans aucun équipement déclaré reçoit la visite", () => {
    expect(
      idsSansAucunEquipement(
        restoErpCat5SansRien({ typeErp: "O", comporteLocauxSommeilPublic: true }),
      ),
    ).toContain(VISITE);
  });

  it("un commerce de 5ᵉ catégorie qui a répondu « non » ne la reçoit pas", () => {
    expect(
      idsSansAucunEquipement(
        restoErpCat5SansRien({ comporteLocauxSommeilPublic: false }),
      ),
    ).not.toContain(VISITE);
  });

  it("un dossier qui n'a pas répondu la reçoit quand même — l'incertitude ne réduit pas la couverture", () => {
    // C'est le prix assumé de la règle du non-renseigné, et il est plus large
    // qu'avant : la ligne tombe désormais chez tout ERP de 5ᵉ catégorie muet,
    // alarme déclarée ou non. Elle est visible au calendrier et se retire
    // d'une réponse ; l'oubli d'un hôtel, lui, ne se voyait de nulle part.
    // Précisé le 2026-09-20 : la prudence joue là où le sommeil est PLAUSIBLE.
    // Un hôtel muet la reçoit ; un restaurant muet ne la reçoit plus — son type
    // a déjà répondu, et la lui servir lui faisait porter un contrat d'entretien
    // de détection qu'il ne doit pas. Les deux sens sont tenus ensemble.
    expect(
      idsSansAucunEquipement(restoErpCat5SansRien({ typeErp: "O" })),
    ).toContain(VISITE);
    expect(idsSansAucunEquipement(restoErpCat5SansRien())).not.toContain(VISITE);
    // Et l'oubli d'un dossier SANS TYPE reste couvert : rien n'y a répondu.
    expect(
      idsSansAucunEquipement(restoErpCat5SansRien({ typeErp: null })),
    ).toContain(VISITE);
  });

  it("un employeur non-ERP ne la reçoit pas, même en déclarant des locaux à sommeil", () => {
    // La condition de sommeil est en ET, pas un régime : elle ne fait entrer
    // personne dans le champ de PE 37, elle en écarte.
    expect(
      idsSansAucunEquipement(
        bureauSansRien({ comporteLocauxSommeilPublic: true }),
      ),
    ).not.toContain(VISITE);
  });
});

// ---------------------------------------------------------------------------
// La mesure du lot
// ---------------------------------------------------------------------------

describe("la mesure du lot — ce que reçoit un établissement sans équipement", () => {
  /**
   * Ici vivaient deux `toEqual([...])` énumérant à la main tout ce qu'un
   * établissement nu reçoit. Ils ont tenu une demi-journée : l'assemblage avec
   * le lot 7, le jour même, y a ajouté cinq lignes.
   *
   * Le défaut n'était pas d'avoir mal écrit la liste, il était de mettre une
   * MESURE dans un test. Une mesure se date et se publie — elle est au
   * `docs/revues/rapport-palier1.md`, avec les chiffres du 2026-08-31 et ce
   * qu'ils valaient avant. Un test, lui, énonce ce qui doit rester vrai. Une
   * liste exhaustive écrite à la main ne reste vraie qu'entre deux lots, et sa
   * réparation consiste à recopier ce que le code rend — c'est-à-dire à cesser
   * de vérifier quoi que ce soit.
   *
   * Ce qui suit énonce les deux bornes, sans nommer une seule ligne de plus
   * que celles dont ce lot répond.
   */

  /**
   * Borne basse — les trois obligations de ce lot sont là, chez qui n'a rien.
   * C'est la garantie, et elle ne se périme pas : un lot qui ajoute de la
   * couverture ne la met jamais en défaut, un rebranchement à l'envers si.
   */
  it("les trois obligations rebranchées sont rendues à un établissement nu", () => {
    expect(idsSansAucunEquipement(restoErpCat5SansRien())).toContain(
      "incendie-registre-securite",
    );
    const duChampR422734 = idsSansAucunEquipement(
      bureauSansRien({ personnesPresentesHabituellement: 60 }),
    );
    expect(duChampR422734).toContain("incendie-registre-securite");
    expect(duChampR422734).toContain("incendie-travail-consigne-affichee");
    expect(duChampR422734).toContain("incendie-travail-exercice-semestriel");
  });

  /**
   * Borne haute — rien de ce qui s'affiche ne dépend d'un équipement.
   *
   * C'est l'autre moitié de ce que la liste exhaustive surveillait, et elle se
   * dit sans liste : chez un établissement qui n'a rien déclaré, toute
   * obligation rendue doit être portée par l'établissement. Une obligation
   * d'équipement qui apparaîtrait ici serait un faux positif — l'erreur
   * symétrique de celle que ce lot corrige.
   */
  it("tout ce qui est rendu à un établissement nu est porté par l'établissement", () => {
    for (const etab of [
      restoErpCat5SansRien(),
      bureauSansRien(),
      bureauSansRien({ personnesPresentesHabituellement: 60 }),
      bureauSansRien({ effectifSurSite: 3, manipuleMatieresR422722: true }),
    ]) {
      for (const a of determineObligationsApplicables(etab, [])) {
        expect(
          porteurDe(a.obligation),
          `${a.obligation.id} est rendue à un établissement qui n'a rien ` +
            "déclaré : elle doit donc être portée par l'établissement",
        ).toBe("etablissement");
      }
    }
  });

  /**
   * Le nombre ne descend pas.
   *
   * Un cliquet, comme celui de la dette de lecture du corpus : il dit que ce
   * lot a fait apparaître quelque chose et que personne ne le refera
   * disparaître par accident. Il monte quand un lot livre de la couverture —
   * et on l'ajuste alors DÉLIBÉRÉMENT, en constatant ce qui est arrivé.
   * Contrairement à une liste exhaustive, il ne se répare pas en recopiant.
   */
  it("un établissement nu ne reçoit pas moins qu'au sortir de ce lot", () => {
    expect(
      idsSansAucunEquipement(restoErpCat5SansRien()).length,
      "ERP de 5ᵉ catégorie : 1 avant ce lot, 2 après",
    ).toBeGreaterThanOrEqual(2);
    expect(
      idsSansAucunEquipement(
        bureauSansRien({ personnesPresentesHabituellement: 60 }),
      ).length,
      "employeur du champ de R. 4227-34 : 1 avant ce lot, 4 après",
    ).toBeGreaterThanOrEqual(4);
  });
});

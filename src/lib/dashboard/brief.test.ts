import { describe, expect, it } from "vitest";
import { construireBrief, type EntreeBrief } from "./brief";
import type { FamilleEcheance } from "@/lib/calendrier/echeances";
import { LONGUEUR_LIBELLE_MAX, raccourcirLibelle } from "./libelles";

const LE_8_AOUT = new Date(2026, 7, 8);

/** Une ventilation par famille, à partir des seules familles nommées. */
function ventil(parFamille: Partial<Record<FamilleEcheance, number>> = {}) {
  const complet = {
    controle: 0,
    travaux: 0,
    operations: 0,
    papiers: 0,
    personnel: 0,
    ...parFamille,
  };
  return {
    parFamille: complet,
    total: Object.values(complet).reduce((a, b) => a + b, 0),
  };
}

const CALME: EntreeBrief = {
  aujourdhui: LE_8_AOUT,
  retards: ventil(),
  sous30j: ventil(),
  verifsAPlanifier: 0,
  verifsEnRetardSansEcheance: 0,
  titresDusEnRetard: 0,
  recommandations: [],
};

describe("construireBrief — titre", () => {
  it("compte ensemble toutes les familles en retard", () => {
    // Le titre disait « Une échéance » à un dossier qui portait aussi une
    // attestation expirée : il n'additionnait que deux familles sur cinq.
    const b = construireBrief({
      ...CALME,
      retards: ventil({ controle: 1, travaux: 1, papiers: 1 }),
    });
    expect(b.titre).toBe("Trois échéances ont dépassé leur date");
  });

  it("ne dit pas « ont dépassé leur date » d'une vérification sans date connue", () => {
    // Contrôle visuel en production, 2026-09-14 : « 14 échéances ont dépassé
    // leur date » en portait cinq sans échéance connue — leur date n'est
    // qu'une date de génération.
    const mixte = construireBrief({
      ...CALME,
      retards: ventil({ controle: 6, travaux: 5, operations: 3 }),
      verifsEnRetardSansEcheance: 5,
    });
    expect(mixte.titre).toBe("14 échéances sont dues, dont cinq sans date connue");

    const toutes = construireBrief({
      ...CALME,
      retards: ventil({ controle: 3 }),
      verifsEnRetardSansEcheance: 3,
    });
    expect(toutes.titre).toBe("Trois vérifications sont dues, sans date connue");

    const une = construireBrief({
      ...CALME,
      retards: ventil({ controle: 1 }),
      verifsEnRetardSansEcheance: 1,
    });
    expect(une.titre).toBe("Une vérification est due, sans date connue");
  });

  it("accorde le singulier", () => {
    const b = construireBrief({
      ...CALME,
      retards: ventil({ controle: 1 }),
    });
    expect(b.titre).toBe("Une échéance a dépassé sa date");
  });

  it("bascule sur les trente jours quand rien n'est en retard", () => {
    const b = construireBrief({
      ...CALME,
      sous30j: ventil({ controle: 2, papiers: 1 }),
    });
    expect(b.titre).toBe("Trois échéances dans les trente jours");
  });

  it("mentionne les vérifications à planifier en dernier recours", () => {
    const b = construireBrief({
      ...CALME,
      verifsAPlanifier: 2,
    });
    expect(b.titre).toBe("Deux vérifications restent à planifier");
  });

  it("ne fabrique pas d'urgence quand tout est calme", () => {
    expect(construireBrief(CALME).titre).toBe(
      "Rien ne presse dans les trente jours",
    );
  });

  it("passe aux chiffres au-delà de neuf", () => {
    const b = construireBrief({
      ...CALME,
      retards: ventil({ controle: 12 }),
    });
    expect(b.titre).toBe("12 échéances ont dépassé leur date");
  });
});

describe("construireBrief — amorçage", () => {
  it("remplace « Rien ne presse » par le titre de la première amorce", () => {
    const b = construireBrief({
      ...CALME,
      recommandations: [
        { kind: "amorce_equipements" },
      ],
    });
    expect(b.titre).toBe("Première étape : vos équipements");
  });

  it("titre d'amorce DUERP puis rapport, selon la première reco", () => {
    const duerp = construireBrief({
      ...CALME,
      recommandations: [
        { kind: "amorce_duerp" },
      ],
    });
    expect(duerp.titre).toBe("Prochaine étape : votre DUERP");

    const rapport = construireBrief({
      ...CALME,
      recommandations: [
        { kind: "amorce_rapport" },
      ],
    });
    expect(rapport.titre).toBe("Votre calendrier est en place");
  });

  it("une urgence réelle garde son titre chiffré, même avec une amorce en reco", () => {
    const b = construireBrief({
      ...CALME,
      retards: ventil({ controle: 1 }),
      recommandations: [
        { kind: "verif_depassee" },
        { kind: "amorce_duerp" },
      ],
    });
    expect(b.titre).toBe("Une échéance a dépassé sa date");
  });

});

describe("construireBrief — date", () => {
  it("rend la date du jour capitalisée", () => {
    expect(construireBrief(CALME).datePill).toBe("Samedi 8 août 2026");
  });
});

describe("raccourcirLibelle", () => {
  it("retire le préfixe de périodicité", () => {
    expect(raccourcirLibelle("Vérification périodique annuelle des extincteurs")).toBe(
      "Extincteurs",
    );
    expect(raccourcirLibelle("Entretien annuel de la hotte")).toBe("Hotte");
  });

  it("coupe la précision juridique qui suit le sujet", () => {
    // Cas réel observé sur le tableau de bord : le libellé complet mangeait
    // toute la largeur du hero.
    expect(
      raccourcirLibelle(
        "Habilitation électrique du personnel opérant sur ou à proximité d'installations électriques",
      ),
    ).toBe("Habilitation électrique");
  });

  it("coupe à la première parenthèse ou virgule", () => {
    expect(
      raccourcirLibelle("Vérification électrique à la mise en service (ERP)"),
    ).toBe("Électrique à la mise en service");
  });

  it("tronque sur un mot entier, jamais au milieu", () => {
    const t = raccourcirLibelle(
      "Contrôle technique approfondi des installations de désenfumage naturel",
    );
    expect(t.length).toBeLessThanOrEqual(LONGUEUR_LIBELLE_MAX + 1);
    expect(t.endsWith("…")).toBe(true);
    expect(t).not.toMatch(/\s…$/);
  });

  it("laisse intact un libellé déjà court", () => {
    expect(raccourcirLibelle("Extincteurs")).toBe("Extincteurs");
  });

  it("capitalise le résultat", () => {
    expect(raccourcirLibelle("Entretien annuel des ascenseurs")).toBe("Ascenseurs");
  });
});

describe("brief — les titres dus en retard (ADR-043 (d), audit du 2026-10-12)", () => {
  // La carte « Titres dus à vos salariés » est rangée parmi les retards, mais
  // le titre ne les compte pas (ADR-043 § 3 (a)) :
  // le bandeau disait « Rien ne presse » au-dessus d'une carte en retard.
  it("sans autre retard, le titre les nomme au lieu du calme", () => {
    const b = construireBrief({ ...CALME, titresDusEnRetard: 2 });
    // Des couples personne × titre, et la phrase le dit (2026-10-12).
    expect(b.titre).toBe(
      "Deux titres dus à vos salariés, non déclarés, sont en retard — comptés personne par personne",
    );
  });

  it("avec d'autres retards, le titre ne les compte pas", () => {
    const b = construireBrief({
      ...CALME,
      retards: ventil({ controle: 3 }),
      titresDusEnRetard: 1,
    });
    expect(b.titre).toBe("Trois échéances ont dépassé leur date");
  });
});

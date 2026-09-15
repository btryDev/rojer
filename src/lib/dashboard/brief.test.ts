import { describe, expect, it } from "vitest";
import { instantCivil } from "@/lib/dates";
import { construireBrief, type EntreeBrief } from "./brief";
import type { FamilleEcheance } from "@/lib/calendrier/echeances";
import { evaluerEtatDuerp } from "./duerp";
import { LONGUEUR_LIBELLE_MAX, raccourcirLibelle } from "./libelles";

const LE_8_AOUT = new Date(2026, 7, 8);

/** État de DUERP à la date du brief : `ageJours` à `null` = aucune version
 *  validée. */
function duerpDe(ageJours: number | null, effectif = 20) {
  const now = instantCivil(2026, 8, 8, 10);
  return evaluerEtatDuerp(
    {
      ouvert: true,
      dateDerniereVersion:
        ageJours === null ? null : new Date(now.getTime() - ageJours * 86_400_000),
      effectif,
    },
    now,
  );
}

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
  duerp: { existe: true, estAJour: true },
  recommandations: [],
  nbRapports: 4,
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

  it("la légende du relevé « Dépassées » nomme la même part sans date que le titre", () => {
    // 2026-09-15 : le titre disait « 14 échéances sont dues, dont cinq sans
    // date connue » au-dessus d'un relevé « DÉPASSÉES 14 » sans rien d'autre.
    const mixte = construireBrief({
      ...CALME,
      retards: ventil({ controle: 6, travaux: 5, operations: 3 }),
      verifsEnRetardSansEcheance: 5,
    });
    expect(mixte.precisionReleveRetard).toBe("dont 5 sans date connue");

    const datees = construireBrief({
      ...CALME,
      retards: ventil({ controle: 6 }),
    });
    expect(datees.precisionReleveRetard).toBeNull();
    expect(construireBrief(CALME).precisionReleveRetard).toBeNull();

    const toutes = construireBrief({
      ...CALME,
      retards: ventil({ controle: 5 }),
      verifsEnRetardSansEcheance: 5,
    });
    expect(toutes.precisionReleveRetard).toBe("toutes sans date connue");
  });

  it("le paragraphe ne compte pas « dépassées » les vérifications sans date connue", () => {
    const b = construireBrief({
      ...CALME,
      retards: ventil({ controle: 6 }),
      verifsEnRetardSansEcheance: 5,
    });
    expect(b.paragraphe).toContain("1 vérification dépassée et 5 vérifications dues sans date connue");
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

describe("construireBrief — paragraphe", () => {
  it("n'énonce que des clauses vraies", () => {
    const b = construireBrief(CALME);
    expect(b.paragraphe).toContain("Votre DUERP est à jour");
    expect(b.paragraphe).toContain("le registre compte 4 rapports");
    expect(b.paragraphe).toContain("Rien n'est en retard");
  });

  it("tait le registre quand aucun rapport n'a été déposé", () => {
    const b = construireBrief({ ...CALME, nbRapports: 0 });
    expect(b.paragraphe).not.toContain("registre");
  });

  it("signale un DUERP absent avant tout le reste", () => {
    const b = construireBrief({
      ...CALME,
      duerp: { existe: false, estAJour: false },
    });
    expect(b.paragraphe.startsWith("Votre DUERP n'est pas encore ouvert.")).toBe(
      true,
    );
  });

  it("signale un DUERP périmé", () => {
    const etat = duerpDe(400);
    const b = construireBrief({
      ...CALME,
      duerp: { existe: true, estAJour: etat.estAJour, etat },
    });
    expect(b.paragraphe).toContain(
      "La dernière version de votre DUERP a plus de douze mois.",
    );
  });

  it("ne dit pas « plus de douze mois » d'un DUERP sans version validée", () => {
    // Le dirigeant venait d'ouvrir son DUERP et s'entendait reprocher son
    // ancienneté : l'âge était `null`, donc « pas à jour », donc « périmé ».
    const etat = duerpDe(null);
    const b = construireBrief({
      ...CALME,
      duerp: { existe: true, estAJour: etat.estAJour, etat },
    });
    expect(b.paragraphe).toContain(
      "Aucune version de votre DUERP n'a encore été validée.",
    );
    expect(b.paragraphe).not.toContain("plus de douze mois");
    expect(b.paragraphe).not.toContain("Votre DUERP est à jour");
  });

  it("ne reproche aucune ancienneté sous onze salariés (art. R. 4121-2)", () => {
    const etat = duerpDe(400, 4);
    const b = construireBrief({
      ...CALME,
      duerp: { existe: true, estAJour: etat.estAJour, etat },
    });
    expect(b.paragraphe).not.toContain("douze mois");
    // Rien n'est reproché, mais rien n'est promis non plus : la version
    // n'est pas récente, l'acquis « à jour » ne s'affiche pas.
    expect(b.paragraphe).not.toContain("DUERP est à jour");
  });

  it("sans état détaillé, s'en tient à une formulation vraie dans les deux cas", () => {
    const b = construireBrief({
      ...CALME,
      duerp: { existe: true, estAJour: false },
    });
    expect(b.paragraphe).toContain(
      "Votre DUERP n'a pas de version validée de moins de douze mois.",
    );
  });

  it("énumère les restes en français", () => {
    const b = construireBrief({
      ...CALME,
      retards: ventil({ controle: 2, travaux: 3, papiers: 1 }),
      verifsAPlanifier: 1,
    });
    expect(b.paragraphe).toContain(
      "Il reste 2 vérifications dépassées, 3 corrections en retard, 1 document à renouveler et 1 vérification à planifier.",
    );
  });
});

describe("construireBrief — gestes", () => {
  it("retient au plus deux recommandations et leur donne un verbe", () => {
    const b = construireBrief({
      ...CALME,
      recommandations: [
        { kind: "verif_depassee", titre: "Extincteurs", href: "/a" },
        { kind: "action_en_retard", titre: "Fournil", href: "/b" },
        { kind: "verif_proche", titre: "Électricité", href: "/c" },
      ],
    });
    expect(b.gestes).toHaveLength(2);
    expect(b.gestes[0]).toEqual({
      tag: "Extincteurs",
      tagComplet: "Extincteurs",
      label: "Programmer l'intervention",
      href: "/a",
      ton: "alerte",
    });
    expect(b.gestes[1].label).toBe("Replanifier");
  });

  it("distingue le ton alerte du ton neutre", () => {
    const b = construireBrief({
      ...CALME,
      recommandations: [
        { kind: "verif_proche", titre: "Électricité", href: "/c" },
      ],
    });
    expect(b.gestes[0].ton).toBe("neutre");
  });

  it("n'invente pas de geste quand il n'y a pas de recommandation", () => {
    expect(construireBrief(CALME).gestes).toEqual([]);
  });
});

describe("construireBrief — amorçage", () => {
  it("remplace « Rien ne presse » par le titre de la première amorce", () => {
    const b = construireBrief({
      ...CALME,
      duerp: { existe: false, estAJour: false },
      nbRapports: 0,
      recommandations: [
        {
          kind: "amorce_equipements",
          titre: "Déclarez vos équipements",
          href: "/etablissements/x/equipements",
        },
      ],
    });
    expect(b.titre).toBe("Première étape : vos équipements");
    expect(b.gestes[0]).toEqual({
      tag: "Déclarez vos équipements",
      tagComplet: "Déclarez vos équipements",
      label: "Déclarer",
      href: "/etablissements/x/equipements",
      ton: "neutre",
    });
  });

  it("titre d'amorce DUERP puis rapport, selon la première reco", () => {
    const duerp = construireBrief({
      ...CALME,
      recommandations: [
        { kind: "amorce_duerp", titre: "Ouvrez votre DUERP", href: "/d" },
      ],
    });
    expect(duerp.titre).toBe("Prochaine étape : votre DUERP");
    expect(duerp.gestes[0].label).toBe("Ouvrir");

    const rapport = construireBrief({
      ...CALME,
      recommandations: [
        {
          kind: "amorce_rapport",
          titre: "Déposez votre premier rapport",
          href: "/c",
        },
      ],
    });
    expect(rapport.titre).toBe("Votre calendrier est en place");
    expect(rapport.gestes[0].label).toBe("Déposer");
  });

  it("une urgence réelle garde son titre chiffré, même avec une amorce en reco", () => {
    const b = construireBrief({
      ...CALME,
      retards: ventil({ controle: 1 }),
      recommandations: [
        { kind: "verif_depassee", titre: "Extincteurs", href: "/a" },
        { kind: "amorce_duerp", titre: "Ouvrez votre DUERP", href: "/d" },
      ],
    });
    expect(b.titre).toBe("Une échéance a dépassé sa date");
  });

  it("les amorces sont toujours de ton neutre", () => {
    const b = construireBrief({
      ...CALME,
      recommandations: [
        { kind: "amorce_rapport", titre: "Déposez", href: "/c" },
      ],
    });
    expect(b.gestes.every((g) => g.ton === "neutre")).toBe(true);
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

describe("construireBrief — gestes raccourcis", () => {
  it("expose le tag court et conserve le libellé complet", () => {
    const b = construireBrief({
      ...CALME,
      recommandations: [
        {
          kind: "verif_depassee",
          titre:
            "Habilitation électrique du personnel opérant sur ou à proximité d'installations électriques",
          href: "/a",
        },
      ],
    });
    expect(b.gestes[0].tag).toBe("Habilitation électrique");
    expect(b.gestes[0].tagComplet).toContain("à proximité");
  });
});

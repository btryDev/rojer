import { describe, expect, it } from "vitest";
import { VALEURS_INITIALES, type OnboardingState } from "./types";
import {
  nombreDePersonnesDemande,
  refusEffectif,
  validerIdentite,
  validerTypologie,
  type Blocage,
} from "./validation";

/**
 * Le texte d'un refus, ou `null`.
 *
 * Les validateurs rendaient une chaîne ; ils rendent maintenant, avec elle,
 * le champ que le refus vise et sa nature (cf. `Blocage`) — pour que le
 * message se rende au champ au lieu d'être posé six cents pixels plus bas.
 * Ce qui suit interroge le texte, c'est-à-dire ce que le dirigeant lit ; le
 * champ et la nature ont leurs propres tests, plus bas.
 */
const texte = (b: Blocage | null) => (b === null ? null : b.message);

const complet: OnboardingState = {
  ...VALEURS_INITIALES,
  raisonSociale: "Hôtel du Port",
  adresseRue: "12 rue du Port",
  adresseCodePostal: "29200",
  adresseVille: "Brest",
  codeNaf: "56.10A",
  effectifSurSite: "4",
  estEtablissementTravail: true,
};

describe("étape 1 — la porte ne se ferme plus sur le secteur", () => {
  // C'est ici que la porte se fermait réellement : un dirigeant bloqué à
  // l'étape 1 du wizard n'atteint jamais la server action, donc le
  // `superRefine` du schéma Zod n'était pas le filet qu'on croyait. La revue
  // du 2026-08-28 l'a montré — la mutation qui rétablit le verrou ici laissait
  // les 57 tests d'onboarding au vert.
  it.each([
    ["55.10Z", "hôtellerie"],
    ["43.22A", "BTP"],
    ["45.20A", "garage"],
    ["96.02A", "coiffure"],
    ["86.10Z", "santé"],
    ["5610A", "restauration écrite sans point"],
  ])("laisse passer %s (%s)", (codeNaf) => {
    expect(validerIdentite({ ...complet, codeNaf })).toBeNull();
  });

  it("laisse passer les trois secteurs instruits", () => {
    for (const codeNaf of ["56.10A", "47.25Z", "70.22Z"]) {
      expect(validerIdentite({ ...complet, codeNaf })).toBeNull();
    }
  });

  it("ne parle jamais de secteur dans ses messages", () => {
    // Le message « Secteur non couvert. … » était le refus lui-même. S'il
    // réapparaît, c'est que le verrou est revenu par une autre porte.
    for (const codeNaf of ["43.22A", "", "pas-un-naf", "56.10A"]) {
      const m = texte(validerIdentite({ ...complet, codeNaf }));
      if (m !== null) expect(m, codeNaf).not.toMatch(/secteur|couvert/i);
    }
  });
});

describe("étape 1 — ce qui bloque encore", () => {
  it("refuse un code NAF illisible", () => {
    expect(texte(validerIdentite({ ...complet, codeNaf: "pas-un-naf" }))).toBe(
      "Le code NAF doit ressembler à 56.10A.",
    );
    expect(validerIdentite({ ...complet, codeNaf: "561" })).not.toBeNull();
    expect(validerIdentite({ ...complet, codeNaf: "5610ABC" })).not.toBeNull();
  });

  it("distingue un code absent d'un code illisible", () => {
    // Deux gestes différents pour l'utilisateur : en saisir un, ou corriger
    // celui qu'il a tapé.
    expect(texte(validerIdentite({ ...complet, codeNaf: "  " }))).toBe(
      "Indiquez le code NAF.",
    );
  });

  it.each([
    ["raisonSociale", "", "Indiquez la raison sociale pour continuer."],
    ["adresseRue", "ab", "Indiquez le numéro et la rue."],
    ["adresseCodePostal", "2920", "Le code postal doit faire 5 chiffres."],
    ["adresseVille", "B", "Indiquez la ville."],
    ["effectifSurSite", "0", "Indiquez un effectif (au moins 1)."],
    ["effectifSurSite", "2.5", "Indiquez un effectif (au moins 1)."],
    ["effectifSurSite", "", "Indiquez un effectif (au moins 1)."],
  ])("refuse %s = « %s »", (champ, valeur, message) => {
    expect(texte(validerIdentite({ ...complet, [champ]: valeur }))).toBe(
      message,
    );
  });
});

describe("étape 2 — les régimes (ADR-004)", () => {
  const erp: OnboardingState = {
    ...complet,
    estEtablissementTravail: false,
    estERP: true,
    typeErp: "O",
    categorieErp: "N5",
    // Les deux questions dont la présence dépend d'une autre, dues depuis le
    // 2026-09-20 : un hôtel de 5ᵉ catégorie les reçoit toutes les deux.
    comporteLocauxSommeilPublic: "oui",
    personnesPresentesHabituellement: "30",
  };

  it("accepte un ERP complètement renseigné", () => {
    expect(validerTypologie(erp)).toBeNull();
  });

  it("exige au moins un régime", () => {
    expect(
      texte(
        validerTypologie({
          ...complet,
          estEtablissementTravail: false,
          estERP: false,
          estIGH: false,
          estHabitation: false,
        }),
      ),
    ).toBe("Cochez au moins un régime (travail, ERP, IGH ou habitation).");
  });

  // Les mots du refus sont ceux du champ qu'il vise. « Activité » et
  // « capacité d'accueil » étaient le vocabulaire des cartes d'activité que
  // le recadrage du 2026-09-01 a supprimées ; les champs, eux, demandent un
  // « type d'établissement » et une « catégorie ». Un refus qui nomme autre
  // chose que ce qu'il montre envoie chercher un champ qui n'existe pas.
  it("exige le type et la catégorie d'un ERP, dans les mots des champs", () => {
    expect(texte(validerTypologie({ ...erp, typeErp: "" }))).toBe(
      "Précisez le type de votre ERP.",
    );
    expect(texte(validerTypologie({ ...erp, categorieErp: "" }))).toBe(
      "Précisez la catégorie de votre ERP.",
    );
  });

  // Le vocabulaire des cartes supprimées ne doit revenir par aucune porte.
  it("ne parle plus d'activité ni de capacité d'accueil", () => {
    const refus = [
      validerTypologie({ ...erp, typeErp: "" }),
      validerTypologie({ ...erp, categorieErp: "" }),
    ].map(texte);
    for (const m of refus) {
      expect(m).not.toMatch(/activité|capacité/i);
    }
  });

  // « exige la classe d'un IGH » a vécu ici jusqu'au 2026-09-03. La
  // sous-question a été retirée du parcours : les vérifications de l'arrêté du
  // 30 décembre 2011 s'adressent aux « propriétaires » et ne varient pas par
  // classe, et GH 66 fait du classement l'affaire de l'usage PRINCIPAL de
  // l'immeuble, non du plateau qu'on y occupe. Ce que le test suivant garde
  // reste entier : l'IGH SEUL n'est pas refusé, et c'est la moitié qui compte.
  it("n'exige plus rien d'un IGH que son régime", () => {
    expect(validerTypologie({ ...complet, estIGH: true })).toBeNull();
  });

  // Le seul cumul refusé (ADR-025 § 1). Les deux moitiés comptent : sans la
  // seconde, la règle se réparerait en refusant l'IGH tout court, ce qui
  // fermerait la porte à un employeur locataire d'une tour de bureaux — qui
  // relève du Code du travail et que le produit sert entièrement.
  it("refuse un ERP situé dans un IGH", () => {
    expect(
      texte(validerTypologie({ ...erp, estIGH: true })),
    ).toContain("immeuble de grande hauteur");
  });

  it("accepte un IGH qui n'est pas un ERP", () => {
    expect(validerTypologie({ ...complet, estIGH: true })).toBeNull();
  });
});

describe("étape 2 — l'habitation ne réclame plus de précision", () => {
  // CE BLOC GARDAIT UN CUL-DE-SAC, ET CE CUL-DE-SAC N'EXISTE PLUS PARCE QUE SA
  // CAUSE A DISPARU. Répondre « Oui » à l'habitation, choisir une famille,
  // puis revenir à « Non » laissait la famille dans l'état du wizard : l'étape
  // 2 passait, le schéma serveur refusait une famille posée hors régime, et
  // son message ne s'affichait que dans le bloc qu'on venait de démonter —
  // bouton sans effet, aucune carte à désélectionner, sortie par rechargement.
  //
  // La sous-question de famille a été retirée le 2026-09-03 : le wizard n'a
  // plus de précision d'habitation à laisser derrière lui, et le schéma n'a
  // plus de règle à opposer. Ce qui est gardé ici est donc l'état d'arrivée —
  // l'habitation se coche et se décoche sans rien réclamer — plutôt qu'un
  // scénario devenu impossible à écrire.
  it("accepte une habitation cochée, sans précision à fournir", () => {
    expect(
      validerTypologie({ ...complet, estHabitation: true }),
    ).toBeNull();
  });

  it("accepte une habitation abandonnée", () => {
    expect(
      validerTypologie({ ...complet, estHabitation: false }),
    ).toBeNull();
  });
});

describe("étape 1 — la borne d'effectif (ADR-031)", () => {
  // Elle porte sur les TRAVAILLEURS. Le refus vit ici autant que dans le
  // schéma Zod : un dirigeant bloqué à l'étape 1 n'atteint jamais la server
  // action, et un refus qui n'arriverait qu'au submit ferait ressaisir tout
  // le formulaire.
  it("accepte 50 salariés", () => {
    expect(validerIdentite({ ...complet, effectifSurSite: "50" })).toBeNull();
  });

  it("refuse 51 salariés en nommant la limite", () => {
    const message = texte(
      validerIdentite({ ...complet, effectifSurSite: "51" }),
    );
    expect(message).toContain("50");
  });

  it("ne regarde pas le public reçu", () => {
    // Un ERP de 1ʳᵉ catégorie — plus de 1500 personnes admises — avec quatre
    // salariés passe. Confondre les deux chiffres reviendrait à refuser la
    // cible du produit.
    expect(
      validerIdentite({ ...complet, estERP: true, categorieErp: "N1" }),
    ).toBeNull();
  });
});


describe("le refus dit où regarder, et de quelle nature il est", () => {
  // La moitié qui manquait au message. Rendu en bas de colonne, sous les
  // trois cartes de l'étape 2, « Précisez… » s'affichait six cents pixels
  // sous le contrôle visé — on le lisait en regardant la carte
  // « habitation ». `champ` est ce qui permet à l'étape de le rendre sous le
  // bon champ, et au shell d'y amener le regard.
  const erp: OnboardingState = {
    ...complet,
    estEtablissementTravail: false,
    estERP: true,
    typeErp: "O",
    categorieErp: "N5",
    // Les deux questions dont la présence dépend d'une autre, dues depuis le
    // 2026-09-20 : un hôtel de 5ᵉ catégorie les reçoit toutes les deux.
    comporteLocauxSommeilPublic: "oui",
    personnesPresentesHabituellement: "30",
  };

  it.each([
    ["raisonSociale", { raisonSociale: "" }],
    ["adresseRue", { adresseRue: "ab" }],
    ["adresseCodePostal", { adresseCodePostal: "2920" }],
    ["adresseVille", { adresseVille: "B" }],
    ["codeNaf", { codeNaf: "" }],
    ["effectifSurSite", { effectifSurSite: "0" }],
  ])("étape 1 : le refus vise %s", (champ, patch) => {
    expect(validerIdentite({ ...complet, ...patch })?.champ).toBe(champ);
  });

  it.each([
    ["typeErp", { ...erp, typeErp: "" }],
    ["categorieErp", { ...erp, categorieErp: "" }],
  ])("étape 2 : le refus vise %s", (champ, etat) => {
    expect(validerTypologie(etat as OnboardingState)?.champ).toBe(champ);
  });

  // Un régime manquant ne vise aucun champ : trois questions sont en cause,
  // pas une. Celui-là reste rendu en bas de colonne — et c'est la seule
  // raison pour laquelle le shell garde cet emplacement.
  it("le régime manquant ne vise aucun champ", () => {
    const b = validerTypologie({
      ...complet,
      estEtablissementTravail: false,
      estERP: false,
      estIGH: false,
      estHabitation: false,
    });
    expect(b?.champ).toBeUndefined();
  });

  // `perimetre` distingue le champ oublié — qu'on lève en le remplissant, et
  // que le clic révèle — de la borne du produit, qu'aucune saisie ne lève et
  // qui ferme donc la porte avant le clic.
  it("un champ oublié n'est pas un refus de périmètre", () => {
    expect(
      validerIdentite({ ...complet, raisonSociale: "" })?.perimetre,
    ).toBeUndefined();
    expect(validerTypologie({ ...erp, typeErp: "" })?.perimetre).toBeUndefined();
  });

  it("la borne d'effectif et l'ERP en IGH en sont", () => {
    expect(
      validerIdentite({ ...complet, effectifSurSite: "51" })?.perimetre,
    ).toBe(true);
    expect(
      validerTypologie({ ...erp, estIGH: true })?.perimetre,
    ).toBe(true);
  });
});

describe("la borne d'effectif n'est écrite qu'une fois", () => {
  // Elle l'était deux fois, dans deux formulations : « au-delà de ce que
  // Rojer prend en charge » sous le champ, en gris et sans icône, puis
  // « Rojer prend en charge les structures jusqu'à 50 salariés » en rouge au
  // clic. L'écran et le passage d'étape lisent maintenant la même fonction —
  // si les deux textes divergent à nouveau, c'est qu'un second a été réécrit
  // quelque part.
  it("le refus du passage d'étape EST celui que l'écran affiche", () => {
    expect(validerIdentite({ ...complet, effectifSurSite: "51" })).toEqual(
      refusEffectif("51"),
    );
  });

  it("se tait jusqu'à la borne, et parle au-delà", () => {
    expect(refusEffectif("50")).toBeNull();
    expect(refusEffectif("51")?.message).toContain("50");
  });

  it("ne se déclenche pas sur une saisie qui n'est pas un entier", () => {
    // « 50,5 » est refusé plus haut, par la règle de l'entier : ce n'est pas
    // un dépassement de borne, et le dire ainsi enverrait chercher une
    // structure trop grande là où il n'y a qu'une virgule.
    expect(refusEffectif("50.5")).toBeNull();
    expect(refusEffectif("")).toBeNull();
  });
});

describe("étape 2 — les deux questions dont la présence dépend d'une autre (2026-09-20)", () => {
  const restaurant: OnboardingState = {
    ...complet,
    estERP: true,
    typeErp: "N",
    categorieErp: "N5",
    personnesPresentesHabituellement: "",
  };

  it("retient un restaurant de 5ᵉ catégorie qui n'a pas donné le nombre, sur SON champ", () => {
    expect(validerTypologie(restaurant)?.champ).toBe(
      "personnesPresentesHabituellement",
    );
    for (const n of ["0", "abc", "12.5"])
      expect(
        validerTypologie({ ...restaurant, personnesPresentesHabituellement: n })
          ?.champ,
        n,
      ).toBe("personnesPresentesHabituellement");
    expect(
      validerTypologie({ ...restaurant, personnesPresentesHabituellement: "40" }),
    ).toBeNull();
  });

  it("lit l'effectif comme le serveur le lira — « 12.0 » ouvre la question", () => {
    // La regex d'origine lisait « 12.0 » illisible : l'étape 1 passait, la
    // question ne s'ouvrait pas, et le serveur refusait à l'étape 3.
    for (const effectif of ["12.0", " 12 ", "012", "1e1"])
      expect(
        nombreDePersonnesDemande({ ...restaurant, effectifSurSite: effectif }),
        effectif,
      ).toBe(true);
    for (const effectif of ["", "abc", "12.5"])
      expect(
        nombreDePersonnesDemande({ ...restaurant, effectifSurSite: effectif }),
        effectif,
      ).toBe(false);
  });

  it("retient un nombre que le serveur refuserait (hors de 1 à 99 999)", () => {
    expect(
      validerTypologie({
        ...restaurant,
        personnesPresentesHabituellement: "100000",
      })?.champ,
    ).toBe("personnesPresentesHabituellement");
  });

  it("ne demande rien à une 3ᵉ catégorie ni à un établissement sans public", () => {
    expect(validerTypologie({ ...restaurant, categorieErp: "N3" })).toBeNull();
    expect(nombreDePersonnesDemande({ ...restaurant, estERP: false })).toBe(false);
  });

  it("retient un hôtel qui n'a pas répondu sur le sommeil, sur SON champ", () => {
    expect(
      validerTypologie({
        ...restaurant,
        typeErp: "O",
        personnesPresentesHabituellement: "30",
        comporteLocauxSommeilPublic: "",
      })?.champ,
    ).toBe("comporteLocauxSommeilPublic");
  });
});

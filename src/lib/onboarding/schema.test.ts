import { describe, expect, it } from "vitest";
import { onboardingSchema } from "./schema";

const base = {
  raisonSociale: "Bistrot du marché SARL",
  siret: "",
  adresse: "12 rue des halles, 44000 Nantes",
  codeNaf: "56.10A",
  effectifSurSite: 8,
  estEtablissementTravail: true,
  estERP: false,
  estIGH: false,
  estHabitation: false,
};

describe("onboardingSchema", () => {
  it("accepte une saisie minimale valide (travail seul)", () => {
    const res = onboardingSchema.safeParse(base);
    expect(res.success).toBe(true);
  });

  it("accepte un SIRET valide à 14 chiffres", () => {
    const res = onboardingSchema.safeParse({
      ...base,
      siret: "12345678901234",
    });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.siret).toBe("12345678901234");
  });

  it("refuse un SIRET invalide", () => {
    const res = onboardingSchema.safeParse({ ...base, siret: "12345" });
    expect(res.success).toBe(false);
  });

  it("accepte un SIRET vide (optionnel)", () => {
    const res = onboardingSchema.safeParse({ ...base, siret: "" });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.siret).toBeUndefined();
  });

  it("normalise le code NAF en majuscules", () => {
    const res = onboardingSchema.safeParse({ ...base, codeNaf: "56.10a" });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.codeNaf).toBe("56.10A");
  });

  it("refuse une adresse non structurée (n'importe quoi)", () => {
    const res = onboardingSchema.safeParse({
      ...base,
      adresse: "chez moi",
    });
    expect(res.success).toBe(false);
  });

  it("refuse une adresse sans code postal 5 chiffres", () => {
    const res = onboardingSchema.safeParse({
      ...base,
      adresse: "12 rue X, 4400 Nantes",
    });
    expect(res.success).toBe(false);
  });

  it("exige type + catégorie ERP si estERP=true", () => {
    const res = onboardingSchema.safeParse({ ...base, estERP: true });
    expect(res.success).toBe(false);
    if (!res.success) {
      const champs = res.error.flatten().fieldErrors;
      expect(champs.typeErp).toBeDefined();
      expect(champs.categorieErp).toBeDefined();
    }
  });

  it("accepte un ERP complet (type + catégorie)", () => {
    const res = onboardingSchema.safeParse({
      ...base,
      estERP: true,
      typeErp: "N",
      categorieErp: "N5",
      personnesPresentesHabituellement: "40",
    });
    expect(res.success).toBe(true);
  });

  it("refuse typeErp si estERP=false", () => {
    const res = onboardingSchema.safeParse({
      ...base,
      estERP: false,
      typeErp: "N",
    });
    expect(res.success).toBe(false);
  });

  // « exige classeIgh si estIGH=true » a vécu ici jusqu'au 2026-09-03. La
  // question de la classe a été retirée du parcours : elle ne décidait
  // d'aucune obligation, et l'arrêté du 30 décembre 2011 explique pourquoi —
  // ses vérifications périodiques (GH 5) s'adressent aux « propriétaires »
  // sans varier par classe, et GH 66 fait du classement l'affaire de l'usage
  // PRINCIPAL de l'immeuble.
  it("n'exige plus de classe d'un IGH, et n'en accepte plus", () => {
    const res = onboardingSchema.safeParse({ ...base, estIGH: true });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(
        Object.prototype.hasOwnProperty.call(res.data, "classeIgh"),
      ).toBe(false);
    }
  });

  it("refuse aucun régime coché", () => {
    const res = onboardingSchema.safeParse({
      ...base,
      estEtablissementTravail: false,
      estERP: false,
      estIGH: false,
      estHabitation: false,
    });
    expect(res.success).toBe(false);
  });

  // FAMILLE D'HABITATION — QUATRE TESTS ONT VÉCU ICI, DU 2026-09-01 AU
  // 2026-09-03, et ils étaient bien construits : exigée quand le régime est
  // déclaré, interdite quand il ne l'est pas, acceptée quand les deux vont
  // ensemble, et une cinquième famille inventée refusée. Chacun rattrapait la
  // façon dont les autres se seraient réparés de travers.
  //
  // Ils ne gardaient pourtant rien d'utile, et il aura fallu ouvrir le texte
  // pour le voir : l'arrêté du 31 janvier 1986 ne conditionne aucune
  // obligation d'entretien à la famille — son unique obligation périodique,
  // l'article 101, vise « le propriétaire » et n'en mentionne pas. La question
  // est retirée du parcours ; ce qui reste vérifié est qu'elle ne revient pas
  // par une porte de derrière.
  it("n'exige plus de famille d'une habitation, et n'en accepte plus", () => {
    const res = onboardingSchema.safeParse({
      ...base,
      estHabitation: true,
      familleHabitation: "TROISIEME_B",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(
        Object.prototype.hasOwnProperty.call(res.data, "familleHabitation"),
      ).toBe(false);
    }
  });

  it("accepte une habitation qui ne dit rien de plus", () => {
    expect(
      onboardingSchema.safeParse({ ...base, estHabitation: true }).success,
    ).toBe(true);
  });


  // Ce test disait l'inverse jusqu'au 2026-09-01 : le cumul ERP + IGH était
  // accepté. Il est désormais le SEUL cumul de régimes refusé (ADR-025 § 1) —
  // un ERP situé dans un immeuble de grande hauteur relève du règlement de
  // sécurité des IGH, que le référentiel ne connaît pas.
  it("refuse le cumul ERP + IGH", () => {
    const res = onboardingSchema.safeParse({
      ...base,
      estERP: true,
      typeErp: "W",
      categorieErp: "N1",
      estIGH: true,
    });
    expect(res.success).toBe(false);
  });

  // La moitié qu'on oublierait volontiers, et sans laquelle le test ci-dessus
  // se réparerait en refusant l'IGH tout court. Un employeur locataire d'une
  // tour de bureaux relève du Code du travail, que le produit sert en entier ;
  // les obligations du règlement IGH pèsent sur l'exploitant de l'immeuble.
  it("accepte l'IGH seul", () => {
    const res = onboardingSchema.safeParse({
      ...base,
      estIGH: true,
    });
    expect(res.success).toBe(true);
  });

  // La borne du produit porte sur les TRAVAILLEURS. Le public reçu ne la
  // déclenche jamais : c'est ce qui permet de servir un restaurant de huit
  // salariés classé en 3ᵉ catégorie parce qu'il sert trois cents couverts.
  it("accepte 50 salariés", () => {
    const res = onboardingSchema.safeParse({ ...base, effectifSurSite: 50 });
    expect(res.success).toBe(true);
  });

  it("refuse 51 salariés", () => {
    const res = onboardingSchema.safeParse({ ...base, effectifSurSite: 51 });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.flatten().fieldErrors.effectifSurSite).toBeDefined();
    }
  });

  it("ne borne pas un ERP de 1ʳᵉ catégorie à petit effectif", () => {
    // Le cas qui a tranché le périmètre : la catégorie mesure le public, la
    // borne mesure les salariés. Les confondre reviendrait à refuser la cible.
    const res = onboardingSchema.safeParse({
      ...base,
      effectifSurSite: 8,
      estERP: true,
      typeErp: "N",
      categorieErp: "N1",
    });
    expect(res.success).toBe(true);
  });
});

describe("locaux à sommeil au parcours (2026-09-09)", () => {
  const hotel = {
    ...base,
    estERP: true,
    typeErp: "O",
    categorieErp: "N5",
    personnesPresentesHabituellement: "30",
  };

  it("accepte « oui » d'un type de la question", () => {
    const res = onboardingSchema.safeParse({
      ...hotel,
      comporteLocauxSommeilPublic: "oui",
    });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.comporteLocauxSommeilPublic).toBe(true);
  });

  it("accepte « non » d'un type de la question", () => {
    const res = onboardingSchema.safeParse({
      ...hotel,
      comporteLocauxSommeilPublic: "non",
    });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.comporteLocauxSommeilPublic).toBe(false);
  });

  it("une réponse vide n'est JAMAIS lue « non »", () => {
    // `false` et l'absence de réponse sont deux choses différentes : l'un
    // retire quatre obligations. Un `z.coerce.boolean()` posé ici par
    // inadvertance rendrait `false` sur la chaîne vide et répondrait « non » à
    // la place du dirigeant. Depuis le 2026-09-20 la réponse est DUE pour un
    // hôtel : le vide y est donc refusé — et le refus est la preuve qu'il n'a
    // pas été coercé en « non », qui serait passé.
    for (const vide of ["", undefined, null]) {
      const res = onboardingSchema.safeParse({
        ...hotel,
        comporteLocauxSommeilPublic: vide,
      });
      expect(res.success, String(vide)).toBe(false);
    }
    // Chez un type à qui rien n'est demandé, le vide traverse en `undefined`.
    for (const vide of ["", undefined, null]) {
      const res = onboardingSchema.safeParse({
        ...hotel,
        typeErp: "N",
        comporteLocauxSommeilPublic: vide,
      });
      expect(res.success, String(vide)).toBe(true);
      if (res.success)
        expect(res.data.comporteLocauxSommeilPublic, String(vide)).toBeUndefined();
    }
  });

  it("LA RÉPONSE EST DUE là où la question est posée (2026-09-20)", () => {
    // « Je ne sais pas encore » est retiré par arbitrage : un exploitant sait
    // s'il héberge du public la nuit. Sans ce contrôle, un client qui ne poste
    // pas le champ créerait un hôtel muet.
    const muet = onboardingSchema.safeParse({ ...hotel, typeErp: "O" , comporteLocauxSommeilPublic: "" });
    expect(muet.success).toBe(false);
    // Le pendant : un restaurant, à qui rien n'est demandé, passe sans répondre.
    const resto = onboardingSchema.safeParse({ ...hotel, typeErp: "N", comporteLocauxSommeilPublic: "" });
    expect(resto.success).toBe(true);
  });

  it("accepte les types où le sommeil est plausible, et eux seuls", () => {
    // Les deux moitiés sont écrites ensemble parce qu'aucune ne vaut sans
    // l'autre : la première seule passerait avec un contrôle absent, la
    // seconde seule passerait avec un contrôle qui refuse tout.
    for (const t of ["J", "O", "U", "R", "REF", "OA"]) {
      const res = onboardingSchema.safeParse({
        ...hotel,
        typeErp: t,
        comporteLocauxSommeilPublic: "oui",
      });
      expect(res.success, t).toBe(true);
    }
    for (const t of ["N", "M", "W", "Y", "EF"]) {
      const res = onboardingSchema.safeParse({
        ...hotel,
        typeErp: t,
        comporteLocauxSommeilPublic: "oui",
      });
      expect(res.success, t).toBe(false);
    }
  });

  it("refuse la réponse d'un établissement qui n'est pas ERP", () => {
    // Le champ n'est à l'écran que dans le bloc ERP : le poster hors de lui
    // ne peut venir que d'un client trafiqué.
    const res = onboardingSchema.safeParse({
      ...base,
      comporteLocauxSommeilPublic: "oui",
    });
    expect(res.success).toBe(false);
  });

  it("laisse passer un type hors question tant qu'il ne répond pas", () => {
    // La borne ne barre pas la création d'un restaurant : elle borne la
    // RÉPONSE, pas le dossier.
    const res = onboardingSchema.safeParse({
      ...hotel,
      typeErp: "N",
      comporteLocauxSommeilPublic: "",
    });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.comporteLocauxSommeilPublic).toBeUndefined();
  });
});

describe("nombre de personnes au parcours (2026-09-20)", () => {
  const restaurant = {
    ...base,
    estERP: true,
    typeErp: "N",
    categorieErp: "N5",
  };
  const erreurs = (saisie: Record<string, unknown>) => {
    const res = onboardingSchema.safeParse(saisie);
    // `undefined` et non `null` quand la saisie passe : `toBeDefined()` accepte
    // `null`, et le refus ci-dessous restait vert une fois sa règle retirée.
    return res.success
      ? undefined
      : res.error.flatten().fieldErrors.personnesPresentesHabituellement;
  };

  it("EXIGE le nombre d'un ERP que ni sa catégorie ni son effectif ne portent au seuil", () => {
    for (const vide of ["", null, undefined]) {
      expect(
        erreurs({ ...restaurant, personnesPresentesHabituellement: vide }),
        String(vide),
      ).toBeDefined();
    }
    expect(erreurs({ ...restaurant, categorieErp: "N4" })).toBeDefined();
  });

  it("le lit comme un nombre, dans les deux sens du seuil", () => {
    for (const n of ["40", "60"]) {
      const res = onboardingSchema.safeParse({
        ...restaurant,
        personnesPresentesHabituellement: n,
      });
      expect(res.success, n).toBe(true);
      if (res.success)
        expect(res.data.personnesPresentesHabituellement).toBe(Number(n));
    }
  });

  it("refuse zéro, un décimal et un texte", () => {
    for (const n of ["0", "12.5", "une trentaine"]) {
      expect(
        erreurs({ ...restaurant, personnesPresentesHabituellement: n }),
        n,
      ).toBeDefined();
    }
  });

  it("ne demande RIEN à ceux pour qui le moteur conclut seul", () => {
    expect(onboardingSchema.safeParse(base).success).toBe(true);
    expect(
      onboardingSchema.safeParse({ ...restaurant, categorieErp: "N3" }).success,
    ).toBe(true);
  });

  it("et refuse d'eux un nombre que l'écran ne leur a pas demandé", () => {
    expect(
      erreurs({ ...base, personnesPresentesHabituellement: "40" }),
    ).toBeDefined();
    expect(
      erreurs({
        ...restaurant,
        categorieErp: "N3",
        personnesPresentesHabituellement: "40",
      }),
    ).toBeDefined();
  });
});

import { describe, expect, it } from "vitest";
import { evaluerScopeSecteur } from "./scope";
import { onboardingSchema } from "./schema";

describe("evaluerScopeSecteur — les trois secteurs instruits", () => {
  it("reconnaît la restauration (56.10A)", () => {
    const r = evaluerScopeSecteur("56.10A");
    expect(r.status).toBe("ok");
    if (r.status === "ok") expect(r.secteurId).toBe("restauration");
  });

  it("reconnaît le commerce de détail (47.25Z)", () => {
    const r = evaluerScopeSecteur("47.25Z");
    expect(r.status).toBe("ok");
    if (r.status === "ok") expect(r.secteurId).toBe("commerce");
  });

  it("reconnaît le tertiaire (70.22Z)", () => {
    const r = evaluerScopeSecteur("70.22Z");
    expect(r.status).toBe("ok");
    if (r.status === "ok") expect(r.secteurId).toBe("bureau");
  });

  it("normalise en majuscules (56.10a → ok)", () => {
    expect(evaluerScopeSecteur("56.10a").status).toBe("ok");
  });

  it("reconnaît un code écrit sans point — « 5610A » est un NAF normal", () => {
    // Le format accepte le point comme facultatif ; la résolution le
    // supposait présent. Un restaurateur qui saisissait « 5610A » passait la
    // validation et s'entendait répondre qu'aucun référentiel n'existait pour
    // son activité, alors que le sien est livré. Corrigé le 2026-08-28 dans
    // `trouverReferentielParNaf`, qui normalisait déjà la casse et les
    // espaces mais pas le séparateur.
    const r = evaluerScopeSecteur("5610A");
    expect(r.status).toBe("ok");
    if (r.status === "ok") expect(r.secteurId).toBe("restauration");
    expect(evaluerScopeSecteur("4711B").status).toBe("ok");
    expect(evaluerScopeSecteur("7022z").status).toBe("ok");
  });

  it("ne confond pas les deux écritures : un code hors secteur le reste", () => {
    // La normalisation ne doit pas élargir le filet.
    expect(evaluerScopeSecteur("4322A").status).toBe("sans_referentiel");
    expect(evaluerScopeSecteur("43.22A").status).toBe("sans_referentiel");
  });
});

describe("evaluerScopeSecteur — hors des trois secteurs, elle constate", () => {
  it.each([
    ["43.22A", "BTP"],
    ["86.10Z", "santé"],
    ["20.15Z", "chimique"],
  ])("nomme la famille d'activité de %s", (naf, mot) => {
    const r = evaluerScopeSecteur(naf);
    expect(r.status).toBe("sans_referentiel");
    if (r.status === "sans_referentiel") expect(r.constat).toContain(mot);
  });

  it("reste utilisable sur une division qu'elle ne sait pas nommer (96.02A coiffure)", () => {
    const r = evaluerScopeSecteur("96.02A");
    expect(r.status).toBe("sans_referentiel");
    if (r.status === "sans_referentiel") {
      expect(r.constat).toContain("Aucun référentiel de risques types");
    }
  });

  it("dit ce qui marche quand même, et pas seulement ce qui manque", () => {
    // La phrase existe pour empêcher la lecture « votre secteur est refusé ».
    // Ce qui est absent, c'est le pré-remplissage du document unique ; le
    // référentiel de conformité, lui, ne lit jamais le code NAF.
    const r = evaluerScopeSecteur("43.22A");
    if (r.status !== "sans_referentiel") throw new Error("état inattendu");
    expect(r.consequence).toContain("Vous pouvez créer votre dossier");
    expect(r.consequence).toContain("registre de sécurité");
  });

  it("ne parle plus de refus, d'interdiction ni de fiabilité du document", () => {
    // Les anciennes phrases disaient « la plateforme ne peut pas produire un
    // DUERP fiable » — un jugement sur le droit, et faux : aucun texte ne
    // définit le document unique par secteur. `L. 4121-3` et `R. 4121-1`
    // disent « évaluez les risques », sans nommer ni secteur ni liste.
    const interdits =
      /refus|ne peut pas|impossible|non couvert par la plateforme|fiable/i;
    for (const naf of ["43.22A", "86.10Z", "96.02A", "55.10Z"]) {
      const r = evaluerScopeSecteur(naf);
      if (r.status !== "sans_referentiel") throw new Error(naf);
      expect(r.constat, naf).not.toMatch(interdits);
      expect(r.consequence, naf).not.toMatch(interdits);
    }
  });

  it("signale un format invalide (xxx) — la seule saisie encore fautive", () => {
    expect(evaluerScopeSecteur("xxx").status).toBe("format_invalide");
  });
});

describe("la porte d'onboarding ne se ferme plus sur le secteur", () => {
  // Le verrou vivait à trois endroits : la validation d'étape du wizard, le
  // `superRefine` de ce schéma, et l'écran. Le schéma est le seul des trois
  // qu'on puisse éprouver sans monter de rendu — et c'est le seul qui compte
  // vraiment, puisque la server action ne crée rien sans lui.
  const base = {
    raisonSociale: "Hôtel du Port",
    siret: "",
    adresse: "12 rue du Port, 29200 Brest",
    effectifSurSite: "4",
    estEtablissementTravail: true,
    estERP: true,
    estIGH: false,
    estHabitation: false,
    typeErp: "O",
    // Un hôtel répond à la question du sommeil : elle lui est due depuis le
    // 2026-09-21.
    comporteLocauxSommeilPublic: "oui",
    categorieErp: "N5",
  };

  it.each([
    ["55.10Z", "hôtellerie"],
    ["43.22A", "BTP"],
    ["45.20A", "garage"],
    ["96.02A", "coiffure"],
    ["86.10Z", "santé"],
  ])("accepte la création pour %s (%s)", (codeNaf) => {
    const r = onboardingSchema.safeParse({ ...base, codeNaf });
    expect(
      r.success,
      r.success ? "" : JSON.stringify(r.error.flatten().fieldErrors),
    ).toBe(true);
  });

  it("accepte encore les trois secteurs instruits", () => {
    expect(onboardingSchema.safeParse({ ...base, codeNaf: "56.10A" }).success).toBe(
      true,
    );
  });

  it("refuse toujours un code NAF illisible — erreur de saisie, pas de périmètre", () => {
    // Le seul refus qui reste. Un code illisible n'est rattachable à rien : ni
    // référentiel sectoriel, ni écran. C'est la saisie qui est fautive, et le
    // message doit le dire sans parler de secteur.
    const r = onboardingSchema.safeParse({ ...base, codeNaf: "pas-un-naf" });
    expect(r.success).toBe(false);
    if (r.success) return;
    const messages = r.error.flatten().fieldErrors.codeNaf ?? [];
    expect(messages.join(" ")).toContain("56.10A");
    expect(messages.join(" ")).not.toMatch(/secteur|couvert/i);
  });
});

import { describe, it, expect } from "vitest";
import { salarieSchema, titreSchema } from "./schema";
import { cataloguerTitres, titreParId } from "./catalogue";
import { classerTitre } from "./queries";
import { texteInformation } from "./droits";

const LE_3_MARS = "2026-03-03";

describe("salarieSchema", () => {
  it("lit une date civile à midi, pour qu'elle ne recule pas d'un jour", () => {
    // Une date civile stockée à 00:00Z se relit « la veille » dans tout
    // fuseau à l'ouest de Greenwich. L'application vit en Europe/Paris
    // (ADR-011) : une délivrance du 3 mars s'afficherait « 2 mars » sur un
    // serveur rendant en UTC−1.
    const r = salarieSchema.parse({ nom: "Dupond", prenom: "Jean", entreLe: LE_3_MARS });
    expect(r.entreLe?.toISOString()).toBe("2026-03-03T12:00:00.000Z");
  });

  it("accepte une entrée non datée", () => {
    const r = salarieSchema.parse({ nom: "Dupond", prenom: "Jean", entreLe: "" });
    expect(r.entreLe).toBeNull();
  });

  it("refuse un nom vide", () => {
    expect(salarieSchema.safeParse({ nom: "  ", prenom: "Jean" }).success).toBe(false);
  });

  it("ne collecte rien au-delà de l'identité et des dates", () => {
    // Minimisation (docs/rgpd.md § 2.3). Ce test est un cliquet : ajouter un
    // champ au schéma sans y penser le fait échouer, et oblige à motiver la
    // collecte plutôt qu'à la glisser.
    expect(Object.keys(salarieSchema.shape).sort()).toEqual([
      "entreLe",
      "nom",
      "poste",
      "prenom",
    ]);
  });
});

describe("titreSchema", () => {
  it("refuse une échéance antérieure à la délivrance", () => {
    const r = titreSchema.safeParse({
      obligationId: "x",
      delivreLe: "2026-03-03",
      echeanceLe: "2026-03-02",
    });
    expect(r.success).toBe(false);
  });

  it("accepte un titre sans échéance", () => {
    const r = titreSchema.parse({
      obligationId: "x",
      delivreLe: LE_3_MARS,
      echeanceLe: "",
    });
    expect(r.echeanceLe).toBeNull();
  });
});

describe("cataloguerTitres", () => {
  it("ne propose que des obligations portées par un salarié", () => {
    for (const o of cataloguerTitres()) expect(o.porteur).toBe("salarie");
  });

  it("porte l'attestation médicale de R. 4544-11-1", () => {
    // La seule obligation salarié livrée (ADR-023). Si elle disparaît du
    // catalogue, l'écran Équipe n'a plus rien à déclarer et le test doit le
    // dire — plutôt qu'une page silencieusement vide.
    const ids = cataloguerTitres().map((o) => o.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(
      cataloguerTitres().some((o) =>
        o.referencesLegales.some((r) => r.article?.includes("R. 4544-11-1")),
      ),
    ).toBe(true);
  });

  it("marque comme médicale toute pièce qui l'est", () => {
    // `pieceMedicale` est requis sur le type : ce test garde qu'il porte une
    // valeur utile, et non `false` posé par défaut pour faire compiler.
    const medicales = cataloguerTitres().filter((o) => o.pieceMedicale);
    expect(medicales.length).toBeGreaterThan(0);
  });

  it("ne rend rien pour un identifiant inconnu", () => {
    expect(titreParId("obligation-qui-n-existe-pas")).toBeUndefined();
  });
});

describe("classerTitre", () => {
  const now = new Date("2026-03-03T12:00:00.000Z");

  it("ne met pas en retard un titre sans terme écrit", () => {
    // Le cas de l'habilitation électrique : le Code renvoie à des modalités
    // qu'il qualifie lui-même de recommandées (ADR-023 § 6). Le peindre en
    // rouge inventerait une non-conformité.
    const delivreLe = new Date("2020-03-03T12:00:00.000Z");
    expect(classerTitre({ delivreLe, echeanceLe: null }, "autre", now)).toBe("aPlanifier");
  });

  it("met en retard une échéance passée", () => {
    const delivreLe = new Date("2021-03-01T12:00:00.000Z");
    const echeanceLe = new Date("2026-03-01T12:00:00.000Z");
    expect(classerTitre({ delivreLe, echeanceLe }, "autre", now)).toBe("enRetard");
  });

  it("laisse au loin une échéance lointaine", () => {
    const delivreLe = new Date("2022-03-03T12:00:00.000Z");
    const echeanceLe = new Date("2027-03-03T12:00:00.000Z");
    expect(classerTitre({ delivreLe, echeanceLe }, "autre", now)).toBe("lointain");
  });
});

describe("texteInformation — art. 13", () => {
  const texte = texteInformation({
    raisonSociale: "Boulangerie Martin",
    titresSuivis: ["Attestation médicale (habilitation électrique)"],
  });

  it("nomme le responsable de traitement", () => {
    // Le salarié doit savoir à qui s'adresser. « Rojer » n'est pas le
    // responsable de traitement : l'employeur l'est.
    expect(texte).toContain("Boulangerie Martin");
  });

  it("dit que la base légale n'est pas le consentement", () => {
    // Un consentement donné à son employeur n'est pas libre. Un texte
    // d'information qui invoquerait le consentement serait faux, et le
    // traitement reposerait sur une base qui ne tient pas.
    expect(texte).toContain("6.1.c");
    expect(texte).toMatch(/pas un traitement fondé sur votre consentement/i);
  });

  it("dit qu'aucune donnée de santé n'est enregistrée", () => {
    expect(texte).toMatch(/aucune donnée de santé/i);
    expect(texte).toContain("L. 4624-8");
  });

  it("n'annonce pas un droit à l'effacement que rien ne peut honorer", () => {
    // Promettre l'effacement puis le refuser serait pire que de l'annoncer
    // limité. L'article 17.3.b excepte ce qui relève d'une obligation légale.
    expect(texte).toContain("17.3.b");
    expect(texte).toMatch(/limité/i);
  });

  it("nomme la durée de conservation et son fondement", () => {
    expect(texte).toContain("D. 4711-3");
  });

  it("indique le recours à la CNIL", () => {
    expect(texte).toContain("cnil.fr");
  });

  it("liste les titres réellement suivis", () => {
    // Un texte type générique décrirait un autre traitement que celui-ci.
    expect(texte).toContain("Attestation médicale (habilitation électrique)");
  });

  it("le dit franchement quand rien n'est encore suivi", () => {
    const vide = texteInformation({ raisonSociale: "X", titresSuivis: [] });
    expect(vide).toMatch(/aucun titre suivi/i);
  });
});

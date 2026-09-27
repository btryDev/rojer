import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { salarieSchema, titreSchema } from "./schema";
import { cataloguerTitres, titreParId } from "./catalogue";
import { classerTitre } from "./queries";
import { texteInformation } from "./droits";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

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

  it("ne dit de la conservation que ce qu'un texte fonde (G1, 2026-09-27)", () => {
    // Pendant l'emploi : l'obligation légale. Pour deux pièces : « pendant
    // toute sa durée de validité ». Après le départ : aucun texte identifié,
    // et le texte le dit au lieu d'en inventer un.
    expect(texte).toMatch(/pendant toute sa durée de validité » \(art\. R\. 4323-56 et\s+R\. 4544-11-1/);
    expect(texte).toMatch(/après votre départ n'est pas fixée par un\s+texte que Rojer ait identifié/);
    // Décision de la propriétaire, 2026-09-27 : la suppression est dite
    // définitive ; et ce que fait la sortie de l'effectif est dit tel quel.
    expect(texte).toMatch(/effacé définitivement/);
    expect(texte).toMatch(/vos titres restent enregistrés jusqu'à ce que votre employeur les\s+supprime/);
  });

  it("indique le recours à la CNIL", () => {
    expect(texte).toContain("cnil.fr");
  });

  it("liste les titres réellement suivis", () => {
    // Un texte type générique décrirait un autre traitement que celui-ci.
    expect(texte).toContain("Attestation médicale (habilitation électrique)");
  });

  it("dit l'obligation de l'employeur, et sa nature, sans rien de plus (E8, tranchée le 2026-09-27)", () => {
    // L'audit (`obligation-employeur.ts`) dit, titre par titre, ce que le
    // Code met à la charge de l'employeur ; le texte en nomme chaque nature
    // (garde : `obligation-employeur.test.ts`). Il ne dit pas que chaque titre
    // est exigé de chaque salarié.
    expect(texte).toMatch(/répondent à une obligation que le Code du travail met\s+à la charge de votre employeur/);
    expect(texte).not.toMatch(/la loi l'impose|lui impose de connaître|exigés par le Code/);
    // La VIP est due à « Tout travailleur » (R. 4624-10) : l'ouverture ne
    // peut pas réduire le suivi à des postes particuliers.
    expect(texte).toMatch(/certains pour tout travailleur, comme la\s+visite d'information et de prévention/);
  });

  it("le dit franchement quand rien n'est encore suivi", () => {
    const vide = texteInformation({ raisonSociale: "X", titresSuivis: [] });
    expect(vide).toMatch(/aucun titre suivi/i);
  });
});

describe("ce que le salarié et l'employeur lisent de la conservation (G1, 2026-09-27)", () => {
  // Le texte d'information se teste rendu ; l'export (art. 15) et la fiche
  // d'un salarié passent par la base ou le rendu serveur. Leur SOURCE est
  // donc lue, commentaires retirés : aucune de ces phrases ne doit y revenir.
  const sansCommentaires = (chemin: string) =>
    readFileSync(join(RACINE, chemin), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "")
      .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "");
  const INTERDITS = [
    /n'efface donc pas/,
    /Une sortie de l'effectif ne les efface/,
    /conservés cinq ans/,
    /D\. 4711-3/,
    /excepte ce qui est conservé au(?:\s|&apos;|')/,
  ];

  it.each(["src/lib/salaries/droits.ts", "src/app/etablissements/[id]/equipe/[salarieId]/page.tsx"])(
    "%s n'affirme rien de l'après-départ qu'un texte ne fonde pas",
    (chemin) => {
      const source = sansCommentaires(chemin);
      for (const motif of INTERDITS) expect(source, String(motif)).not.toMatch(motif);
      expect(source).toMatch(/(?:n(?:'|&apos;)est\s+pas\s+fixée\s+par\s+un\s+texte\s+que\s+Rojer\s+ait\s+identifié|Aucun texte identifié par Rojer ne fixe la durée)/);
      expect(source).toMatch(/effacée?\s+définitivement/);
    },
  );
});

